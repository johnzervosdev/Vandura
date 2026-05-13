/**
 * Story 6.4 — persist “hide completed” for the project-detail task table (Hannibal; matches `task-sort-storage` pattern).
 */
export const TASK_HIDE_COMPLETED_KEY_PREFIX = 'vandura.tasks.hideCompleted.';

/** Parse persisted value; `null` key missing → default visible (false). */
export function parseHideCompletedStoredValue(raw: string | null): boolean {
  if (raw === null) return false;
  if (raw === 'true' || raw === '1') return true;
  if (raw === 'false' || raw === '0') return false;
  try {
    return Boolean(JSON.parse(raw));
  } catch {
    return false;
  }
}

/** `false` = completed tasks visible (default). */
export function readHideCompletedFromStorage(projectId: number): boolean {
  if (typeof window === 'undefined') return false;
  const raw = localStorage.getItem(`${TASK_HIDE_COMPLETED_KEY_PREFIX}${projectId}`);
  return parseHideCompletedStoredValue(raw);
}

export function writeHideCompletedToStorage(projectId: number, hideCompleted: boolean) {
  if (typeof window === 'undefined') return;
  try {
    localStorage.setItem(
      `${TASK_HIDE_COMPLETED_KEY_PREFIX}${projectId}`,
      hideCompleted ? 'true' : 'false'
    );
  } catch {
    /* quota / private mode — ignore */
  }
}
