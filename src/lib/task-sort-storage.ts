/**
 * Story 6.3 — persist task table sort per project (Hannibal; aligns with Story 6.4 hide-toggle key style).
 */
import type { TaskListSortBy, TaskListSortDir } from '@/lib/task-list-sort';

export const TASK_SORT_STORAGE_KEY_PREFIX = 'vandura.tasks.sort.';

export const DEFAULT_TASK_LIST_SORT: { sortBy: TaskListSortBy; sortDir: TaskListSortDir } = {
  sortBy: 'story_number',
  sortDir: 'asc',
};

export function parseTaskListSort(raw: string | null): { sortBy: TaskListSortBy; sortDir: TaskListSortDir } {
  if (!raw) return DEFAULT_TASK_LIST_SORT;
  try {
    const o = JSON.parse(raw) as { sortBy?: unknown; sortDir?: unknown };
    if (
      o.sortBy !== 'story_number' &&
      o.sortBy !== 'name' &&
      o.sortBy !== 'status' &&
      o.sortBy !== 'estimated_hours'
    ) {
      return DEFAULT_TASK_LIST_SORT;
    }
    if (o.sortDir !== 'asc' && o.sortDir !== 'desc') return DEFAULT_TASK_LIST_SORT;
    return { sortBy: o.sortBy, sortDir: o.sortDir };
  } catch {
    return DEFAULT_TASK_LIST_SORT;
  }
}

export function readTaskListSortFromStorage(projectId: number): {
  sortBy: TaskListSortBy;
  sortDir: TaskListSortDir;
} {
  if (typeof window === 'undefined') return DEFAULT_TASK_LIST_SORT;
  return parseTaskListSort(localStorage.getItem(`${TASK_SORT_STORAGE_KEY_PREFIX}${projectId}`));
}

export function writeTaskListSortToStorage(
  projectId: number,
  sort: { sortBy: TaskListSortBy; sortDir: TaskListSortDir }
) {
  if (typeof window === 'undefined') return;
  try {
    localStorage.setItem(`${TASK_SORT_STORAGE_KEY_PREFIX}${projectId}`, JSON.stringify(sort));
  } catch {
    /* quota / private mode — ignore */
  }
}
