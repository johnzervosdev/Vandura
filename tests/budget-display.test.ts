import test from 'node:test';
import assert from 'node:assert/strict';
import {
  formatProjectBudgetHours,
  formatTaskEstimatedHours,
  taskEstimatesTotal,
  taskEstimatesTotalDisplay,
  totalActiveProjectBudget,
  taskEstimatesTotalFromRollup,
} from '../src/lib/budget-display';

test('Story 6.1: project budget null → TBD, zero → 0.0h', () => {
  assert.equal(formatProjectBudgetHours(null), 'TBD');
  assert.equal(formatProjectBudgetHours(undefined), 'TBD');
  assert.equal(formatProjectBudgetHours(0), '0.0h');
  assert.equal(formatProjectBudgetHours(10), '10.0h');
});

test('Story 6.1: task estimates total TBD if any task null', () => {
  assert.equal(
    taskEstimatesTotalDisplay([{ estimatedHours: 5 }, { estimatedHours: null }]),
    'TBD'
  );
  assert.equal(taskEstimatesTotalDisplay([{ estimatedHours: 0 }, { estimatedHours: 5 }]), '5.0h');
  assert.equal(taskEstimatesTotalDisplay([]), '0.0h');
  const r = taskEstimatesTotal([{ estimatedHours: null }]);
  assert.equal(r.kind, 'tbd');
});

test('Story 6.1: total active project budget TBD if any active project null budget', () => {
  assert.equal(
    totalActiveProjectBudget([
      { status: 'active', estimatedHours: 10 },
      { status: 'active', estimatedHours: null },
    ]).kind,
    'tbd'
  );
  const x = totalActiveProjectBudget([{ status: 'active', estimatedHours: 10 }]);
  assert.equal(x.kind, 'hours');
  if (x.kind === 'hours') assert.equal(x.value, 10);
  assert.equal(formatTaskEstimatedHours(null), 'TBD');
});

test('taskEstimatesTotalFromRollup matches Hannibal B (empty → 0, any null → TBD, else sum)', () => {
  assert.equal(taskEstimatesTotalFromRollup(0, 0, 0), 0);
  assert.equal(taskEstimatesTotalFromRollup(2, 1, 3), null);
  assert.equal(taskEstimatesTotalFromRollup(2, 0, 7.5), 7.5);
});
