import test from 'node:test';
import assert from 'node:assert/strict';
import Database from 'better-sqlite3';
import { drizzle } from 'drizzle-orm/better-sqlite3';
import { migrate } from 'drizzle-orm/better-sqlite3/migrator';
import * as schema from '../src/server/db/schema';
import { tasks } from '../src/server/db/schema';
import { eq } from 'drizzle-orm';
import { taskListOrderBy } from '../src/lib/task-list-sort';
import path from 'path';
import fs from 'fs';

function createTestDb() {
  const testDbPath = path.join(__dirname, `task-sort-test-${Date.now()}.db`);
  const sqlite = new Database(testDbPath);
  sqlite.pragma('journal_mode = WAL');
  sqlite.pragma('foreign_keys = ON');
  const db = drizzle(sqlite, { schema });

  migrate(db, {
    migrationsFolder: path.join(process.cwd(), 'src/server/db/migrations'),
  });

  return { db, sqlite, path: testDbPath };
}

test('Story 6.3: status asc follows pipeline order', async () => {
  const { db, sqlite, path: dbPath } = createTestDb();
  try {
    const [p] = await db.insert(schema.projects).values({ name: 'Sort Project', status: 'active' }).returning();
    await db.insert(tasks).values([
      { projectId: p.id, name: 'c', status: 'completed' },
      { projectId: p.id, name: 'p', status: 'pending' },
      { projectId: p.id, name: 'b', status: 'blocked' },
      { projectId: p.id, name: 'i', status: 'in-progress' },
    ]);
    const rows = await db
      .select()
      .from(tasks)
      .where(eq(tasks.projectId, p.id))
      .orderBy(...taskListOrderBy('status', 'asc'));
    assert.deepEqual(rows.map((r) => r.status), ['pending', 'in-progress', 'blocked', 'completed']);
  } finally {
    sqlite.close();
    fs.unlinkSync(dbPath);
  }
});

test('Story 6.3: status desc reverses pipeline order', async () => {
  const { db, sqlite, path: dbPath } = createTestDb();
  try {
    const [p] = await db.insert(schema.projects).values({ name: 'Sort Project 2', status: 'active' }).returning();
    await db.insert(tasks).values([
      { projectId: p.id, name: 'p', status: 'pending' },
      { projectId: p.id, name: 'i', status: 'in-progress' },
    ]);
    const rows = await db
      .select()
      .from(tasks)
      .where(eq(tasks.projectId, p.id))
      .orderBy(...taskListOrderBy('status', 'desc'));
    assert.deepEqual(rows.map((r) => r.status), ['in-progress', 'pending']);
  } finally {
    sqlite.close();
    fs.unlinkSync(dbPath);
  }
});

test('Story 6.3: story_number asc — numbered first, nulls last, id tie-break', async () => {
  const { db, sqlite, path: dbPath } = createTestDb();
  try {
    const [p] = await db.insert(schema.projects).values({ name: 'SN Project', status: 'active' }).returning();
    await db.insert(tasks).values([
      { projectId: p.id, name: 'mid', storyNumber: 2, status: 'pending' },
      { projectId: p.id, name: 'nonum', storyNumber: null, status: 'pending' },
      { projectId: p.id, name: 'first', storyNumber: 1, status: 'pending' },
    ]);
    const rows = await db
      .select()
      .from(tasks)
      .where(eq(tasks.projectId, p.id))
      .orderBy(...taskListOrderBy('story_number', 'asc'));
    assert.deepEqual(
      rows.map((r) => r.name),
      ['first', 'mid', 'nonum']
    );
  } finally {
    sqlite.close();
    fs.unlinkSync(dbPath);
  }
});

test('Story 6.3: partial unique index blocks duplicate story # per project', async () => {
  const { db, sqlite, path: dbPath } = createTestDb();
  try {
    const [p] = await db.insert(schema.projects).values({ name: 'Dup Project', status: 'active' }).returning();
    await db.insert(tasks).values({
      projectId: p.id,
      name: 'Task one',
      storyNumber: 99,
      status: 'pending',
    });
    await assert.rejects(
      async () => {
        await db.insert(tasks).values({
          projectId: p.id,
          name: 'Task two',
          storyNumber: 99,
          status: 'pending',
        });
      },
      (err: unknown) =>
        err instanceof Error &&
        (err.message.includes('UNIQUE constraint failed') ||
          err.message.includes('tasks_project_id_story_number_uidx'))
    );
  } finally {
    sqlite.close();
    fs.unlinkSync(dbPath);
  }
});

test('Story 6.3: same story # on different projects allowed', async () => {
  const { db, sqlite, path: dbPath } = createTestDb();
  try {
    const [p1, p2] = await db.insert(schema.projects).values([
      { name: 'P1', status: 'active' },
      { name: 'P2', status: 'active' },
    ]).returning();
    await db.insert(tasks).values([
      { projectId: p1.id, name: 'a', storyNumber: 5, status: 'pending' },
      { projectId: p2.id, name: 'b', storyNumber: 5, status: 'pending' },
    ]);
    const rows = await db.select().from(tasks);
    assert.equal(rows.length, 2);
  } finally {
    sqlite.close();
    fs.unlinkSync(dbPath);
  }
});

test('Story 6.3: name asc + id tie-break', async () => {
  const { db, sqlite, path: dbPath } = createTestDb();
  try {
    const [p] = await db.insert(schema.projects).values({ name: 'Name Sort', status: 'active' }).returning();
    await db.insert(tasks).values([
      { projectId: p.id, name: 'Charlie', status: 'pending' },
      { projectId: p.id, name: 'Alpha', status: 'pending' },
      { projectId: p.id, name: 'Bravo', status: 'pending' },
    ]);
    const rows = await db
      .select()
      .from(tasks)
      .where(eq(tasks.projectId, p.id))
      .orderBy(...taskListOrderBy('name', 'asc'));
    assert.deepEqual(
      rows.map((r) => r.name),
      ['Alpha', 'Bravo', 'Charlie']
    );
  } finally {
    sqlite.close();
    fs.unlinkSync(dbPath);
  }
});

test('Story 6.3: estimated_hours asc — values first, nulls last', async () => {
  const { db, sqlite, path: dbPath } = createTestDb();
  try {
    const [p] = await db.insert(schema.projects).values({ name: 'Est Sort', status: 'active' }).returning();
    await db.insert(tasks).values([
      { projectId: p.id, name: 'null-est', estimatedHours: null, status: 'pending' },
      { projectId: p.id, name: 'five', estimatedHours: 5, status: 'pending' },
      { projectId: p.id, name: 'two', estimatedHours: 2, status: 'pending' },
    ]);
    const rows = await db
      .select()
      .from(tasks)
      .where(eq(tasks.projectId, p.id))
      .orderBy(...taskListOrderBy('estimated_hours', 'asc'));
    assert.deepEqual(
      rows.map((r) => r.name),
      ['two', 'five', 'null-est']
    );
  } finally {
    sqlite.close();
    fs.unlinkSync(dbPath);
  }
});

test('Story 6.3: story_number desc — high numbers first, nulls last', async () => {
  const { db, sqlite, path: dbPath } = createTestDb();
  try {
    const [p] = await db.insert(schema.projects).values({ name: 'SN Desc', status: 'active' }).returning();
    await db.insert(tasks).values([
      { projectId: p.id, name: 'nonum', storyNumber: null, status: 'pending' },
      { projectId: p.id, name: 'low', storyNumber: 1, status: 'pending' },
      { projectId: p.id, name: 'high', storyNumber: 10, status: 'pending' },
    ]);
    const rows = await db
      .select()
      .from(tasks)
      .where(eq(tasks.projectId, p.id))
      .orderBy(...taskListOrderBy('story_number', 'desc'));
    assert.deepEqual(
      rows.map((r) => r.name),
      ['high', 'low', 'nonum']
    );
  } finally {
    sqlite.close();
    fs.unlinkSync(dbPath);
  }
});
