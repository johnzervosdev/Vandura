import test from 'node:test';
import assert from 'node:assert/strict';
import {
  createProjectSchema,
  createTaskSchema,
  createTimeEntrySchema,
} from '../src/lib/validators';

test('createTimeEntrySchema validates 15-minute duration rule', () => {
  const base = {
    projectId: 1,
    developerId: 1,
    startTime: new Date('2026-02-05T09:00:00'),
    description: 'QA test',
  };

  assert.doesNotThrow(() =>
    createTimeEntrySchema.parse({ ...base, durationMinutes: 15 })
  );

  assert.throws(() =>
    createTimeEntrySchema.parse({ ...base, durationMinutes: 7 })
  );
});

test('createProjectSchema allows zero or null estimatedHours', () => {
  const base = {
    name: 'QA Project',
    status: 'active' as const,
  };

  assert.doesNotThrow(() =>
    createProjectSchema.parse({ ...base, estimatedHours: 0 })
  );

  assert.doesNotThrow(() => createProjectSchema.parse(base));
});

test('createTaskSchema allows zero or null estimatedHours', () => {
  const base = {
    projectId: 1,
    name: 'QA Task',
    status: 'pending' as const,
  };

  assert.doesNotThrow(() =>
    createTaskSchema.parse({ ...base, estimatedHours: 0 })
  );

  assert.doesNotThrow(() => createTaskSchema.parse(base));
});
