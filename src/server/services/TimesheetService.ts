import { db } from '../db';
import {
  timeEntries,
  projects,
  tasks,
  developers,
  type NewTimeEntry,
  type TimeEntry,
} from '../db/schema';
import { eq, and, gte, lte, desc } from 'drizzle-orm';
import { isValidDuration } from '@/lib/date-utils';

/**
 * TimesheetService
 * Handles CRUD operations for time entries
 * Implements batch insert optimization for Excel imports
 */

export interface TimeEntryInput {
  projectId: number;
  taskId?: number;
  developerId: number;
  startTime: Date;
  durationMinutes: number;
  description?: string;
}

export interface TimeEntryFilter {
  projectId?: number;
  developerId?: number;
  taskId?: number;
  startDate?: Date;
  endDate?: Date;
}

export interface TimeEntryListItem {
  id: number;
  projectId: number;
  projectName: string;
  taskId: number | null;
  taskName: string | null;
  developerId: number;
  developerName: string;
  startTime: Date;
  durationMinutes: number;
  description: string | null;
}

export class TimesheetService {
  /**
   * Create a single time entry
   */
  async createEntry(input: TimeEntryInput): Promise<TimeEntry> {
    // Validate duration
    if (!isValidDuration(input.durationMinutes)) {
      throw new Error('Duration must be a multiple of 15 minutes');
    }

    const entry: NewTimeEntry = {
      projectId: input.projectId,
      taskId: input.taskId || null,
      developerId: input.developerId,
      startTime: input.startTime,
      durationMinutes: input.durationMinutes,
      description: input.description || null,
    };

    const result = await db.insert(timeEntries).values(entry).returning();
    return result[0];
  }

  /**
   * Bulk create time entries (for Excel imports)
   * Uses transaction for atomicity
   */
  async bulkCreateEntries(inputs: TimeEntryInput[]): Promise<TimeEntry[]> {
    // Validate all durations
    for (const input of inputs) {
      if (!isValidDuration(input.durationMinutes)) {
        throw new Error(`Invalid duration ${input.durationMinutes} minutes (must be multiple of 15)`);
      }
    }

    const entries: NewTimeEntry[] = inputs.map((input) => ({
      projectId: input.projectId,
      taskId: input.taskId || null,
      developerId: input.developerId,
      startTime: input.startTime,
      durationMinutes: input.durationMinutes,
      description: input.description || null,
    }));

    if (entries.length === 0) return [];

    // Batch insert inside a single transaction (atomic import)
    // 1000 rows/batch keeps SQLite parameter counts reasonable.
    return db.transaction((tx) => {
      const batchSize = 1000;
      const results: TimeEntry[] = [];

      for (let i = 0; i < entries.length; i += batchSize) {
        const batch = entries.slice(i, i + batchSize);
        // In better-sqlite3 transactions, the callback must be synchronous.
        // Drizzle queries are "thenable", so use .all() to execute synchronously.
        const batchResults = tx.insert(timeEntries).values(batch).returning().all();
        results.push(...batchResults);
      }

      return results;
    });
  }

  /**
   * Get time entries with optional filters
   */
  async getEntries(
    filter: TimeEntryFilter = {},
    limit = 100,
    offset = 0
  ): Promise<TimeEntryListItem[]> {
    const conditions = [];

    if (filter.projectId) {
      conditions.push(eq(timeEntries.projectId, filter.projectId));
    }

    if (filter.developerId) {
      conditions.push(eq(timeEntries.developerId, filter.developerId));
    }

    if (filter.taskId) {
      conditions.push(eq(timeEntries.taskId, filter.taskId));
    }

    if (filter.startDate) {
      conditions.push(gte(timeEntries.startTime, filter.startDate));
    }

    if (filter.endDate) {
      conditions.push(lte(timeEntries.startTime, filter.endDate));
    }

    const whereClause = conditions.length > 0 ? and(...conditions) : undefined;

    const rows = await db
      .select({
        id: timeEntries.id,
        projectId: timeEntries.projectId,
        projectName: projects.name,
        taskId: timeEntries.taskId,
        taskName: tasks.name,
        developerId: timeEntries.developerId,
        developerName: developers.name,
        startTime: timeEntries.startTime,
        durationMinutes: timeEntries.durationMinutes,
        description: timeEntries.description,
      })
      .from(timeEntries)
      .leftJoin(projects, eq(timeEntries.projectId, projects.id))
      .leftJoin(tasks, eq(timeEntries.taskId, tasks.id))
      .leftJoin(developers, eq(timeEntries.developerId, developers.id))
      .where(whereClause)
      .orderBy(desc(timeEntries.startTime))
      .limit(limit)
      .offset(offset);

    // These joins should always resolve project/developer; keep it defensive to avoid runtime crashes.
    return rows.map((r) => ({
      id: r.id,
      projectId: r.projectId,
      projectName: r.projectName ?? `Project #${r.projectId}`,
      taskId: r.taskId ?? null,
      taskName: r.taskName ?? null,
      developerId: r.developerId,
      developerName: r.developerName ?? `Developer #${r.developerId}`,
      startTime: r.startTime,
      durationMinutes: r.durationMinutes,
      description: r.description ?? null,
    }));
  }

  /**
   * Get a single time entry by ID
   */
  async getEntryById(id: number): Promise<TimeEntry | undefined> {
    return db.query.timeEntries.findFirst({
      where: eq(timeEntries.id, id),
    });
  }

  /**
   * Update a time entry
   */
  async updateEntry(
    id: number,
    updates: Partial<TimeEntryInput>
  ): Promise<TimeEntry | undefined> {
    if (updates.durationMinutes && !isValidDuration(updates.durationMinutes)) {
      throw new Error('Duration must be a multiple of 15 minutes');
    }

    const result = await db
      .update(timeEntries)
      .set({
        ...updates,
        updatedAt: new Date(),
      })
      .where(eq(timeEntries.id, id))
      .returning();

    return result[0];
  }

  /**
   * Delete a time entry
   */
  async deleteEntry(id: number): Promise<boolean> {
    const result = await db.delete(timeEntries).where(eq(timeEntries.id, id)).returning();
    return result.length > 0;
  }

  /**
   * Get total time entries count (for pagination)
   */
  async getEntriesCount(filter: TimeEntryFilter = {}): Promise<number> {
    const conditions = [];

    if (filter.projectId) {
      conditions.push(eq(timeEntries.projectId, filter.projectId));
    }

    if (filter.developerId) {
      conditions.push(eq(timeEntries.developerId, filter.developerId));
    }

    if (filter.taskId) {
      conditions.push(eq(timeEntries.taskId, filter.taskId));
    }

    if (filter.startDate) {
      conditions.push(gte(timeEntries.startTime, filter.startDate));
    }

    if (filter.endDate) {
      conditions.push(lte(timeEntries.startTime, filter.endDate));
    }

    const whereClause = conditions.length > 0 ? and(...conditions) : undefined;

    const result = await db
      .select()
      .from(timeEntries)
      .where(whereClause);

    return result.length;
  }
}

// Export singleton instance
export const timesheetService = new TimesheetService();
