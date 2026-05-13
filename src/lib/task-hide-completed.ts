/**
 * Story 6.4 — client-side visibility for the main task table (`completed` only).
 */
export function visibleTasksForMainTable<T extends { status: string }>(
  tasks: T[],
  hideCompleted: boolean
): T[] {
  if (!hideCompleted) return tasks;
  return tasks.filter((t) => t.status !== 'completed');
}
