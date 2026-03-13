import test from 'node:test';
import assert from 'node:assert/strict';
import { reportRouter } from '../src/server/routers/report';

test('projectsSummary should load without SQL alias errors', async () => {
  const caller = reportRouter.createCaller({ headers: new Headers() });
  await assert.doesNotReject(async () => {
    await caller.projectsSummary();
  });
});
