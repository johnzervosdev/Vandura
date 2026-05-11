import test from 'node:test';
import assert from 'node:assert/strict';
import {
  DEFAULT_TASK_LIST_SORT,
  parseTaskListSort,
} from '../src/lib/task-sort-storage';

test('Story 6.3: parseTaskListSort defaults on empty / invalid', () => {
  assert.deepEqual(parseTaskListSort(null), DEFAULT_TASK_LIST_SORT);
  assert.deepEqual(parseTaskListSort(''), DEFAULT_TASK_LIST_SORT);
  assert.deepEqual(parseTaskListSort('not-json'), DEFAULT_TASK_LIST_SORT);
  assert.deepEqual(parseTaskListSort('{}'), DEFAULT_TASK_LIST_SORT);
});

test('Story 6.3: parseTaskListSort accepts saved column + direction', () => {
  assert.deepEqual(
    parseTaskListSort(JSON.stringify({ sortBy: 'name', sortDir: 'desc' })),
    { sortBy: 'name', sortDir: 'desc' }
  );
});
