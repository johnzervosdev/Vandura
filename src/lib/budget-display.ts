/**
 * Story 6.1 — project **budget** (`projects.estimatedHours`) vs per-task **estimated hours**.
 * @see `van/stories.md` — Story 6.1, Hannibal B.A. Q&A
 */

export function formatProjectBudgetHours(h: number | null | undefined): string {
  if (h === null || h === undefined) return 'TBD';
  return `${h.toFixed(1)}h`;
}

export function formatTaskEstimatedHours(h: number | null | undefined): string {
  if (h === null || h === undefined) return 'TBD';
  return `${h.toFixed(1)}h`;
}

export type TaskEstimatesTotalResult =
  | { kind: 'tbd' }
  | { kind: 'hours'; value: number };

/**
 * (Hannibal B): numeric sum only when every task has a set `estimatedHours` (`0` is set).
 * Empty task list → `0` hours.
 */
export function taskEstimatesTotal(tasks: ReadonlyArray<{ estimatedHours: number | null }>): TaskEstimatesTotalResult {
  if (tasks.length === 0) {
    return { kind: 'hours', value: 0 };
  }
  for (const t of tasks) {
    if (t.estimatedHours === null || t.estimatedHours === undefined) {
      return { kind: 'tbd' };
    }
  }
  const value = tasks.reduce((s, t) => s + (t.estimatedHours as number), 0);
  return { kind: 'hours', value };
}

export function taskEstimatesTotalDisplay(
  tasks: ReadonlyArray<{ estimatedHours: number | null }>
): string {
  const r = taskEstimatesTotal(tasks);
  if (r.kind === 'tbd') return 'TBD';
  return `${r.value.toFixed(1)}h`;
}

export type ProjectBudgetColumnRow = { status: string; estimatedHours: number | null };

/** Dashboard / rollup: TBD if any **active** project has unset budget. */
export function totalActiveProjectBudget(
  projects: ReadonlyArray<ProjectBudgetColumnRow>
): TaskEstimatesTotalResult {
  const active = projects.filter((p) => p.status === 'active');
  if (active.length === 0) return { kind: 'hours', value: 0 };
  for (const p of active) {
    if (p.estimatedHours === null || p.estimatedHours === undefined) {
      return { kind: 'tbd' };
    }
  }
  const value = active.reduce((s, p) => s + (p.estimatedHours as number), 0);
  return { kind: 'hours', value };
}

export function totalActiveProjectBudgetDisplay(projects: ReadonlyArray<ProjectBudgetColumnRow>): string {
  const r = totalActiveProjectBudget(projects);
  if (r.kind === 'tbd') return 'TBD';
  return `${r.value.toFixed(1)}h`;
}

/**
 * Hannibal (B) rollup for per-project task sum from SQL aggregates:
 * - No tasks → `0`
 * - Any `estimatedHours` null among tasks → `null` (display **TBD**)
 * - Else sum of `estimatedHours`
 */
export function taskEstimatesTotalFromRollup(
  taskCount: number,
  nullEstimateCount: number,
  sumWhenAllSet: number
): number | null {
  if (taskCount === 0) return 0;
  if (nullEstimateCount > 0) return null;
  return sumWhenAllSet;
}
