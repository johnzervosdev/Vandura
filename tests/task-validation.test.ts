import test from 'node:test';
import assert from 'node:assert/strict';
import { createTaskSchema, updateTaskDataSchema } from '../src/lib/validators';

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

test('createTaskSchema rejects story # below 1', () => {
  assert.throws(() =>
    createTaskSchema.parse({
      projectId: 1,
      name: 'QA Task',
      status: 'pending',
      storyNumber: 0,
    })
  );
  assert.throws(() =>
    createTaskSchema.parse({
      projectId: 1,
      name: 'QA Task',
      status: 'pending',
      storyNumber: -1,
    })
  );
});

test('createTaskSchema allows omit story # or valid integer', () => {
  assert.doesNotThrow(() =>
    createTaskSchema.parse({
      projectId: 1,
      name: 'QA Task',
      status: 'pending',
    })
  );
  assert.doesNotThrow(() =>
    createTaskSchema.parse({
      projectId: 1,
      name: 'QA Task',
      status: 'pending',
      storyNumber: 42,
    })
  );
});

test('updateTaskDataSchema allows storyNumber null (clear)', () => {
  assert.doesNotThrow(() => updateTaskDataSchema.parse({ storyNumber: null }));
});

test('updateTaskDataSchema rejects story # below 1', () => {
  assert.throws(() => updateTaskDataSchema.parse({ storyNumber: 0 }));
  assert.throws(() => updateTaskDataSchema.parse({ storyNumber: -3 }));
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
