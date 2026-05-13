import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const repoRoot = path.join(__dirname, '..');

function read(relFromRoot: string): string {
  return readFileSync(path.join(repoRoot, ...relFromRoot.split('/')), 'utf8');
}

test('Story 6.4: TasksSection filters main table only + a11y on eye toggle', () => {
  const src = read('src/app/projects/[id]/_components/TasksSection.tsx');
  assert.ok(src.includes("from '@/lib/task-hide-completed'"));
  assert.ok(src.includes('visibleTasksForMainTable(taskRows, hideCompleted)'));
  assert.ok(src.includes('tasksAwaitingEstimatesSorted(taskRows)'));
  assert.ok(src.includes('aria-pressed={hideCompleted}'));
  assert.ok(src.includes("'Hide completed tasks'"));
  assert.ok(src.includes("'Show completed tasks in the table'"));
});

test('Story 6.4: filtered empty state explains completed hidden + Show completed action', () => {
  const src = read('src/app/projects/[id]/_components/TasksSection.tsx');
  assert.ok(src.includes('Every task on this project is'));
  assert.ok(src.includes('Show completed tasks'));
  assert.ok(src.includes('setHideCompleted(false)'));
});

test('Story 6.4: project detail wires persisted hide flag', () => {
  const src = read('src/app/projects/[id]/page.tsx');
  assert.ok(src.includes("from '@/lib/task-hide-completed-storage'"));
  assert.ok(src.includes('readHideCompletedFromStorage'));
  assert.ok(src.includes('writeHideCompletedToStorage'));
  assert.ok(src.includes('hideCompleted={hideCompleted}'));
});
