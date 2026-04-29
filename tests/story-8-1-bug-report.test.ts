import test from 'node:test';
import assert from 'node:assert/strict';
import { bugReports } from '../src/server/db/schema';
import { db as sharedDb } from '../src/server/db';
import { bugReportRouter } from '../src/server/routers/bugReport';
import { createBugReportSchema, closeBugReportSchema } from '../src/lib/validators';
import { eq, inArray } from 'drizzle-orm';

test('Story 8.1: bugReport create → listOpen → close', async () => {
  const caller = bugReportRouter.createCaller({ headers: new Headers() });
  const unique = `BugReport Test ${Date.now()}`;
  let id = 0;
  try {
    const created = await caller.create({
      title: unique,
      description: 'Steps: click FAB, submit.',
      pagePath: '/projects',
    });
    assert.ok(created.id);
    assert.equal(created.status, 'open');
    id = created.id;

    const open = await caller.listOpen();
    const row = open.find((r) => r.id === id);
    assert.ok(row);
    assert.equal(row!.title, unique);
    assert.equal(row!.pagePath, '/projects');

    const closed = await caller.close({ id, closeNote: 'verified in test' });
    assert.equal(closed.status, 'closed');
    assert.ok(closed.closedAt);

    const open2 = await caller.listOpen();
    assert.ok(!open2.some((r) => r.id === id));
  } finally {
    await sharedDb.delete(bugReports).where(eq(bugReports.title, unique));
  }
});

test('Story 8.1: close missing id throws', async () => {
  const caller = bugReportRouter.createCaller({ headers: new Headers() });
  await assert.rejects(() => caller.close({ id: 999999999, closeNote: undefined }), /not found/);
});

test('Story 8.1: createBugReportSchema rejects empty title and description', () => {
  assert.equal(createBugReportSchema.safeParse({ title: '', description: 'ok' }).success, false);
  assert.equal(createBugReportSchema.safeParse({ title: 'ok', description: '' }).success, false);
});

test('Story 8.1: createBugReportSchema enforces max lengths', () => {
  assert.equal(
    createBugReportSchema.safeParse({ title: 'x'.repeat(201), description: 'y' }).success,
    false
  );
  assert.equal(
    createBugReportSchema.safeParse({ title: 't', description: 'z'.repeat(8001) }).success,
    false
  );
});

test('Story 8.1: closeBugReportSchema rejects non-positive id', () => {
  assert.equal(closeBugReportSchema.safeParse({ id: 0 }).success, false);
  assert.equal(closeBugReportSchema.safeParse({ id: -1 }).success, false);
});

test('Story 8.1: closeBugReportSchema enforces closeNote max length', () => {
  assert.equal(
    closeBugReportSchema.safeParse({ id: 1, closeNote: 'n'.repeat(2001) }).success,
    false
  );
});

test('Story 8.1: create trims title and description; pagePath optional → null', async () => {
  const caller = bugReportRouter.createCaller({ headers: new Headers() });
  const unique = `Trim Test ${Date.now()}`;
  let id = 0;
  try {
    const created = await caller.create({
      title: `  ${unique}  `,
      description: '  body  ',
    });
    id = created.id;
    assert.equal(created.title, unique);
    assert.equal(created.description, 'body');
    assert.equal(created.pagePath, null);
  } finally {
    if (id) await sharedDb.delete(bugReports).where(eq(bugReports.id, id));
  }
});

test('Story 8.1: close without closeNote stores null closeNote', async () => {
  const caller = bugReportRouter.createCaller({ headers: new Headers() });
  const unique = `NoNote ${Date.now()}`;
  let id = 0;
  try {
    const created = await caller.create({
      title: unique,
      description: 'd',
    });
    id = created.id;
    const closed = await caller.close({ id, closeNote: undefined });
    assert.equal(closed.closeNote, null);
  } finally {
    if (id) await sharedDb.delete(bugReports).where(eq(bugReports.id, id));
  }
});

test('Story 8.1: close twice throws (already closed)', async () => {
  const caller = bugReportRouter.createCaller({ headers: new Headers() });
  const unique = `DoubleClose ${Date.now()}`;
  let id = 0;
  try {
    const created = await caller.create({ title: unique, description: 'd' });
    id = created.id;
    await caller.close({ id, closeNote: 'first' });
    await assert.rejects(() => caller.close({ id, closeNote: 'second' }), /not found|already closed/i);
  } finally {
    if (id) await sharedDb.delete(bugReports).where(eq(bugReports.id, id));
  }
});

test('Story 8.1: listOpen orders newest createdAt first', async () => {
  const caller = bugReportRouter.createCaller({ headers: new Headers() });
  const tag = `Order-${Date.now()}`;
  const inserted = await sharedDb
    .insert(bugReports)
    .values([
      {
        title: `${tag}-older`,
        description: 'a',
        status: 'open',
        createdAt: new Date('2019-06-01T12:00:00Z'),
        pagePath: null,
      },
      {
        title: `${tag}-newer`,
        description: 'b',
        status: 'open',
        createdAt: new Date('2024-06-01T12:00:00Z'),
        pagePath: null,
      },
    ])
    .returning();
  const ids = inserted.map((r) => r.id);
  try {
    const open = await caller.listOpen();
    const idxNewer = open.findIndex((r) => r.title === `${tag}-newer`);
    const idxOlder = open.findIndex((r) => r.title === `${tag}-older`);
    assert.ok(idxNewer >= 0 && idxOlder >= 0);
    assert.ok(idxNewer < idxOlder, 'newer createdAt should sort before older');
  } finally {
    await sharedDb.delete(bugReports).where(inArray(bugReports.id, ids));
  }
});
