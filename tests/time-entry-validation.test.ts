import test from 'node:test';
import assert from 'node:assert/strict';
import { createTimeEntrySchema } from '../src/lib/validators';

const base = {
  projectId: 1,
  developerId: 1,
  taskId: 1,
  startTime: new Date('2026-04-07T09:00:00'),
  description: 'QA test',
};

test('createTimeEntrySchema rejects zero or non-15 durations', () => {
  assert.throws(() =>
    createTimeEntrySchema.parse({ ...base, durationMinutes: 0 })
  );
  assert.throws(() =>
    createTimeEntrySchema.parse({ ...base, durationMinutes: 22 })
  );
});

test('createTimeEntrySchema accepts 15-minute increments', () => {
  assert.doesNotThrow(() =>
    createTimeEntrySchema.parse({ ...base, durationMinutes: 15 })
  );
  assert.doesNotThrow(() =>
    createTimeEntrySchema.parse({ ...base, durationMinutes: 480 })
  );
});

test('createTimeEntrySchema enforces positive duration', () => {
  assert.throws(() =>
    createTimeEntrySchema.parse({ ...base, durationMinutes: -15 })
  );
});
