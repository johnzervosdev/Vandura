import test from 'node:test';
import assert from 'node:assert/strict';
import { calculateDuration, isValidDuration } from '../src/lib/date-utils';

test('calculateDuration returns raw minutes for non-15-min differences', () => {
  const start = new Date('2026-02-05T09:00:00');
  const end = new Date('2026-02-05T09:37:00');

  const minutes = calculateDuration(start, end);

  assert.equal(minutes, 37);
  assert.equal(isValidDuration(minutes), false);
});
