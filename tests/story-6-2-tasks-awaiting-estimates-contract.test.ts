import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const repoRoot = path.join(__dirname, '..');

/** Story 6.2 — [`van/stories.md`](../van/stories.md): project-detail card + fast edit + refetch. */
function read(relFromRoot: string): string {
  return readFileSync(path.join(repoRoot, ...relFromRoot.split('/')), 'utf8');
}

test('Story 6.2: TasksSection card copy, empty state, and Add estimate affordance', () => {
  const src = read('src/app/projects/[id]/_components/TasksSection.tsx');
  assert.ok(src.includes('<h2 className="text-lg font-semibold">Tasks awaiting estimates</h2>'));
  assert.ok(
    src.includes('Estimated hours show'),
    'TBD language aligned with Story 6.1'
  );
  assert.ok(src.includes('All tasks have estimates.'));
  assert.ok(src.includes('Add estimate'));
  assert.ok(src.includes('aria-label={`Add estimate for ${t.name}`}'));
  assert.ok(src.includes("from '@/lib/tasks-awaiting-estimates'"));
  assert.ok(src.includes('tasksAwaitingEstimatesSorted(taskRows)'));
});

test('Story 6.2: awaiting card appears before main Tasks table (second card / layout stability)', () => {
  const src = read('src/app/projects/[id]/_components/TasksSection.tsx');
  const iAwaiting = src.indexOf('Tasks awaiting estimates');
  const iTasksHeading = src.indexOf('<h2 className="text-lg font-semibold">Tasks</h2>');
  assert.ok(iAwaiting !== -1 && iTasksHeading !== -1);
  assert.ok(iAwaiting < iTasksHeading, 'awaiting-estimates card should precede main task table');
});

test('Story 6.2: modal edit from card focuses estimated hours and refetches list on save', () => {
  const src = read('src/app/projects/[id]/_components/TasksSection.tsx');
  assert.ok(src.includes('setEditFocusEstimate(true)'));
  assert.ok(
    src.includes("initialFocusField={editFocusEstimate ? 'estimatedHours' : undefined}"),
    'TaskForm should receive estimatedHours focus when opened from card'
  );
  assert.ok(
    /updateTaskFromModal[\s\S]*?onSuccess:\s*async\s*\(\)\s*=>\s*\{[\s\S]*?listByProject\.invalidate/.test(
      src
    ),
    'modal update should invalidate task.listByProject so card refreshes without full reload'
  );
});

test('Story 6.2: TaskForm focuses estimated hours input when initialFocusField is set', () => {
  const src = read('src/app/projects/_components/TaskForm.tsx');
  assert.ok(src.includes("initialFocusField?: 'estimatedHours'"));
  assert.ok(src.includes("if (initialFocusField === 'estimatedHours')"));
  assert.ok(src.includes('estimatedHoursRef.current?.focus()'));
});
