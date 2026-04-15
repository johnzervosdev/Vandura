import test from 'node:test';
import assert from 'node:assert/strict';
import { TRPCError } from '@trpc/server';
import {
  GENERIC_DATA_ERROR_MESSAGE,
  sanitizeTrpcShapeForClient,
} from '../src/server/trpc-error-sanitize';

type Shape = Parameters<typeof sanitizeTrpcShapeForClient>[0];

function shape(overrides: Partial<Shape> & { data?: Partial<Shape['data']> }): Shape {
  const base: Shape = {
    message: 'fallback',
    code: 500,
    data: {
      code: 'INTERNAL_SERVER_ERROR',
      httpStatus: 500,
      path: 'unit.test',
      zodError: null,
      stack: 'internal stack trace',
    },
  };
  return {
    ...base,
    ...overrides,
    data: { ...base.data, ...overrides.data },
  };
}

/** tRPC sanitize reads `process.env.NODE_ENV`; cast env for test-time mutation. */
function withNodeEnv<T>(next: string, fn: () => T): T {
  const env = process.env as Record<string, string | undefined>;
  const prev = env.NODE_ENV;
  env.NODE_ENV = next;
  try {
    return fn();
  } finally {
    if (prev === undefined) {
      delete env.NODE_ENV;
    } else {
      env.NODE_ENV = prev;
    }
  }
}

test('sanitize: development leaves unsafe INTERNAL messages unchanged', () => {
  const s = shape({
    message: 'Error at src/server/routers/foo.ts:99',
    data: { code: 'INTERNAL_SERVER_ERROR' },
  });
  const out = withNodeEnv('development', () => sanitizeTrpcShapeForClient(s, new Error('x')));
  assert.equal(out.message, s.message);
  assert.ok(out.data.stack);
});

test('sanitize: production maps unsafe INTERNAL message to generic copy and strips stack', () => {
  const s = shape({
    message: 'Error at src/server/routers/foo.ts:99',
    data: { code: 'INTERNAL_SERVER_ERROR', stack: 'secret' },
  });
  const out = withNodeEnv('production', () => sanitizeTrpcShapeForClient(s, new Error('x')));
  assert.equal(out.message, GENERIC_DATA_ERROR_MESSAGE);
  assert.equal(out.data.stack, undefined);
  assert.equal(out.data.code, 'INTERNAL_SERVER_ERROR');
  assert.equal(out.data.path, 'unit.test');
});

test('sanitize: production keeps safe INTERNAL_SERVER_ERROR user messages', () => {
  const s = shape({
    message: 'Nothing matched that filter.',
    data: { code: 'INTERNAL_SERVER_ERROR' },
  });
  const out = withNodeEnv('production', () => sanitizeTrpcShapeForClient(s, new Error('x')));
  assert.equal(out.message, 'Nothing matched that filter.');
});

test('sanitize: production keeps BAD_REQUEST + zodError (validation) shape', () => {
  const zod = { fieldErrors: { name: ['Required'] } };
  const s = shape({
    message: 'Invalid input',
    code: 400,
    data: {
      code: 'BAD_REQUEST',
      httpStatus: 400,
      zodError: zod,
      stack: 'should be removed only when sanitizing',
    },
  });
  const out = withNodeEnv('production', () => sanitizeTrpcShapeForClient(s, new Error('x')));
  assert.equal(out.message, 'Invalid input');
  assert.deepEqual(out.data.zodError, zod);
});

test('sanitize: production sanitizes when TRPCError cause looks like SQLite', () => {
  const cause = { name: 'SqliteError', message: 'SQLITE_BUSY' };
  const err = new TRPCError({
    code: 'INTERNAL_SERVER_ERROR',
    message: 'wrapper',
    cause,
  });
  const s = shape({
    message: 'SQLITE_BUSY: database is locked',
    data: { code: 'INTERNAL_SERVER_ERROR' },
  });
  const out = withNodeEnv('production', () => sanitizeTrpcShapeForClient(s, err));
  assert.equal(out.message, GENERIC_DATA_ERROR_MESSAGE);
  assert.equal(out.data.stack, undefined);
});

test('sanitize: production sanitizes plain cause with SQLITE_ in message', () => {
  const err = Object.assign(new Error('fail'), { cause: { message: 'SQLITE_CORRUPT' } });
  const s = shape({ message: 'leaky', data: { code: 'INTERNAL_SERVER_ERROR' } });
  const out = withNodeEnv('production', () => sanitizeTrpcShapeForClient(s, err));
  assert.equal(out.message, GENERIC_DATA_ERROR_MESSAGE);
});
