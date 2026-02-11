import * as XLSX from 'xlsx';
import { calculateDuration } from '@/lib/date-utils';
import { db } from '../db';
import { developers, projects, tasks } from '../db/schema';
import { eq, inArray } from 'drizzle-orm';
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
  sheetName?: string;
  /**
   * Detected developer for this file (single-developer assumption).
   * If we cannot confidently detect a developer, this will be null.
   */
  detectedDeveloper: string | null;
  /**
   * Back-compat / debugging: list of developer candidates observed.
   * For the MVP assumption (one developer per file), this is either [] or [detectedDeveloper].
   */
  developers: string[];
  projects: {
    all: string[];
    invalid: string[];
  };
  preview: Array<{
    developer: string;
    project: string;
    task?: string;
    startTime: Date;
    durationMinutes: number;
    notes?: string;
  }>;
  errors: string[];
  warnings: string[];
}

export class ExcelParser {
  private shouldIgnoreProjectToken(value: string): boolean {
    const v = value.trim();
    if (!v) return true;
    const lower = v.toLowerCase();

    // Common non-project row labels / headers
    if (lower === 'project code') return true;
    if (lower.startsWith('daily totals')) return true;
    if (lower.includes('week ending')) return true;
    if (lower.includes('total') || lower.includes('subtotal')) return true;

    // Date-like strings that sometimes appear in the Project Code column in weekly-grid sheets
    if (/^\d{4}-\d{2}-\d{2}$/.test(v)) return true; // YYYY-MM-DD
    if (/^\d{1,2}\/\d{1,2}\/\d{2,4}$/.test(v)) return true; // M/D/YYYY or MM/DD/YY
    if (/^\d{1,2}-\d{1,2}-\d{2,4}$/.test(v)) return true; // M-D-YYYY

    // Label-ish values (often end with colon)
    if (lower.endsWith(':') && (lower.includes('total') || lower.includes('subtotal') || lower.includes('daily'))) {
      return true;
    }

    return false;
  }

  private extractProjectCodesFromMatrix(
    matrix: any[][],
    normalizeCell: (v: unknown) => string
  ): string[] {
    // Anchor on a "Project Code" header and collect the values beneath it.
    // This is used for preview-only reporting and should work even if entry parsing yields 0 entries.
    let headerRow = -1;
    let projectCol = -1;

    const scanRows = Math.min(40, matrix.length);
    for (let r = 0; r < scanRows; r++) {
      const row = matrix[r];
      if (!Array.isArray(row)) continue;
      for (let c = 0; c < row.length; c++) {
        if (normalizeCell(row[c]) === 'project code') {
          headerRow = r;
          projectCol = c;
          break;
        }
      }
      if (headerRow >= 0) break;
    }

    if (headerRow < 0 || projectCol < 0) return [];

    const codes = new Set<string>();
    for (let r = headerRow + 1; r < matrix.length; r++) {
      const row = matrix[r];
      if (!Array.isArray(row)) continue;
      const raw = row[projectCol];
      const code =
        typeof raw === 'string'
          ? raw.trim()
          : raw !== null && raw !== undefined
            ? String(raw).trim()
            : '';
      if (!code) continue;
      const lower = code.toLowerCase();
      if (this.shouldIgnoreProjectToken(code)) continue;
      codes.add(code);
    }

    return Array.from(codes).sort((a, b) => a.localeCompare(b));
  }

  /**
   * Parse Excel file from buffer
   */
  async parseFile(
    buffer: Buffer,
    opts?: {
      mode?: 'preview' | 'import';
    }
  ): Promise<ParseResult> {
    const workbook = XLSX.read(buffer, { type: 'buffer' });
    const mode = opts?.mode ?? 'import';

    const headerTokens = [
      // Developer
      'developer',
      'developer name',
      'dev',
      'resource',
      'employee',
      // Project
      'project',
      'project name',
      'proj',
      // Task
      'task',
      'task name',
      'activity',
      // Date/time
      'date',
      'work date',
      'start',
      'start time',
      'begin',
      'end',
      'end time',
      'finish',
      // Duration
      'duration',
      'minutes',
      'minute',
      'mins',
      'min',
      'hours',
      'hrs',
      // Notes
      'notes',
      'note',
      'desc',
      'description',
      'comment',
    ];

    const normalizeCell = (v: unknown) =>
      typeof v === 'string'
        ? v.toLowerCase().trim().replace(/\s+/g, ' ').replace(/[:\s]+$/g, '')
        : '';

    const weekdayTokens = [
      'mon',
      'monday',
      'tue',
      'tues',
      'tuesday',
      'wed',
      'wednesday',
      'thu',
      'thur',
      'thurs',
      'thursday',
      'fri',
      'friday',
      'sat',
      'saturday',
      'sun',
      'sunday',
    ];

    // Select the best sheet rather than always taking the first one.
    // Real-world workbooks often start with hidden/metadata sheets like "Variable".
    const analyzeSheet = (name: string) => {
      const sheet = workbook.Sheets[name];
      const matrix = XLSX.utils.sheet_to_json<any>(sheet, { header: 1, raw: false, defval: null });

      let bestHeaderRow = -1;
      let bestMatchCount = 0;

      if (Array.isArray(matrix)) {
        const maxScan = Math.min(15, matrix.length);
        for (let r = 0; r < maxScan; r++) {
          const row = matrix[r];
          if (!Array.isArray(row)) continue;
          const cells = row.map(normalizeCell).filter(Boolean);
          const matchCount = cells.filter((cell) => headerTokens.some((t) => cell.includes(t))).length;
          if (matchCount > bestMatchCount) {
            bestMatchCount = matchCount;
            bestHeaderRow = r;
          }
        }
      }

      // Detect a sheet-level developer (e.g. "Name:" / "Developer:" label + adjacent value)
      let defaultDeveloper: string | undefined;
      if (Array.isArray(matrix)) {
        const maxScan = Math.min(30, matrix.length);
        for (let r = 0; r < maxScan && !defaultDeveloper; r++) {
          const row = matrix[r];
          if (!Array.isArray(row)) continue;
          for (let c = 0; c < row.length; c++) {
            const label = normalizeCell(row[c]);
            const isDevLabel =
              label === 'developer' ||
              label === 'developer name' ||
              label === 'name' ||
              label === 'resource' ||
              label === 'employee';
            if (!isDevLabel) continue;
            const right = row[c + 1];
            if (typeof right === 'string' && right.trim()) {
              defaultDeveloper = right.trim();
              break;
            }
          }
        }
      }

      const looksLikeWeeklyGrid =
        Array.isArray(matrix) &&
        matrix
          .slice(0, 20)
          .some((row) => Array.isArray(row) && row.map(normalizeCell).some((c) => weekdayTokens.includes(c)));

      const hasWeekEndingLabel =
        Array.isArray(matrix) &&
        matrix
          .slice(0, 20)
          .some((row) => Array.isArray(row) && row.map(normalizeCell).some((c) => c.includes('week ending')));

      const hasProjectCodeHeader =
        Array.isArray(matrix) &&
        matrix
          .slice(0, 30)
          .some((row) => Array.isArray(row) && row.map(normalizeCell).some((c) => c === 'project code'));

      const hourLikeCount = (() => {
        if (!Array.isArray(matrix)) return 0;
        let count = 0;
        const maxRows = Math.min(120, matrix.length);
        for (let r = 0; r < maxRows; r++) {
          const row = matrix[r];
          if (!Array.isArray(row)) continue;
          const maxCols = Math.min(30, row.length);
          for (let c = 0; c < maxCols; c++) {
            const v = row[c];
            const n = typeof v === 'number' ? v : typeof v === 'string' ? Number(v) : NaN;
            if (!Number.isFinite(n)) continue;
            // Most timesheets have fractional hours (0.25, 1.5, 2, etc.). Cap to avoid picking lookup tables.
            if (n > 0 && n <= 24) count++;
          }
        }
        return count;
      })();

      // Heuristic scoring: prefer sheets with header matches (row-based) or weekday columns (weekly grid).
      // Lightly penalize known "metadata" sheet names.
      const normalizedName = name.toLowerCase();
      const isMetadataName =
        normalizedName.includes('variable') ||
        normalizedName.includes('lookup') ||
        normalizedName.includes('list') ||
        normalizedName.includes('config') ||
        normalizedName.includes('settings') ||
        normalizedName.includes('meta');
      // Mild penalty only; some real-world timesheets legitimately put the working grid on a sheet named "Variable".
      const namePenalty = isMetadataName ? 2 : 0;

      const score =
        bestMatchCount +
        (looksLikeWeeklyGrid ? 3 : 0) +
        (hasWeekEndingLabel ? 2 : 0) +
        (hasProjectCodeHeader ? 2 : 0) +
        (hourLikeCount >= 3 ? 2 : 0) +
        (defaultDeveloper ? 1 : 0) -
        namePenalty;

      return {
        name,
        sheet,
        matrix,
        bestHeaderRow,
        bestMatchCount,
        defaultDeveloper,
        looksLikeWeeklyGrid,
        score,
      };
    };

    const sheetNames = (workbook.SheetNames ?? []).filter(Boolean);
    const analyses = sheetNames.map(analyzeSheet);
    const selected =
      analyses.reduce<(typeof analyses)[number] | null>((best, cur) => {
        if (!best) return cur;
        if (cur.score > best.score) return cur;
        // tie-breaker: prefer the one with more header matches
        if (cur.score === best.score && cur.bestMatchCount > best.bestMatchCount) return cur;
        return best;
      }, null) ?? analyzeSheet(sheetNames[0]);

    const sheetName = selected.name;
    const sheet = selected.sheet;
    const matrix = selected.matrix;
    const bestHeaderRow = selected.bestHeaderRow;
    const bestMatchCount = selected.bestMatchCount;
    const defaultDeveloper: string | undefined = selected.defaultDeveloper;
    const projectCodesFromMatrix = Array.isArray(matrix)
      ? this.extractProjectCodesFromMatrix(matrix, normalizeCell)
      : [];

    const finalize = async (parsed: ParseResult): Promise<ParseResult> => {
      // If we failed to detect projects from parsed rows (common for weekly grids),
      // fall back to extracting "Project Code" values directly from the sheet matrix.
      let mergedAllProjects = parsed.projects?.all ?? [];
      if (mergedAllProjects.length === 0 && projectCodesFromMatrix.length > 0) {
        mergedAllProjects = projectCodesFromMatrix;
      } else if (projectCodesFromMatrix.length > 0) {
        mergedAllProjects = Array.from(new Set([...mergedAllProjects, ...projectCodesFromMatrix])).sort((a, b) =>
          a.localeCompare(b)
        );
      }

      // In preview mode, validate the merged project list against DB (even if entry parsing yielded 0).
      let invalid = parsed.projects?.invalid ?? [];
      if (mode === 'preview' && mergedAllProjects.length > 0) {
        const existing = await db.query.projects.findMany({
          where: inArray(projects.name, mergedAllProjects),
          columns: { name: true },
        });
        const existingSet = new Set(existing.map((p) => p.name));
        invalid = mergedAllProjects.filter((p) => !existingSet.has(p));
      }

      const filteredErrors = parsed.errors.filter((e) => !e.startsWith('Invalid projects ('));
      const errors =
        mode === 'preview' && invalid.length > 0
          ? [`Invalid projects (${invalid.length}/${mergedAllProjects.length}): ${invalid.join(', ')}`, ...filteredErrors]
          : filteredErrors;

      return {
        ...parsed,
        sheetName,
        projects: { all: mergedAllProjects, invalid },
        errors,
      };
    };

    // Convert to JSON using detected header row when confidence is reasonable.
    // If we can't detect a header row, we still try default sheet_to_json but will validate headers before parsing.
    const usedHeaderRow = bestMatchCount >= 2 ? bestHeaderRow : -1;
    const firstDataRowNumber = usedHeaderRow >= 0 ? usedHeaderRow + 2 : 2; // Excel rows are 1-indexed

    const rows = XLSX.utils.sheet_to_json<any>(sheet, {
      raw: false,
      defval: null,
      ...(usedHeaderRow >= 0 ? { range: usedHeaderRow } : {}),
    });

    // Header sanity-check: if keys look like __EMPTY only, this is not the expected row-based format.
    const keysFromFirstRows = new Set<string>();
    for (const r of (rows ?? []).slice(0, 5)) {
      if (r && typeof r === 'object') {
        for (const k of Object.keys(r)) keysFromFirstRows.add(k);
      }
    }
    const hasRecognizableHeaders = Array.from(keysFromFirstRows).some((k) => {
      const kk = normalizeCell(k);
      return headerTokens.some((t) => kk.includes(t));
    });

    // Weekly grids often include "Project/Task" headers (so they can look "recognizable"),
    // but they lack a Date/Duration column and instead use weekday columns (Mon..Fri).
    // Detect and convert these before attempting row-based parsing.
    const normalizedKeyList = Array.from(keysFromFirstRows).map(normalizeCell);
    const hasWeekdayColumns = normalizedKeyList.some((k) => weekdayTokens.includes(k.split(' ')[0] ?? k));
    const hasDateColumn = normalizedKeyList.some((k) => k === 'date' || k.includes('work date'));
    const hasDurationColumn = normalizedKeyList.some(
      (k) =>
        k.includes('duration') ||
        k.includes('minutes') ||
        k === 'mins' ||
        k === 'min' ||
        k.includes('hours') ||
        k === 'hrs'
    );
    const hasStartColumn = normalizedKeyList.some((k) => k === 'start' || k === 'start time' || k === 'begin');
    const hasEndColumn = normalizedKeyList.some((k) => k === 'end' || k === 'end time' || k === 'finish');

    const looksLikeWeeklyGridByKeys =
      hasWeekdayColumns && !hasDateColumn && !hasDurationColumn && !(hasStartColumn && hasEndColumn);

      // Some real-world weekly grids have weekday headers that become `__EMPTY*` keys after `sheet_to_json`,
      // or have non-standard day headers. Fall back to matrix-based detection when (a) the sheet has a
      // Project Code header or weekday tokens and (b) it does not appear to have row-based date/duration columns.
      const matrixHasProjectCodeHeader =
        Array.isArray(matrix) &&
        matrix
          .slice(0, 30)
          .some((row) => Array.isArray(row) && row.map(normalizeCell).some((c) => c === 'project code'));

      const looksLikeWeeklyGridByMatrix =
        (selected.looksLikeWeeklyGrid || matrixHasProjectCodeHeader) &&
        !hasDateColumn &&
        !hasDurationColumn &&
        !(hasStartColumn && hasEndColumn);

      if ((looksLikeWeeklyGridByKeys || looksLikeWeeklyGridByMatrix) && Array.isArray(matrix)) {
      const converted = this.convertWeeklyGridToRowObjects(matrix, {
        defaultDeveloper,
        normalizeCell,
      });

      if (converted.errors.length > 0) {
          return {
            entries: [],
            sheetName,
            detectedDeveloper: converted.defaultDeveloper ?? defaultDeveloper ?? null,
            developers: (converted.defaultDeveloper ?? defaultDeveloper) ? [String(converted.defaultDeveloper ?? defaultDeveloper)] : [],
            projects: { all: projectCodesFromMatrix, invalid: projectCodesFromMatrix },
            preview: [],
            errors: converted.errors,
            warnings: converted.warnings,
          };
      }

      return finalize(
        await this.parseRows(converted.rows, {
          defaultDeveloper: converted.defaultDeveloper ?? defaultDeveloper,
          firstDataRowNumber: converted.firstDataRowNumber,
          mode,
        })
      );
    }

    if (!hasRecognizableHeaders) {
      const looksLikeWeeklyGrid =
        Array.isArray(matrix) &&
        matrix
          .slice(0, 20)
          .some((row) => Array.isArray(row) && row.map(normalizeCell).some((c) => weekdayTokens.includes(c)));

      if (looksLikeWeeklyGrid && Array.isArray(matrix)) {
        const converted = this.convertWeeklyGridToRowObjects(matrix, {
          defaultDeveloper,
          normalizeCell,
        });

        if (converted.errors.length > 0) {
          return {
            entries: [],
            sheetName,
            detectedDeveloper: converted.defaultDeveloper ?? defaultDeveloper ?? null,
            developers: (converted.defaultDeveloper ?? defaultDeveloper) ? [String(converted.defaultDeveloper ?? defaultDeveloper)] : [],
            projects: { all: projectCodesFromMatrix, invalid: projectCodesFromMatrix },
            preview: [],
            errors: converted.errors,
            warnings: converted.warnings,
          };
        }

        return finalize(
          await this.parseRows(converted.rows, {
            defaultDeveloper: converted.defaultDeveloper ?? defaultDeveloper,
            firstDataRowNumber: converted.firstDataRowNumber,
            mode,
          })
        );
      }

      return {
        entries: [],
        sheetName,
        detectedDeveloper: defaultDeveloper ?? null,
        developers: defaultDeveloper ? [defaultDeveloper] : [],
        projects: { all: projectCodesFromMatrix, invalid: projectCodesFromMatrix },
        preview: [],
        errors: [
          'Could not detect a header row with the expected columns. Expected columns like Developer, Project, Task, Date, Duration (or Start/End), Notes.',
          looksLikeWeeklyGrid
            ? 'It looks like this file is a weekly grid (Mon/Tue/Wed columns). If import fails, ensure the sheet includes a “Week Ending” date (or actual dates in/near the weekday headers).'
            : 'If your timesheet is a weekly grid (e.g. Mon/Tue/Wed columns), ensure it includes a “Week Ending” date (or actual dates in/near the weekday headers).',
        ],
        warnings: [],
      };
    }

    return finalize(await this.parseRows(rows, { defaultDeveloper, firstDataRowNumber, mode }));
  }

  private convertWeeklyGridToRowObjects(
    matrix: any[][],
    opts: {
      defaultDeveloper?: string;
      normalizeCell: (v: unknown) => string;
    }
  ): {
    rows: any[];
    errors: string[];
    warnings: string[];
    defaultDeveloper?: string;
    firstDataRowNumber: number;
  } {
    const errors: string[] = [];
    const warnings: string[] = [];

    const weekdayAliases: Record<string, number> = {
      mon: 0,
      monday: 0,
      tue: 1,
      tues: 1,
      tuesday: 1,
      wed: 2,
      wednesday: 2,
      thu: 3,
      thur: 3,
      thurs: 3,
      thursday: 3,
      fri: 4,
      friday: 4,
      sat: 5,
      saturday: 5,
      sun: 6,
      sunday: 6,
    };

    const isNumberLike = (v: unknown) => {
      if (typeof v === 'number' && Number.isFinite(v)) return true;
      if (typeof v === 'string' && v.trim() && Number.isFinite(Number(v))) return true;
      return false;
    };

    const toNumber = (v: unknown) => (typeof v === 'number' ? v : Number(String(v).trim()));

    // 1) Find the header row containing weekday labels.
    let headerRow = -1;
    let dayCols: Array<{ dayIndex: number; col: number }> = [];

    const scanRows = Math.min(30, matrix.length);
    for (let r = 0; r < scanRows; r++) {
      const row = matrix[r];
      if (!Array.isArray(row)) continue;
      const nextDayCols: Array<{ dayIndex: number; col: number }> = [];

      for (let c = 0; c < row.length; c++) {
        const cell = opts.normalizeCell(row[c]);
        if (!cell) continue;
        // Allow "Mon", "Mon 4/1", "Monday"
        const firstToken = cell.split(' ')[0];
        const idx = weekdayAliases[firstToken];
        if (idx !== undefined) nextDayCols.push({ dayIndex: idx, col: c });
      }

      // Need at least Mon..Fri to treat as a grid (common timesheet)
      const unique = new Set(nextDayCols.map((d) => d.dayIndex));
      if (unique.size >= 5) {
        headerRow = r;
        dayCols = nextDayCols
          .sort((a, b) => a.col - b.col)
          // de-dupe dayIndex (keep first occurrence)
          .filter((d, idx, arr) => arr.findIndex((x) => x.dayIndex === d.dayIndex) === idx);
        break;
      }
    }

    if (headerRow < 0 || dayCols.length === 0) {
      // Fallback: JZER-style sheets sometimes label the grid by "Project Code" and may not have
      // clean weekday strings in the header row. Anchor on "Project Code" and assume columns E–K
      // represent Sat–Fri (7 days) like the characterization test.
      const scanRows2 = Math.min(40, matrix.length);
      for (let r = 0; r < scanRows2; r++) {
        const row = matrix[r];
        if (!Array.isArray(row)) continue;
        const normalized = row.map(opts.normalizeCell);
        const projectCodeCol = normalized.findIndex((c) => c === 'project code');
        if (projectCodeCol < 0) continue;
        headerRow = r;
        // Column indices: C=2 project code, D=3 task label, E–K=4..10 day columns
        dayCols = [
          { dayIndex: 5, col: 4 }, // Sat
          { dayIndex: 6, col: 5 }, // Sun
          { dayIndex: 0, col: 6 }, // Mon
          { dayIndex: 1, col: 7 }, // Tue
          { dayIndex: 2, col: 8 }, // Wed
          { dayIndex: 3, col: 9 }, // Thu
          { dayIndex: 4, col: 10 }, // Fri
        ];
        break;
      }

      if (headerRow < 0 || dayCols.length === 0) {
        return {
          rows: [],
          errors: ['Weekly grid detected, but could not find a header row with weekday columns (Mon..Fri) or a Project Code header.'],
          warnings,
          defaultDeveloper: opts.defaultDeveloper,
          firstDataRowNumber: 2,
        };
      }
    }

    // 2) Attempt to extract a "week ending" / "week of" date (preferred).
    let weekEnding: Date | null = null;
    for (let r = 0; r < Math.min(20, matrix.length) && !weekEnding; r++) {
      const row = matrix[r];
      if (!Array.isArray(row)) continue;
      for (let c = 0; c < row.length && !weekEnding; c++) {
        const cellRaw = row[c];
        const cell = opts.normalizeCell(cellRaw);
        if (!cell) continue;
        if (cell.includes('week ending') || cell.includes('week ending date') || cell.includes('week of')) {
          const right = row[c + 1];
          const parsed = this.parseDate(right);
          if (parsed) weekEnding = parsed;
        }
        // Common pattern: "Week Ending: 2024-04-05" in one cell
        const m = typeof cellRaw === 'string' ? cellRaw.match(/(\d{4}-\d{1,2}-\d{1,2})|(\d{1,2}\/\d{1,2}\/\d{4})/) : null;
        if (m?.[0]) {
          const parsed = this.parseDate(m[0]);
          if (parsed && (cell.includes('week') || cell.includes('ending'))) weekEnding = parsed;
        }
      }
    }

    // 3) Build actual dates for each weekday column.
    // Prefer explicit dates in header cells / adjacent row; fallback to weekEnding inference.
    const dayDates: Record<number, Date> = {};

    // Explicit date from header text (e.g. "Mon 4/1/2024") or from row below header
    for (const { dayIndex, col } of dayCols) {
      const headerCell = matrix[headerRow]?.[col];
      const headerStr = typeof headerCell === 'string' ? headerCell : '';
      const m =
        headerStr.match(/(\d{4}-\d{1,2}-\d{1,2})|(\d{1,2}\/\d{1,2}\/\d{4})/) ??
        null;
      const direct = m?.[0] ? this.parseDate(m[0]) : null;
      const below = this.parseDate(matrix[headerRow + 1]?.[col]);
      const parsed = direct || below;
      if (parsed) dayDates[dayIndex] = parsed;
    }

    const hasAnyExplicitDates = Object.keys(dayDates).length > 0;

    if (!hasAnyExplicitDates) {
      if (!weekEnding) {
        return {
          rows: [],
          errors: [
            'Weekly grid detected, but could not determine the calendar dates for each weekday column.',
            'Please include a “Week Ending” date on the sheet (or put actual dates in/near the weekday headers).',
          ],
          warnings,
          defaultDeveloper: opts.defaultDeveloper,
          firstDataRowNumber: headerRow + 2,
        };
      }

      // Use column-position deltas relative to the rightmost day column (assumed to be the "week ending" day).
      // This works for both Mon–Fri and Sat–Fri grids without relying on weekday index wraparound.
      const ordered = [...dayCols].sort((a, b) => a.col - b.col);
      const endingCol = ordered[ordered.length - 1]!.col;
      for (const { dayIndex, col } of ordered) {
        const deltaDays = col - endingCol;
        const d = new Date(weekEnding);
        d.setDate(d.getDate() + deltaDays);
        dayDates[dayIndex] = d;
      }
    }

    // 4) Identify project/task columns by scanning header row.
    const header = matrix[headerRow].map(opts.normalizeCell);
    const findCol = (pred: (s: string) => boolean) => header.findIndex((s) => pred(s));
    const projectCol =
      findCol((s) => s.includes('project') || s.includes('client') || s.includes('job')) ??
      -1;
    let taskCol =
      findCol(
        (s) =>
          s.includes('task') ||
          s.includes('activity') ||
          s.includes('work item') ||
          s.includes('workitem') ||
          s.includes('description') ||
          // JZER-style sheets often label the task column as "ROLE AND STORY CARD NUMBER"
          s.includes('role') ||
          s.includes('story') ||
          s.includes('card')
      ) ?? -1;

    // Fallback: if we found a project column but not a task column, assume the adjacent column is the task label.
    if (taskCol < 0 && projectCol >= 0 && projectCol + 1 < header.length) {
      taskCol = projectCol + 1;
    }

    if (projectCol < 0) {
      errors.push('Weekly grid detected, but could not detect the Project column in the header row.');
    }
    if (taskCol < 0) {
      errors.push('Weekly grid detected, but could not detect the Task/Activity column in the header row.');
    }
    if (errors.length > 0) {
      return {
        rows: [],
        errors,
        warnings,
        defaultDeveloper: opts.defaultDeveloper,
        firstDataRowNumber: headerRow + 2,
      };
    }

    // 5) Convert each grid row into 0..N row-based entries (one per day with hours > 0).
    const outRows: any[] = [];
    const firstDataRow = headerRow + 1; // data begins after weekday header (and optional date row below may be present)

    // If headerRow+1 looked like explicit dates, skip it as a "dates row" (not actual data).
    const maybeDatesRow = matrix[headerRow + 1] ?? [];
    const dateRowHasDates = dayCols.some(({ col }) => this.parseDate(maybeDatesRow[col]) !== null);
    const isPlausibleHeaderDate = (v: unknown) => {
      const d = this.parseDate(v);
      if (!d) return false;
      const y = d.getFullYear();
      // Guard against treating small numeric hours (e.g. 1, 2) as Excel serial dates (1899/1900).
      return y >= 2000 && y <= 2100;
    };

    const dataStartRow = dayCols.some(({ col }) => isPlausibleHeaderDate(maybeDatesRow[col]))
      ? headerRow + 2
      : firstDataRow;

    // Try one more time to detect developer label/value now that we know it's a grid (handle "Name:" / "Developer:")
    let gridDeveloper = opts.defaultDeveloper;
    if (!gridDeveloper) {
      for (let r = 0; r < Math.min(30, matrix.length) && !gridDeveloper; r++) {
        const row = matrix[r];
        if (!Array.isArray(row)) continue;
        for (let c = 0; c < row.length; c++) {
          const label = opts.normalizeCell(row[c]);
          if (label === 'name' || label === 'developer' || label === 'developer name') {
            const right = row[c + 1];
            if (typeof right === 'string' && right.trim()) gridDeveloper = right.trim();
          }
        }
      }
    }

    if (!gridDeveloper) {
      warnings.push('Developer name not found on the sheet; rows may fail if the grid has no per-row developer column.');
    }

    for (let r = dataStartRow; r < matrix.length; r++) {
      const row = matrix[r];
      if (!Array.isArray(row)) continue;

      const project = typeof row[projectCol] === 'string' ? row[projectCol].trim() : String(row[projectCol] ?? '').trim();
      const task = typeof row[taskCol] === 'string' ? row[taskCol].trim() : String(row[taskCol] ?? '').trim();

      const isRowBlank = !project && !task && dayCols.every(({ col }) => !isNumberLike(row[col]));
      if (isRowBlank) continue;

      const lowerProject = project.toLowerCase();
      const lowerTask = task.toLowerCase();
      if (lowerProject.includes('total') || lowerTask.includes('total') || lowerProject.includes('subtotal') || lowerTask.includes('subtotal')) {
        continue;
      }

      if (!project || !task) {
        // Skip rows that don't look like task lines (common section headers)
        continue;
      }

      for (const { dayIndex, col } of dayCols) {
        const v = row[col];
        if (!isNumberLike(v)) continue;
        const hours = toNumber(v);
        if (!Number.isFinite(hours) || hours <= 0) continue;

        const date = dayDates[dayIndex];
        if (!date) {
          warnings.push(`Could not determine date for day index ${dayIndex}; skipping some cells.`);
          continue;
        }

        const durationMinutes = Math.round(hours * 60);

        outRows.push({
          Developer: gridDeveloper ?? '',
          Project: project,
          Task: task,
          Date: new Date(date),
          Duration: durationMinutes,
        });
      }
    }

    if (outRows.length === 0) {
      return {
        rows: [],
        errors: [
          'Weekly grid detected but no day cells with positive hours were found to import.',
          'Make sure weekday cells contain numeric hours (e.g. 0.25, 1.5, 2).',
        ],
        warnings,
        defaultDeveloper: gridDeveloper ?? opts.defaultDeveloper,
        firstDataRowNumber: dataStartRow + 1,
      };
    }

    return {
      rows: outRows,
      errors,
      warnings,
      defaultDeveloper: gridDeveloper ?? opts.defaultDeveloper,
      firstDataRowNumber: dataStartRow + 1,
    };
  }

  /**
   * Parse rows into time entries
   */
  async parseRows(
    rows: any[],
    opts?: { defaultDeveloper?: string; firstDataRowNumber?: number; mode?: 'preview' | 'import' }
  ): Promise<ParseResult> {
    const entries: TimeEntryInput[] = [];
    const developerCandidates = new Set<string>();
    const projectCandidates = new Set<string>();
    const preview: ParseResult['preview'] = [];
    const errors: string[] = [];
    const warnings: string[] = [];
    const firstDataRowNumber = opts?.firstDataRowNumber ?? 2;
    const mode = opts?.mode ?? 'import';

    for (let i = 0; i < rows.length; i++) {
      const rowNum = firstDataRowNumber + i;
      try {
        // Developer detection should not depend on whether a row parses successfully.
        // Prefer sheet-level defaultDeveloper; otherwise, capture per-row dev candidates.
        const normalizedForDev = this.normalizeColumnNames(rows[i]);
        const devCandidateRaw = opts?.defaultDeveloper ?? normalizedForDev.developer;
        const devCandidate =
          typeof devCandidateRaw === 'string'
            ? devCandidateRaw.trim()
            : devCandidateRaw !== null && devCandidateRaw !== undefined
              ? String(devCandidateRaw).trim()
              : '';
        if (devCandidate) developerCandidates.add(devCandidate);

        const projRaw = normalizedForDev.project;
        const proj =
          typeof projRaw === 'string'
            ? projRaw.trim()
            : projRaw !== null && projRaw !== undefined
              ? String(projRaw).trim()
              : '';
        if (proj && !this.shouldIgnoreProjectToken(proj)) projectCandidates.add(proj);

        const parsed = await this.parseRow(rows[i], rowNum, {
          defaultDeveloper: opts?.defaultDeveloper,
          mode,
        });
        if (parsed) {
          entries.push(parsed.entry);
          if (preview.length < 10) {
            preview.push(parsed.preview);
          }
        }
      } catch (error) {
        errors.push(`Row ${rowNum}: ${error instanceof Error ? error.message : 'Unknown error'}`);
      }
    }

    const sheetDev =
      typeof opts?.defaultDeveloper === 'string' && opts.defaultDeveloper.trim()
        ? opts.defaultDeveloper.trim()
        : null;

    const detectedDeveloper =
      sheetDev ??
      (developerCandidates.size === 1 ? Array.from(developerCandidates)[0]! : null);

    const allProjects = Array.from(projectCandidates).sort((a, b) => a.localeCompare(b));
    let invalidProjects: string[] = [];
    if (mode === 'preview' && allProjects.length > 0) {
      const existing = await db.query.projects.findMany({
        where: inArray(projects.name, allProjects),
        columns: { name: true },
      });
      const existingSet = new Set(existing.map((p) => p.name));
      invalidProjects = allProjects.filter((p) => !existingSet.has(p));

      if (invalidProjects.length > 0) {
        errors.unshift(
          `Invalid projects (${invalidProjects.length}/${allProjects.length}): ${invalidProjects.join(', ')}`
        );
      }
    }

    return {
      entries,
      detectedDeveloper,
      developers: detectedDeveloper ? [detectedDeveloper] : [],
      projects: { all: allProjects, invalid: invalidProjects },
      preview,
      errors,
      warnings,
    };
  }

  /**
   * Parse a single row
   */
  private async parseRow(
    row: any,
    rowNum: number
    ,
    opts?: { defaultDeveloper?: string; mode?: 'preview' | 'import' }
  ): Promise<{ entry: TimeEntryInput; preview: ParseResult['preview'][number] } | null> {
    // Normalize column names (case-insensitive, flexible naming)
    const normalized = this.normalizeColumnNames(row);

    // Skip blank/separator rows (common in real-world spreadsheets)
    const values = Object.values(normalized);
    const isBlank =
      values.length === 0 ||
      values.every((v) => v === null || v === undefined || v === '' || (typeof v === 'string' && !v.trim()));
    if (isBlank) return null;

    // Validate required fields
    const developerName = normalized.developer || opts?.defaultDeveloper;
    if (!developerName) {
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
    const mode = opts?.mode ?? 'import';
    const developerId = mode === 'import' ? await this.getOrCreateDeveloper(developerName) : 0;

    // Get or create project
    const projectId = mode === 'import' ? await this.getOrCreateProject(normalized.project) : 0;

    // Get or create task (optional)
    let taskId: number | undefined;
    if (normalized.task) {
      taskId = mode === 'import' ? await this.getOrCreateTask(projectId, normalized.task) : undefined;
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

    const entry: TimeEntryInput = {
      developerId,
      projectId,
      taskId,
      startTime,
      durationMinutes,
      description: normalized.notes || undefined,
    };

    const preview: ParseResult['preview'][number] = {
      developer: developerName,
      project: normalized.project,
      task: normalized.task,
      startTime,
      durationMinutes,
      notes: normalized.notes || undefined,
    };

    return { entry, preview };
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
      else if (
        lowerKey === 'project' ||
        lowerKey === 'project name' ||
        lowerKey === 'proj' ||
        lowerKey === 'project code'
      ) {
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

    // If the cell is a purely numeric string, DO NOT fall back to native Date parsing.
    // JS treats `"1"` as a valid date (e.g. 2001-01-01 in some engines), which breaks
    // weekly grid detection where hour cells are numbers rendered as strings.
    //
    // Instead, treat large numeric strings as Excel serial dates and reject the rest.
    if (/^\d+(?:\.\d+)?$/.test(s)) {
      const n = Number(s);
      if (!Number.isFinite(n)) return null;
      // Plausible Excel serial date range (roughly mid-20th century through ~2119).
      if (n >= 20000 && n <= 80000) {
        const ms = (n - 25569) * 86400000;
        const d = new Date(ms);
        return isNaN(d.getTime()) ? null : d;
      }
      return null;
    }

    // Explicit YYYY-MM-DD (treat as LOCAL date; JS Date('YYYY-MM-DD') is UTC and causes timezone shifts)
    const ymd = s.match(/^(\d{4})-(\d{1,2})-(\d{1,2})$/);
    if (ymd) {
      const y = parseInt(ymd[1], 10);
      const m = parseInt(ymd[2], 10);
      const d = parseInt(ymd[3], 10);
      const date = new Date(y, m - 1, d);
      return isNaN(date.getTime()) ? null : date;
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

    // Try native parsing last (handles ISO 8601 date-times and many common variants)
    const native = new Date(s);
    if (!isNaN(native.getTime())) {
      return native;
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
