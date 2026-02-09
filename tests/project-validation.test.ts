import test from 'node:test';
import assert from 'node:assert/strict';
import { createProjectSchema } from '../src/lib/validators';

test('createProjectSchema requires name', () => {
  assert.throws(() => createProjectSchema.parse({ status: 'active' }));
});

test('createProjectSchema rejects negative estimated hours', () => {
  assert.throws(() =>
    createProjectSchema.parse({ name: 'QA Project', status: 'active', estimatedHours: -1 })
  );
});

test('createProjectSchema accepts zero or null estimated hours', () => {
  assert.doesNotThrow(() =>
    createProjectSchema.parse({ name: 'QA Project', status: 'active', estimatedHours: 0 })
  );

  assert.doesNotThrow(() =>
    createProjectSchema.parse({ name: 'QA Project', status: 'active' })
  );
});

test('createProjectSchema enforces valid status values', () => {
  assert.doesNotThrow(() =>
    createProjectSchema.parse({ name: 'QA Project', status: 'active' })
  );

  assert.throws(() =>
    createProjectSchema.parse({ name: 'QA Project', status: 'paused' })
  );
});
