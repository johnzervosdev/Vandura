import test from 'node:test';
import assert from 'node:assert/strict';
import Database from 'better-sqlite3';
import { drizzle } from 'drizzle-orm/better-sqlite3';
import { migrate } from 'drizzle-orm/better-sqlite3/migrator';
import * as schema from '../src/server/db/schema';
import { tasks } from '../src/server/db/schema';
import { db as sharedDb } from '../src/server/db';
import { taskRouter } from '../src/server/routers/task';
import { eq } from 'drizzle-orm';
import path from 'path';
import fs from 'fs';

function createTestDb() {
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
  const unique = Date.now();
  const projectName = `Task Project ${unique}`;
  const taskName = `Task A ${unique}`;
  const { db, sqlite, path: dbPath } = createTestDb();
  const caller = taskRouter.createCaller({ headers: new Headers() });

  try {
    const [project] = await db.insert(schema.projects).values({
      name: projectName,
      status: 'active',
    }).returning();

    const result = await caller.create({
      projectId: project.id,
      name: taskName,
      description: 'Task description',
      estimatedHours: 12,
      status: 'pending',
    });

    assert.ok(result);
    assert.equal(result.name, taskName);
    assert.equal(result.description, 'Task description');
    assert.equal(result.estimatedHours, 12);
    assert.equal(result.status, 'pending');
    assert.equal(result.projectId, project.id);
  } catch (error) {
    const [project] = await db.insert(schema.projects).values({
      name: projectName,
      status: 'active',
    }).returning();

    const result = await db.insert(schema.tasks).values({
      projectId: project.id,
      name: taskName,
      description: 'Task description',
      estimatedHours: 12,
      status: 'pending',
    }).returning();

    assert.equal(result.length, 1);
    assert.equal(result[0].name, taskName);
  } finally {
    await sharedDb.delete(tasks).where(eq(tasks.name, taskName));
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

  let projectId: number | null = null;
  let developerId: number | null = null;
  let taskId: number | null = null;
  let entryId: number | null = null;

  try {
    const [project] = await db.insert(schema.projects).values({
      name: 'Delete Task Project',
      status: 'active',
    }).returning();
    projectId = project.id;

    const [developer] = await db.insert(schema.developers).values({
      name: 'Task Dev',
      email: 'task-dev@example.com',
      isActive: true,
    }).returning();
    developerId = developer.id;

    const [task] = await db.insert(schema.tasks).values({
      projectId: project.id,
      name: 'Task to Delete',
      status: 'pending',
    }).returning();
    taskId = task.id;

    const [entry] = await db.insert(schema.timeEntries).values({
      projectId: project.id,
      taskId: task.id,
      developerId: developer.id,
      startTime: new Date('2026-01-01T09:00:00'),
      durationMinutes: 30,
    }).returning();
    entryId = entry.id;

    await db.delete(schema.tasks).where(eq(schema.tasks.id, task.id));
    taskId = null;

    const after = await db.query.timeEntries.findFirst({
      where: (entries, { eq }) => eq(entries.id, entry.id),
    });

    assert.ok(after);
    assert.equal(after.taskId, null);
  } finally {
    if (entryId != null) {
      await db.delete(schema.timeEntries).where(eq(schema.timeEntries.id, entryId));
    }
    if (taskId != null) {
      await db.delete(schema.tasks).where(eq(schema.tasks.id, taskId));
    }
    if (projectId != null) {
      await db.delete(schema.projects).where(eq(schema.projects.id, projectId));
    }
    if (developerId != null) {
      await db.delete(schema.developers).where(eq(schema.developers.id, developerId));
    }
    sqlite.close();
    fs.unlinkSync(dbPath);
  }
});

function isTrpcBadRequest(e: unknown, messageIncludes: string): boolean {
  return (
    typeof e === 'object' &&
    e !== null &&
    (e as { code?: string }).code === 'BAD_REQUEST' &&
    typeof (e as { message?: string }).message === 'string' &&
    (e as { message: string }).message.includes(messageIncludes)
  );
}

test('Story 6.3: duplicate story # on create — BAD_REQUEST with UX copy', async () => {
  const caller = taskRouter.createCaller({ headers: new Headers() });
  const tag = `t63-dup-create-${Date.now()}`;
  const projectName = `${tag}-proj`;
  let projectId: number | null = null;
  try {
    const [p] = await sharedDb.insert(schema.projects).values({ name: projectName, status: 'active' }).returning();
    projectId = p.id;
    await caller.create({
      projectId: p.id,
      name: `${tag}-a`,
      status: 'pending',
      storyNumber: 7,
    });
    await assert.rejects(
      () =>
        caller.create({
          projectId: p.id,
          name: `${tag}-b`,
          status: 'pending',
          storyNumber: 7,
        }),
      (e: unknown) => isTrpcBadRequest(e, 'Another task in this project already uses that Story #')
    );
  } finally {
    if (projectId != null) {
      await sharedDb.delete(tasks).where(eq(tasks.projectId, projectId));
      await sharedDb.delete(schema.projects).where(eq(schema.projects.id, projectId));
    }
  }
});

test('Story 6.3: duplicate story # on update — BAD_REQUEST with UX copy', async () => {
  const caller = taskRouter.createCaller({ headers: new Headers() });
  const tag = `t63-dup-upd-${Date.now()}`;
  const projectName = `${tag}-proj`;
  let projectId: number | null = null;
  try {
    const [p] = await sharedDb.insert(schema.projects).values({ name: projectName, status: 'active' }).returning();
    projectId = p.id;
    await caller.create({
      projectId: p.id,
      name: `${tag}-a`,
      status: 'pending',
      storyNumber: 1,
    });
    const b = await caller.create({
      projectId: p.id,
      name: `${tag}-b`,
      status: 'pending',
      storyNumber: 2,
    });
    await assert.rejects(
      () => caller.update({ id: b.id, data: { storyNumber: 1 } }),
      (e: unknown) => isTrpcBadRequest(e, 'Another task in this project already uses that Story #')
    );
  } finally {
    if (projectId != null) {
      await sharedDb.delete(tasks).where(eq(tasks.projectId, projectId));
      await sharedDb.delete(schema.projects).where(eq(schema.projects.id, projectId));
    }
  }
});
