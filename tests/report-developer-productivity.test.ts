import test from 'node:test';
import assert from 'node:assert/strict';
import { eq, inArray } from 'drizzle-orm';
import { reportRouter } from '../src/server/routers/report';
import { reportService } from '../src/server/services/ReportService';
import { db } from '../src/server/db';
import { developers, projects, tasks, timeEntries } from '../src/server/db/schema';
import { endOfDay, startOfDay } from '../src/lib/date-utils';

test('developerProductivity query should not throw', async () => {
  const caller = reportRouter.createCaller({ headers: new Headers() });
  await assert.doesNotReject(async () => {
    const rows = await caller.developerProductivity({});
    assert.ok(Array.isArray(rows));
  });
});

test('Story 4.3: getDeveloperProductivity omits inactive developers from the default list', async () => {
  const tag = `p43-${Date.now()}`;
  const entryIds: number[] = [];
  let projectId: number | null = null;
  let taskId: number | null = null;
  let activeId: number | null = null;
  let inactiveId: number | null = null;

  try {
    const [active] = await db
      .insert(developers)
      .values({
        name: `${tag}-active`,
        email: `${tag}-a@example.test`,
        isActive: true,
      })
      .returning();
    const [inactive] = await db
      .insert(developers)
      .values({
        name: `${tag}-inactive`,
        email: `${tag}-i@example.test`,
        isActive: false,
      })
      .returning();
    activeId = active.id;
    inactiveId = inactive.id;

    const [project] = await db
      .insert(projects)
      .values({ name: `${tag}-proj`, status: 'active' })
      .returning();
    projectId = project.id;

    const [task] = await db
      .insert(tasks)
      .values({ projectId, name: `${tag}-task`, status: 'pending' })
      .returning();
    taskId = task.id;

    const base = new Date(2034, 6, 1, 10, 0, 0);
    const inserted = await db
      .insert(timeEntries)
      .values([
        {
          projectId,
          taskId,
          developerId: activeId,
          startTime: base,
          durationMinutes: 15,
        },
        {
          projectId,
          taskId,
          developerId: inactiveId,
          startTime: base,
          durationMinutes: 15,
        },
      ])
      .returning();
    entryIds.push(...inserted.map((e) => e.id));

    const rows = await reportService.getDeveloperProductivity(undefined, undefined, undefined);
    assert.ok(!rows.some((r) => r.developerId === inactiveId), 'inactive developer must not appear');
    const activeRow = rows.find((r) => r.developerId === activeId);
    assert.ok(activeRow, 'active developer must appear');
    assert.equal(activeRow.entriesCount >= 1, true);
  } finally {
    if (entryIds.length) await db.delete(timeEntries).where(inArray(timeEntries.id, entryIds));
    if (taskId) await db.delete(tasks).where(eq(tasks.id, taskId));
    if (projectId) await db.delete(projects).where(eq(projects.id, projectId));
    if (activeId) await db.delete(developers).where(eq(developers.id, activeId));
    if (inactiveId) await db.delete(developers).where(eq(developers.id, inactiveId));
  }
});

test('Story 4.3: date filter includes start/end of day (inclusive)', async () => {
  const tag = `p43-${Date.now()}`;
  const entryIds: number[] = [];
  let projectId: number | null = null;
  let devId: number | null = null;

  try {
    const [dev] = await db
      .insert(developers)
      .values({ name: `${tag}-d`, email: `${tag}@example.test`, isActive: true })
      .returning();
    devId = dev.id;

    const [project] = await db
      .insert(projects)
      .values({ name: `${tag}-proj`, status: 'active' })
      .returning();
    projectId = project.id;

    const day = new Date(2035, 2, 20);
    const before = new Date(2035, 2, 19, 12, 0, 0);
    const insideMorning = new Date(2035, 2, 20, 9, 0, 0);
    const insideLate = new Date(2035, 2, 20, 23, 58, 0);

    const inserted = await db
      .insert(timeEntries)
      .values([
        {
          projectId,
          developerId: devId,
          startTime: before,
          durationMinutes: 15,
        },
        {
          projectId,
          developerId: devId,
          startTime: insideMorning,
          durationMinutes: 15,
        },
        {
          projectId,
          developerId: devId,
          startTime: insideLate,
          durationMinutes: 15,
        },
      ])
      .returning();
    entryIds.push(...inserted.map((e) => e.id));

    const rows = await reportService.getDeveloperProductivity(devId, day, day);
    assert.equal(rows.length, 1);
    assert.equal(rows[0].entriesCount, 2);
    assert.equal(rows[0].totalHours, 0.5);
  } finally {
    if (entryIds.length) await db.delete(timeEntries).where(inArray(timeEntries.id, entryIds));
    if (projectId) await db.delete(projects).where(eq(projects.id, projectId));
    if (devId) await db.delete(developers).where(eq(developers.id, devId));
  }
});

test('Story 4.3: metrics — distinct projects/tasks, entriesCount, avg hours per active day', async () => {
  const tag = `p43-${Date.now()}`;
  const entryIds: number[] = [];
  let projectA: number | null = null;
  let projectB: number | null = null;
  let taskA: number | null = null;
  let taskB: number | null = null;
  let devId: number | null = null;

  try {
    const [dev] = await db
      .insert(developers)
      .values({ name: `${tag}-d`, email: `${tag}@example.test`, isActive: true })
      .returning();
    devId = dev.id;

    const [pa, pb] = await db
      .insert(projects)
      .values([
        { name: `${tag}-A`, status: 'active' },
        { name: `${tag}-B`, status: 'active' },
      ])
      .returning();
    projectA = pa.id;
    projectB = pb.id;

    const [ta, tb] = await db
      .insert(tasks)
      .values([
        { projectId: projectA, name: `${tag}-t1`, status: 'pending' },
        { projectId: projectB, name: `${tag}-t2`, status: 'pending' },
      ])
      .returning();
    taskA = ta.id;
    taskB = tb.id;

    const d1 = new Date(2036, 4, 1, 10, 0, 0);
    const d2 = new Date(2036, 4, 2, 11, 0, 0);

    const inserted = await db
      .insert(timeEntries)
      .values([
        { projectId: projectA, taskId: taskA, developerId: devId, startTime: d1, durationMinutes: 60 },
        { projectId: projectA, taskId: taskA, developerId: devId, startTime: d1, durationMinutes: 60 },
        { projectId: projectB, taskId: taskB, developerId: devId, startTime: d2, durationMinutes: 60 },
      ])
      .returning();
    entryIds.push(...inserted.map((e) => e.id));

    const start = startOfDay(d1);
    const end = endOfDay(d2);
    const rows = await reportService.getDeveloperProductivity(devId, start, end);
    assert.equal(rows.length, 1);
    const r = rows[0];
    assert.equal(r.totalHours, 3);
    assert.equal(r.projectCount, 2);
    assert.equal(r.taskCount, 2);
    assert.equal(r.entriesCount, 3);
    assert.equal(r.averageHoursPerDay, 1.5);
  } finally {
    if (entryIds.length) await db.delete(timeEntries).where(inArray(timeEntries.id, entryIds));
    if (taskA) await db.delete(tasks).where(eq(tasks.id, taskA));
    if (taskB) await db.delete(tasks).where(eq(tasks.id, taskB));
    if (projectA) await db.delete(projects).where(eq(projects.id, projectA));
    if (projectB) await db.delete(projects).where(eq(projects.id, projectB));
    if (devId) await db.delete(developers).where(eq(developers.id, devId));
  }
});

test('Story 4.3: taskCount ignores null taskId; zero entries in range still returns a row for active dev', async () => {
  const tag = `p43-${Date.now()}`;
  const entryIds: number[] = [];
  let projectId: number | null = null;
  let devId: number | null = null;

  try {
    const [dev] = await db
      .insert(developers)
      .values({ name: `${tag}-d`, email: `${tag}@example.test`, isActive: true })
      .returning();
    devId = dev.id;

    const [project] = await db
      .insert(projects)
      .values({ name: `${tag}-proj`, status: 'active' })
      .returning();
    projectId = project.id;

    const inRange = new Date(2037, 0, 5, 9, 0, 0);
    const [e1] = await db
      .insert(timeEntries)
      .values({
        projectId,
        taskId: null,
        developerId: devId,
        startTime: inRange,
        durationMinutes: 15,
      })
      .returning();
    entryIds.push(e1.id);

    const narrow = await reportService.getDeveloperProductivity(devId, inRange, inRange);
    assert.equal(narrow[0].taskCount, 0);
    assert.equal(narrow[0].entriesCount, 1);

    const emptyRangeStart = new Date(2040, 0, 1);
    const emptyRangeEnd = new Date(2040, 0, 31);
    const empty = await reportService.getDeveloperProductivity(devId, emptyRangeStart, emptyRangeEnd);
    assert.equal(empty.length, 1);
    assert.equal(empty[0].totalHours, 0);
    assert.equal(empty[0].entriesCount, 0);
    assert.equal(empty[0].averageHoursPerDay, 0);
  } finally {
    if (entryIds.length) await db.delete(timeEntries).where(inArray(timeEntries.id, entryIds));
    if (projectId) await db.delete(projects).where(eq(projects.id, projectId));
    if (devId) await db.delete(developers).where(eq(developers.id, devId));
  }
});

test('Story 4.3: tRPC developerProductivity forwards dates and developerId', async () => {
  const tag = `p43-${Date.now()}`;
  const entryIds: number[] = [];
  let projectId: number | null = null;
  let taskId: number | null = null;
  let devId: number | null = null;

  try {
    const [dev] = await db
      .insert(developers)
      .values({ name: `${tag}-d`, email: `${tag}@example.test`, isActive: true })
      .returning();
    devId = dev.id;

    const [project] = await db
      .insert(projects)
      .values({ name: `${tag}-proj`, status: 'active' })
      .returning();
    projectId = project.id;

    const [task] = await db
      .insert(tasks)
      .values({ projectId, name: `${tag}-t`, status: 'pending' })
      .returning();
    taskId = task.id;

    const st = new Date(2038, 7, 10, 14, 0, 0);
    const [e] = await db
      .insert(timeEntries)
      .values({
        projectId,
        taskId,
        developerId: devId,
        startTime: st,
        durationMinutes: 30,
      })
      .returning();
    entryIds.push(e.id);

    const caller = reportRouter.createCaller({ headers: new Headers() });
    const day = new Date(2038, 7, 10);
    const rows = await caller.developerProductivity({
      developerId: devId,
      startDate: day,
      endDate: day,
    });

    assert.equal(rows.length, 1);
    assert.equal(rows[0].developerId, devId);
    assert.equal(rows[0].entriesCount, 1);
    assert.equal(rows[0].totalHours, 0.5);
  } finally {
    if (entryIds.length) await db.delete(timeEntries).where(inArray(timeEntries.id, entryIds));
    if (taskId) await db.delete(tasks).where(eq(tasks.id, taskId));
    if (projectId) await db.delete(projects).where(eq(projects.id, projectId));
    if (devId) await db.delete(developers).where(eq(developers.id, devId));
  }
});
