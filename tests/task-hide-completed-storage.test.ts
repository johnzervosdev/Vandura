import test from 'node:test';
import assert from 'node:assert/strict';
import {
  parseHideCompletedStoredValue,
  TASK_HIDE_COMPLETED_KEY_PREFIX,
} from '../src/lib/task-hide-completed-storage';

test('Story 6.4: parseHideCompletedStoredValue defaults when missing or unknown', () => {
  assert.equal(parseHideCompletedStoredValue(null), false);
  assert.equal(parseHideCompletedStoredValue(''), false);
  assert.equal(parseHideCompletedStoredValue('maybe'), false);
});

test('Story 6.4: parseHideCompletedStoredValue accepts true / 1 / JSON true', () => {
  assert.equal(parseHideCompletedStoredValue('true'), true);
  assert.equal(parseHideCompletedStoredValue('1'), true);
  assert.equal(parseHideCompletedStoredValue(JSON.stringify(true)), true);
});

test('Story 6.4: parseHideCompletedStoredValue accepts false / 0 / JSON false', () => {
  assert.equal(parseHideCompletedStoredValue('false'), false);
  assert.equal(parseHideCompletedStoredValue('0'), false);
  assert.equal(parseHideCompletedStoredValue(JSON.stringify(false)), false);
});

test('Story 6.4: storage key prefix matches Hannibal', () => {
  assert.equal(TASK_HIDE_COMPLETED_KEY_PREFIX, 'vandura.tasks.hideCompleted.');
});
