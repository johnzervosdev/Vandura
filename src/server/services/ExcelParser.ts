import * as XLSX from 'xlsx';
import { calculateDuration, isValidDuration } from '@/lib/date-utils';
import { db } from '../db';
import { developers, projects, tasks } from '../db/schema';
import { eq } from 'drizzle-orm';
import type { TimeEntryInput } from './TimesheetService';

/**
 * ExcelParser
 * Parses Excel files (.xlsx, .xls) into time entry data
 * Handles validation and data normalization
 */

export interface ExcelRow {
  developer: string;
  project: string;
  task?: string;
  date: string | Date;
  startTime?: string | Date;
  endTime?: string | Date;
  durationMinutes?: number;
  notes?: string;
}

export interface ParseResult {
  entries: TimeEntryInput[];
  errors: string[];
  warnings: string[];
}

export class ExcelParser {
  /**
   * Parse Excel file from buffer
   */
  async parseFile(buffer: Buffer): Promise<ParseResult> {
    const workbook = XLSX.read(buffer, { type: 'buffer' });
    
    // Use first sheet
    const sheetName = workbook.SheetNames[0];
    const sheet = workbook.Sheets[sheetName];
    
    // Convert to JSON
    const rows = XLSX.utils.sheet_to_json<any>(sheet, {
      raw: false, // Convert dates to strings
      defval: null,
    });

    return this.parseRows(rows);
  }

  /**
   * Parse rows into time entries
   */
  async parseRows(rows: any[]): Promise<ParseResult> {
    const entries: TimeEntryInput[] = [];
    const errors: string[] = [];
    const warnings: string[] = [];

    for (let i = 0; i < rows.length; i++) {
      const rowNum = i + 2; // Excel rows are 1-indexed, +1 for header
      try {
        const entry = await this.parseRow(rows[i], rowNum);
        if (entry) {
          entries.push(entry);
        }
      } catch (error) {
        errors.push(`Row ${rowNum}: ${error instanceof Error ? error.message : 'Unknown error'}`);
      }
    }

    return { entries, errors, warnings };
  }

  /**
   * Parse a single row
   */
  private async parseRow(row: any, rowNum: number): Promise<TimeEntryInput | null> {
    // Normalize column names (case-insensitive, flexible naming)
    const normalized = this.normalizeColumnNames(row);

    // Validate required fields
    if (!normalized.developer) {
      throw new Error('Missing developer name');
    }

    if (!normalized.project) {
      throw new Error('Missing project name');
    }

    if (!normalized.date) {
      throw new Error('Missing date');
    }

    // Parse date
    const date = this.parseDate(normalized.date);
    if (!date) {
      throw new Error(`Invalid date: ${normalized.date}`);
    }

    // Get or create developer
    const developerId = await this.getOrCreateDeveloper(normalized.developer);

    // Get or create project
    const projectId = await this.getOrCreateProject(normalized.project);

    // Get or create task (optional)
    let taskId: number | undefined;
    if (normalized.task) {
      taskId = await this.getOrCreateTask(projectId, normalized.task);
    }

    // Calculate duration
    let durationMinutes: number;

    if (normalized.durationMinutes !== undefined && normalized.durationMinutes !== null && normalized.durationMinutes !== '') {
      durationMinutes = parseInt(normalized.durationMinutes.toString(), 10);
    } else if (normalized.startTime && normalized.endTime) {
      const startTime = this.parseTime(date, normalized.startTime);
      const endTime = this.parseTime(date, normalized.endTime);
      
      if (!startTime || !endTime) {
        throw new Error('Invalid start or end time');
      }

      durationMinutes = calculateDuration(startTime, endTime);
    } else {
      throw new Error('Must provide either duration or start/end times');
    }

    // Validate duration
    if (durationMinutes <= 0) {
      throw new Error('Duration must be greater than 0');
    }

    if (durationMinutes % 15 !== 0) {
      throw new Error('Duration must be a multiple of 15 minutes');
    }

    // Parse start time (default to beginning of day if not provided)
    let startTime: Date;
    if (normalized.startTime) {
      startTime = this.parseTime(date, normalized.startTime) || date;
    } else {
      startTime = date;
    }

    return {
      developerId,
      projectId,
      taskId,
      startTime,
      durationMinutes,
      description: normalized.notes || undefined,
    };
  }

  /**
   * Normalize column names to standard format
   */
  private normalizeColumnNames(row: any): {
    developer?: string;
    project?: string;
    task?: string;
    date?: unknown;
    startTime?: string;
    endTime?: string;
    durationMinutes?: unknown;
    notes?: string;
  } {
    const result: any = {};

    for (const key of Object.keys(row)) {
      const lowerKey = key.toLowerCase().trim().replace(/\s+/g, ' ');
      const value = row[key];

      // Developer
      if (
        lowerKey === 'developer' ||
        lowerKey === 'developer name' ||
        lowerKey === 'dev' ||
        lowerKey === 'resource' ||
        lowerKey === 'employee'
      ) {
        result.developer = value;
      }

      // Project
      else if (lowerKey === 'project' || lowerKey === 'project name' || lowerKey === 'proj') {
        result.project = value;
      }

      // Task / Activity
      else if (lowerKey === 'task' || lowerKey === 'task name' || lowerKey.includes('activity')) {
        result.task = value;
      }

      // Date
      else if (lowerKey === 'date' || lowerKey.includes('work date')) {
        result.date = value;
      }

      // Times
      else if (lowerKey === 'start' || lowerKey === 'start time' || lowerKey === 'begin') {
        result.startTime = value;
      } else if (lowerKey === 'end' || lowerKey === 'end time' || lowerKey === 'finish') {
        result.endTime = value;
      }

      // Duration
      else if (
        lowerKey.includes('duration') ||
        lowerKey.includes('minutes') ||
        lowerKey === 'mins' ||
        lowerKey === 'min'
      ) {
        result.durationMinutes = value;
      }

      // Notes / Description
      else if (
        lowerKey.includes('note') ||
        lowerKey.includes('desc') ||
        lowerKey.includes('comment') ||
        lowerKey === 'notes'
      ) {
        result.notes = value;
      }
    }

    return result;
  }

  /**
   * Parse date string
   */
  private parseDate(dateVal: unknown): Date | null {
    // Excel serial date number (days since 1899-12-30)
    if (typeof dateVal === 'number' && Number.isFinite(dateVal)) {
      const ms = (dateVal - 25569) * 86400000;
      const d = new Date(ms);
      return isNaN(d.getTime()) ? null : d;
    }

    if (dateVal instanceof Date) {
      return dateVal;
    }

    if (typeof dateVal !== 'string') {
      return null;
    }

    const s = dateVal.trim();
    if (!s) return null;

    // Try native parsing first (handles ISO 8601 and many common variants)
    const native = new Date(s);
    if (!isNaN(native.getTime())) {
      return native;
    }

    // Explicit slash formats: M/D/YYYY or D/M/YYYY (disambiguate when possible)
    const slash = s.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})$/);
    if (slash) {
      const a = parseInt(slash[1], 10);
      const b = parseInt(slash[2], 10);
      const y = parseInt(slash[3], 10);

      let month: number;
      let day: number;

      // If the first part can't be a month, treat as D/M/YYYY
      if (a > 12 && b >= 1 && b <= 12) {
        day = a;
        month = b;
      }
      // If the second part can't be a day, treat as M/D/YYYY
      else if (b > 12 && a >= 1 && a <= 12) {
        month = a;
        day = b;
      }
      // Ambiguous: default to US-style M/D/YYYY
      else {
        month = a;
        day = b;
      }

      const d = new Date(y, month - 1, day);
      return isNaN(d.getTime()) ? null : d;
    }

    // Explicit YYYY-MM-DD
    const ymd = s.match(/^(\d{4})-(\d{1,2})-(\d{1,2})$/);
    if (ymd) {
      const y = parseInt(ymd[1], 10);
      const m = parseInt(ymd[2], 10);
      const d = parseInt(ymd[3], 10);
      const date = new Date(y, m - 1, d);
      return isNaN(date.getTime()) ? null : date;
    }

    return null;
  }

  /**
   * Parse time string and combine with date
   */
  private parseTime(date: Date, timeStr: string | Date): Date | null {
    if (timeStr instanceof Date) {
      return timeStr;
    }

    try {
      // Extract hours and minutes from various formats
      const patterns = [
        /^(\d{1,2}):(\d{2})(?::(\d{2}))?(?:\s*(AM|PM))?$/i, // 9:30, 9:30 AM
        /^(\d{1,2})(\d{2})$/, // 0930
      ];

      for (const pattern of patterns) {
        const match = timeStr.trim().match(pattern);
        if (match) {
          let hours = parseInt(match[1], 10);
          const minutes = parseInt(match[2], 10);
          const ampm = match[4];

          // Handle AM/PM
          if (ampm) {
            if (ampm.toUpperCase() === 'PM' && hours < 12) {
              hours += 12;
            } else if (ampm.toUpperCase() === 'AM' && hours === 12) {
              hours = 0;
            }
          }

          const result = new Date(date);
          result.setHours(hours, minutes, 0, 0);
          return result;
        }
      }

      return null;
    } catch {
      return null;
    }
  }

  /**
   * Get or create developer by name
   */
  private async getOrCreateDeveloper(name: string): Promise<number> {
    const existing = await db.query.developers.findFirst({
      where: eq(developers.name, name),
    });

    if (existing) {
      return existing.id;
    }

    const result = await db
      .insert(developers)
      .values({ name, isActive: true })
      .returning();

    return result[0].id;
  }

  /**
   * Get or create project by name
   */
  private async getOrCreateProject(name: string): Promise<number> {
    const existing = await db.query.projects.findFirst({
      where: eq(projects.name, name),
    });

    if (existing) {
      return existing.id;
    }

    const result = await db
      .insert(projects)
      .values({ name, status: 'active' })
      .returning();

    return result[0].id;
  }

  /**
   * Get or create task by name within project
   */
  private async getOrCreateTask(projectId: number, name: string): Promise<number> {
    const existing = await db.query.tasks.findFirst({
      where: (tasks, { eq, and }) => 
        and(eq(tasks.projectId, projectId), eq(tasks.name, name)),
    });

    if (existing) {
      return existing.id;
    }

    const result = await db
      .insert(tasks)
      .values({ projectId, name, status: 'pending' })
      .returning();

    return result[0].id;
  }
}

// Export singleton instance
export const excelParser = new ExcelParser();
