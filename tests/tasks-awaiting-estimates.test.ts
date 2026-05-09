/**
 * Story 6.2 — filter + sort for “Tasks awaiting estimates” card.
 */
import test from 'node:test';
import assert from 'node:assert/strict';
import {
  isTaskAwaitingEstimate,
  tasksAwaitingEstimatesSorted,
} from '../src/lib/tasks-awaiting-estimates';

test('Story 6.2: null estimate + pipeline status → awaiting', () => {
  assert.equal(isTaskAwaitingEstimate({ estimatedHours: null, status: 'pending' }), true);
  assert.equal(isTaskAwaitingEstimate({ estimatedHours: null, status: 'in-progress' }), true);
  assert.equal(isTaskAwaitingEstimate({ estimatedHours: null, status: 'blocked' }), true);
});

test('Story 6.2: completed excluded even when estimate null', () => {
  assert.equal(isTaskAwaitingEstimate({ estimatedHours: null, status: 'completed' }), false);
});

test('Story 6.2: zero hours is set — not awaiting', () => {
  assert.equal(isTaskAwaitingEstimate({ estimatedHours: 0, status: 'pending' }), false);
});

test('Story 6.2: positive estimate — not awaiting', () => {
  assert.equal(isTaskAwaitingEstimate({ estimatedHours: 4, status: 'pending' }), false);
});

test('Story 6.2: undefined estimate (API edge) — same as null for pipeline status', () => {
  assert.equal(isTaskAwaitingEstimate({ estimatedHours: undefined, status: 'pending' }), true);
});

test('Story 6.2: null estimate + non-pipeline status — not awaiting', () => {
  assert.equal(isTaskAwaitingEstimate({ estimatedHours: null, status: 'archived' }), false);
});

test('Story 6.2: sort by name A→Z', () => {
  const sorted = tasksAwaitingEstimatesSorted([
    { name: 'Zebra', estimatedHours: null, status: 'pending', id: 1 },
    { name: 'Alpha', estimatedHours: null, status: 'blocked', id: 2 },
    { name: 'Beta', estimatedHours: null, status: 'in-progress', id: 3 },
  ]);
  assert.deepEqual(
    sorted.map((t) => t.name),
    ['Alpha', 'Beta', 'Zebra']
  );
});

test('Story 6.2: mixed rows — only awaiting + pipeline', () => {
  const sorted = tasksAwaitingEstimatesSorted([
    { name: 'Done null', estimatedHours: null, status: 'completed', id: 1 },
    { name: 'Has est', estimatedHours: 2, status: 'pending', id: 2 },
    { name: 'Need est', estimatedHours: null, status: 'pending', id: 3 },
  ]);
  assert.equal(sorted.length, 1);
  assert.equal(sorted[0].name, 'Need est');
});
