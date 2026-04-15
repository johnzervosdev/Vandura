import test from 'node:test';
import assert from 'node:assert/strict';
import { MutationObserver } from '@tanstack/react-query';
import { TRPCClientError } from '@trpc/client';
import { createAppQueryClient } from '../src/lib/create-app-query-client';
import { getApiErrorMessage } from '../src/lib/api-error-message';
import { emitGlobalToast, setGlobalToastHandler } from '../src/lib/global-toast-dispatcher';

test.afterEach(() => {
  setGlobalToastHandler(null);
});

test('getApiErrorMessage prefers TRPCClientError message', () => {
  const err = new TRPCClientError('Server rejected the request');
  assert.equal(getApiErrorMessage(err), 'Server rejected the request');
});

test('getApiErrorMessage falls back to Error message', () => {
  assert.equal(getApiErrorMessage(new Error('network down')), 'network down');
});

test('getApiErrorMessage returns default for unknown empty input', () => {
  assert.equal(getApiErrorMessage(null), 'Something went wrong. Please try again.');
  assert.equal(getApiErrorMessage({}), 'Something went wrong. Please try again.');
});

test('Story 5.1: query fetchQuery failure with suppressGlobalError does not emit toast', async () => {
  const toasts: string[] = [];
  setGlobalToastHandler((m) => toasts.push(m));
  const qc = createAppQueryClient();
  try {
    await qc.fetchQuery({
      queryKey: ['story-5-1', 'suppress-query'],
      queryFn: async () => {
        throw new Error('should-not-toast');
      },
      retry: false,
      meta: { suppressGlobalError: true },
    });
  } catch {
    // expected
  }
  assert.deepEqual(toasts, []);
});

test('Story 5.1: query fetchQuery failure without meta emits global toast', async () => {
  const toasts: string[] = [];
  setGlobalToastHandler((m) => toasts.push(m));
  const qc = createAppQueryClient();
  try {
    await qc.fetchQuery({
      queryKey: ['story-5-1', 'toast-query'],
      queryFn: async () => {
        throw new Error('visible-query-failure');
      },
      retry: false,
    });
  } catch {
    // expected
  }
  assert.equal(toasts.length, 1);
  assert.match(toasts[0]!, /visible-query-failure/);
});

test('Story 5.1: mutation with suppressGlobalToast does not emit', async () => {
  const toasts: string[] = [];
  setGlobalToastHandler((m) => toasts.push(m));
  const qc = createAppQueryClient();
  const obs = new MutationObserver(qc, {
    mutationKey: ['story-5-1', 'suppress-mutation'],
    mutationFn: async () => {
      throw new Error('modal-handled');
    },
    meta: { suppressGlobalToast: true },
  });
  try {
    await obs.mutate(undefined);
  } catch {
    // expected
  }
  assert.deepEqual(toasts, []);
});

test('Story 5.1: mutation without suppress emits global toast', async () => {
  const toasts: string[] = [];
  setGlobalToastHandler((m) => toasts.push(m));
  const qc = createAppQueryClient();
  const obs = new MutationObserver(qc, {
    mutationKey: ['story-5-1', 'toast-mutation'],
    mutationFn: async () => {
      throw new Error('row-action-failure');
    },
  });
  try {
    await obs.mutate(undefined);
  } catch {
    // expected
  }
  assert.equal(toasts.length, 1);
  assert.match(toasts[0]!, /row-action-failure/);
});

test('Story 5.1: emitGlobalToast dedupes identical messages within 3s', async () => {
  const toasts: string[] = [];
  setGlobalToastHandler((m) => toasts.push(m));
  const qc = createAppQueryClient();
  for (let i = 0; i < 2; i++) {
    try {
      await qc.fetchQuery({
        queryKey: ['story-5-1', 'dedupe', i],
        queryFn: async () => {
          throw new Error('identical-dedupe-text');
        },
        retry: false,
      });
    } catch {
      // expected
    }
  }
  assert.equal(toasts.length, 1, 'two identical failures within 3s should produce one toast');
});
