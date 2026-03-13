import test from 'node:test';
import assert from 'node:assert/strict';
import { calculateDuration, isValidDuration, getPresetRange } from '../src/lib/date-utils';

test('calculateDuration returns raw minutes for non-15-min differences', () => {
  const start = new Date('2026-02-05T09:00:00');
  const end = new Date('2026-02-05T09:37:00');

  const minutes = calculateDuration(start, end);

  assert.equal(minutes, 37);
  assert.equal(isValidDuration(minutes), false);
});

test('getPresetRange Last 7 Days returns inclusive start/end', () => {
  const now = new Date(2026, 1, 10, 13, 45, 0);
  const { startDate, endDate } = getPresetRange('Last 7 Days', now);

  assert.ok(startDate);
  assert.ok(endDate);

  assert.equal(startDate.getFullYear(), 2026);
  assert.equal(startDate.getMonth(), 1);
  assert.equal(startDate.getDate(), 4);
  assert.equal(startDate.getHours(), 0);
  assert.equal(startDate.getMinutes(), 0);

  assert.equal(endDate.getFullYear(), 2026);
  assert.equal(endDate.getMonth(), 1);
  assert.equal(endDate.getDate(), 10);
  assert.equal(endDate.getHours(), 23);
  assert.equal(endDate.getMinutes(), 59);
});

test('getPresetRange This Month returns month boundaries (start of month to today)', () => {
  const now = new Date(2026, 1, 10, 9, 15, 0); // Feb 10, 2026
  const { startDate, endDate } = getPresetRange('This Month', now);

  assert.ok(startDate);
  assert.ok(endDate);

  assert.equal(startDate.getFullYear(), 2026);
  assert.equal(startDate.getMonth(), 1);
  assert.equal(startDate.getDate(), 1);
  assert.equal(startDate.getHours(), 0);
  assert.equal(startDate.getMinutes(), 0);

  assert.equal(endDate.getFullYear(), 2026);
  assert.equal(endDate.getMonth(), 1);
  assert.equal(endDate.getDate(), 10);
  assert.equal(endDate.getHours(), 23);
  assert.equal(endDate.getMinutes(), 59);
});

test('getPresetRange Last 30 Days returns inclusive range', () => {
  const now = new Date(2026, 1, 10, 9, 15, 0);
  const { startDate, endDate } = getPresetRange('Last 30 Days', now);

  assert.ok(startDate);
  assert.ok(endDate);

  assert.equal(startDate.getFullYear(), 2026);
  assert.equal(startDate.getMonth(), 0);
  assert.equal(startDate.getDate(), 12);
  assert.equal(startDate.getHours(), 0);
  assert.equal(startDate.getMinutes(), 0);

  assert.equal(endDate.getFullYear(), 2026);
  assert.equal(endDate.getMonth(), 1);
  assert.equal(endDate.getDate(), 10);
  assert.equal(endDate.getHours(), 23);
  assert.equal(endDate.getMinutes(), 59);
});

test('getPresetRange All Time returns undefined start/end', () => {
  const now = new Date(2026, 1, 10, 9, 15, 0);
  const { startDate, endDate } = getPresetRange('All Time', now);
  assert.equal(startDate, undefined);
  assert.equal(endDate, undefined);
});
