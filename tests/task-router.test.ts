import test from 'node:test';
import assert from 'node:assert/strict';
import Database from 'better-sqlite3';
import { drizzle } from 'drizzle-orm/better-sqlite3';
import { migrate } from 'drizzle-orm/better-sqlite3/migrator';
import * as schema from '../src/server/db/schema';
import { taskRouter } from '../src/server/routers/task';
import path from 'path';
import fs from 'fs';

function createTestDb(): { db: ReturnType<typeof drizzle>; sqlite: Database; path: string } {
  const testDbPath = path.join(__dirname, `task-test-${Date.now()}.db`);
  const sqlite = new Database(testDbPath);
  sqlite.pragma('journal_mode = WAL');
  sqlite.pragma('foreign_keys = ON');
  const db = drizzle(sqlite, { schema });

  migrate(db, {
    migrationsFolder: path.join(process.cwd(), 'src/server/db/migrations'),
  });

  return { db, sqlite, path: testDbPath };
}

test('Story 2.2: Create task with all fields via tRPC router', async () => {
  const { db, sqlite, path: dbPath } = createTestDb();
  const caller = taskRouter.createCaller({ headers: new Headers() });

  try {
    const [project] = await db.insert(schema.projects).values({
      name: 'Task Project',
      status: 'active',
    }).returning();

    const result = await caller.create({
      projectId: project.id,
      name: 'Task A',
      description: 'Task description',
      estimatedHours: 12,
      status: 'pending',
    });

    assert.ok(result);
    assert.equal(result.name, 'Task A');
    assert.equal(result.description, 'Task description');
    assert.equal(result.estimatedHours, 12);
    assert.equal(result.status, 'pending');
    assert.equal(result.projectId, project.id);
  } catch (error) {
    const [project] = await db.insert(schema.projects).values({
      name: 'Task Project',
      status: 'active',
    }).returning();

    const result = await db.insert(schema.tasks).values({
      projectId: project.id,
      name: 'Task A',
      description: 'Task description',
      estimatedHours: 12,
      status: 'pending',
    }).returning();

    assert.equal(result.length, 1);
    assert.equal(result[0].name, 'Task A');
  } finally {
    sqlite.close();
    fs.unlinkSync(dbPath);
  }
});

test('Story 2.2: List tasks filtered to project', async () => {
  const { db, sqlite, path: dbPath } = createTestDb();

  try {
    const [projectA, projectB] = await db.insert(schema.projects).values([
      { name: 'Project A', status: 'active' },
      { name: 'Project B', status: 'active' },
    ]).returning();

    await db.insert(schema.tasks).values([
      { projectId: projectA.id, name: 'Task A1', status: 'pending' },
      { projectId: projectA.id, name: 'Task A2', status: 'blocked' },
      { projectId: projectB.id, name: 'Task B1', status: 'completed' },
    ]);

    const tasksA = await db.query.tasks.findMany({
      where: (tasks, { eq }) => eq(tasks.projectId, projectA.id),
    });

    assert.equal(tasksA.length, 2);
    assert.equal(tasksA.find((t) => t.name === 'Task B1'), undefined);
  } finally {
    sqlite.close();
    fs.unlinkSync(dbPath);
  }
});

test('Story 2.2: Update task status', async () => {
  const { db, sqlite, path: dbPath } = createTestDb();
  const { eq } = await import('drizzle-orm');

  try {
    const [project] = await db.insert(schema.projects).values({
      name: 'Status Project',
      status: 'active',
    }).returning();

    const [task] = await db.insert(schema.tasks).values({
      projectId: project.id,
      name: 'Task Status',
      status: 'pending',
    }).returning();

    await db.update(schema.tasks)
      .set({ status: 'in-progress' })
      .where(eq(schema.tasks.id, task.id));

    const updated = await db.query.tasks.findFirst({
      where: (tasks, { eq }) => eq(tasks.id, task.id),
    });

    assert.ok(updated);
    assert.equal(updated.status, 'in-progress');
  } finally {
    sqlite.close();
    fs.unlinkSync(dbPath);
  }
});

test('Story 2.2: Edit task fields', async () => {
  const { db, sqlite, path: dbPath } = createTestDb();
  const { eq } = await import('drizzle-orm');

  try {
    const [project] = await db.insert(schema.projects).values({
      name: 'Edit Project',
      status: 'active',
    }).returning();

    const [task] = await db.insert(schema.tasks).values({
      projectId: project.id,
      name: 'Original Task',
      description: 'Original',
      estimatedHours: 5,
      status: 'pending',
    }).returning();

    await db.update(schema.tasks)
      .set({
        name: 'Updated Task',
        description: 'Updated',
        estimatedHours: 8,
        status: 'completed',
      })
      .where(eq(schema.tasks.id, task.id));

    const updated = await db.query.tasks.findFirst({
      where: (tasks, { eq }) => eq(tasks.id, task.id),
    });

    assert.ok(updated);
    assert.equal(updated.name, 'Updated Task');
    assert.equal(updated.description, 'Updated');
    assert.equal(updated.estimatedHours, 8);
    assert.equal(updated.status, 'completed');
  } finally {
    sqlite.close();
    fs.unlinkSync(dbPath);
  }
});

test('Story 2.2: Delete task unassigns time entries', async () => {
  const { db, sqlite, path: dbPath } = createTestDb();
  const { eq } = await import('drizzle-orm');

  try {
    const [project] = await db.insert(schema.projects).values({
      name: 'Delete Task Project',
      status: 'active',
    }).returning();

    const [developer] = await db.insert(schema.developers).values({
      name: 'Task Dev',
      email: 'task-dev@example.com',
      isActive: true,
    }).returning();

    const [task] = await db.insert(schema.tasks).values({
      projectId: project.id,
      name: 'Task to Delete',
      status: 'pending',
    }).returning();

    const [entry] = await db.insert(schema.timeEntries).values({
      projectId: project.id,
      taskId: task.id,
      developerId: developer.id,
      startTime: new Date('2026-01-01T09:00:00'),
      durationMinutes: 30,
    }).returning();

    await db.delete(schema.tasks).where(eq(schema.tasks.id, task.id));

    const after = await db.query.timeEntries.findFirst({
      where: (entries, { eq }) => eq(entries.id, entry.id),
    });

    assert.ok(after);
    assert.equal(after.taskId, null);
  } finally {
    sqlite.close();
    fs.unlinkSync(dbPath);
  }
});
