import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const repoRoot = path.join(__dirname, '..');

/** Story 6.3 — [`van/stories.md`](../van/stories.md): sortable table + Story # + persisted sort. */
function read(relFromRoot: string): string {
  return readFileSync(path.join(repoRoot, ...relFromRoot.split('/')), 'utf8');
}

test('Story 6.3: TasksSection has sortable Story # / Name / Status / Estimated Hours; Actions not sortable', () => {
  const src = read('src/app/projects/[id]/_components/TasksSection.tsx');
  assert.ok(src.includes("{sortHeader('Story #', 'story_number')}"));
  assert.ok(src.includes("{sortHeader('Name', 'name')}"));
  assert.ok(src.includes("{sortHeader('Status', 'status')}"));
  assert.ok(src.includes("{sortHeader('Estimated Hours', 'estimated_hours')}"));
  assert.ok(src.includes('<th className="text-right py-3 px-4">Actions</th>'));
  assert.ok(src.includes('formatTaskStoryNumber(t.storyNumber)'));
  assert.ok(src.includes('formatTaskEstimatedHours(t.estimatedHours)'));
});

test('Story 6.3: estimates card stays name-sorted (independent of table sort)', () => {
  const src = read('src/app/projects/[id]/_components/TasksSection.tsx');
  assert.ok(src.includes('tasksAwaitingEstimatesSorted(taskRows)'));
});

test('Story 6.3: project detail persists task list sort via task-sort-storage', () => {
  const src = read('src/app/projects/[id]/page.tsx');
  assert.ok(src.includes("from '@/lib/task-sort-storage'"));
  assert.ok(src.includes('readTaskListSortFromStorage'));
  assert.ok(src.includes('writeTaskListSortToStorage'));
  assert.ok(src.includes('toggleTaskSort'));
  assert.ok(src.includes('sortBy: taskSort.sortBy'));
});

test('Story 6.3: TaskForm exposes optional Story # with ≥1 validation copy', () => {
  const src = read('src/app/projects/_components/TaskForm.tsx');
  assert.ok(src.includes('Story # (optional)'));
  assert.ok(src.includes('Story # must be 1 or greater'));
  assert.ok(src.includes("variant?: 'create' | 'edit'"));
});

test('Story 6.3: sort storage key prefix matches Hannibal', () => {
  const src = read('src/lib/task-sort-storage.ts');
  assert.ok(src.includes("TASK_SORT_STORAGE_KEY_PREFIX = 'vandura.tasks.sort.'"));
});
