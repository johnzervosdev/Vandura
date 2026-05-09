/**
 * Story 6.2 — which tasks appear in “Tasks awaiting estimates” (Hannibal rules in `van/stories.md`).
 */

export const TASK_AWAITING_ESTIMATE_STATUSES = ['pending', 'in-progress', 'blocked'] as const;
export type TaskAwaitingEstimateStatus = (typeof TASK_AWAITING_ESTIMATE_STATUSES)[number];

export function isTaskAwaitingEstimate(task: {
  estimatedHours: number | null | undefined;
  status: string;
}): boolean {
  if (task.estimatedHours !== null && task.estimatedHours !== undefined) return false;
  return (TASK_AWAITING_ESTIMATE_STATUSES as readonly string[]).includes(task.status);
}

/** Hannibal: `name` ascending (A→Z), flat list (parents + children). */
export function tasksAwaitingEstimatesSorted<
  T extends { name: string; estimatedHours: number | null | undefined; status: string },
>(tasks: readonly T[]): T[] {
  return tasks.filter(isTaskAwaitingEstimate).sort((a, b) => a.name.localeCompare(b.name));
}
