import test from 'node:test';
import assert from 'node:assert/strict';
import { createTaskSchema } from '../src/lib/validators';

test('createTaskSchema requires name', () => {
  assert.throws(() =>
    createTaskSchema.parse({ projectId: 1, status: 'pending' })
  );
});

test('createTaskSchema rejects negative estimated hours', () => {
  assert.throws(() =>
    createTaskSchema.parse({
      projectId: 1,
      name: 'QA Task',
      status: 'pending',
      estimatedHours: -1,
    })
  );
});

test('createTaskSchema allows zero or null estimated hours', () => {
  assert.doesNotThrow(() =>
    createTaskSchema.parse({
      projectId: 1,
      name: 'QA Task',
      status: 'pending',
      estimatedHours: 0,
    })
  );

  assert.doesNotThrow(() =>
    createTaskSchema.parse({
      projectId: 1,
      name: 'QA Task',
      status: 'pending',
    })
  );
});

test('createTaskSchema enforces valid status values', () => {
  assert.doesNotThrow(() =>
    createTaskSchema.parse({
      projectId: 1,
      name: 'QA Task',
      status: 'in-progress',
    })
  );

  assert.throws(() =>
    createTaskSchema.parse({
      projectId: 1,
      name: 'QA Task',
      status: 'paused',
    })
  );
});
