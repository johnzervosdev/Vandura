import test from 'node:test';
import assert from 'node:assert/strict';
import { visibleTasksForMainTable } from '../src/lib/task-hide-completed';

test('Story 6.4: visibleTasksForMainTable passes through when hide is off', () => {
  const rows = [
    { id: 1, status: 'completed' },
    { id: 2, status: 'pending' },
  ];
  assert.deepEqual(visibleTasksForMainTable(rows, false), rows);
});

test('Story 6.4: visibleTasksForMainTable hides completed only', () => {
  const rows = [
    { id: 1, status: 'completed' },
    { id: 2, status: 'pending' },
    { id: 3, status: 'blocked' },
  ];
  assert.deepEqual(visibleTasksForMainTable(rows, true), [
    { id: 2, status: 'pending' },
    { id: 3, status: 'blocked' },
  ]);
});

test('Story 6.4: visibleTasksForMainTable empty when all completed and hide on', () => {
  const rows = [
    { id: 1, status: 'completed' },
    { id: 2, status: 'completed' },
  ];
  assert.deepEqual(visibleTasksForMainTable(rows, true), []);
});

test('Story 6.4: only status completed is hidden (other strings stay visible)', () => {
  const rows = [
    { id: 1, status: 'completed' },
    { id: 2, status: 'cancelled' },
    { id: 3, status: 'pending' },
  ];
  assert.deepEqual(visibleTasksForMainTable(rows, true), [
    { id: 2, status: 'cancelled' },
    { id: 3, status: 'pending' },
  ]);
});

test('Story 6.4: visibleTasksForMainTable preserves server sort order', () => {
  const rows = [
    { id: 1, status: 'completed' },
    { id: 2, status: 'pending' },
    { id: 3, status: 'completed' },
    { id: 4, status: 'blocked' },
  ];
  assert.deepEqual(
    visibleTasksForMainTable(rows, true).map((r) => r.id),
    [2, 4]
  );
});
