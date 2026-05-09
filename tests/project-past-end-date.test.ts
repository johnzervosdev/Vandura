/**
 * Story 6.5 — local calendar rule for planning `endDate` vs “today” (injectable clock).
 */
import test from 'node:test';
import assert from 'node:assert/strict';
import {
  getProjectPastEndCueLevel,
  isProjectPastEndDate,
} from '../src/lib/project-past-end-date';

/** Fixed “today” for tests — midday local (Story 6.5: comparison uses start-of-day only). */
const NOW = new Date(2026, 4, 10, 14, 30, 0); // May 10, 2026 local

test('Story 6.5: active + end strictly before today → strong cue', () => {
  assert.equal(
    getProjectPastEndCueLevel({
      endDate: new Date(2026, 4, 9),
      status: 'active',
      now: NOW,
    }),
    'active'
  );
  assert.equal(isProjectPastEndDate({ endDate: new Date(2026, 4, 9), status: 'active', now: NOW }), true);
});

test('Story 6.5: on-hold + end strictly before today → light cue', () => {
  assert.equal(
    getProjectPastEndCueLevel({
      endDate: new Date(2026, 4, 9),
      status: 'on-hold',
      now: NOW,
    }),
    'on-hold'
  );
});

test('Story 6.5: inclusive end date — same calendar day as now → no cue', () => {
  assert.equal(
    getProjectPastEndCueLevel({
      endDate: new Date(2026, 4, 10, 23, 59, 59),
      status: 'active',
      now: NOW,
    }),
    null
  );
});

test('Story 6.5: end after today → no cue', () => {
  assert.equal(
    getProjectPastEndCueLevel({
      endDate: new Date(2026, 4, 11),
      status: 'active',
      now: NOW,
    }),
    null
  );
});

test('Story 6.5: completed never cues (even if end in past)', () => {
  assert.equal(
    getProjectPastEndCueLevel({
      endDate: new Date(2026, 4, 1),
      status: 'completed',
      now: NOW,
    }),
    null
  );
});

test('Story 6.5: cancelled never cues', () => {
  assert.equal(
    getProjectPastEndCueLevel({
      endDate: new Date(2026, 4, 1),
      status: 'cancelled',
      now: NOW,
    }),
    null
  );
});

test('Story 6.5: null endDate → no cue', () => {
  assert.equal(getProjectPastEndCueLevel({ endDate: null, status: 'active', now: NOW }), null);
});

test('Story 6.5: unknown status + past end → no cue', () => {
  assert.equal(
    getProjectPastEndCueLevel({
      endDate: new Date(2026, 4, 1),
      status: 'future-status',
      now: NOW,
    }),
    null
  );
});
