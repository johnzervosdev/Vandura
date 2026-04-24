import test from 'node:test';
import assert from 'node:assert/strict';
import { eq, inArray } from 'drizzle-orm';
import { reportService } from '../src/server/services/ReportService';
import { db } from '../src/server/db';
import { projects, tasks } from '../src/server/db/schema';

/**
 * Story 6.1 — `getAllProjectsSummary` / `taskEstimatesTotal` matches Hannibal (B)
 * at the SQL roll-up layer (not only `taskEstimatesTotalFromRollup` unit tests).
 */

test('Story 6.1: projectsSummary taskEstimatesTotal is null when any task estimate is null', async () => {
  const tag = `ps61-tbd-${Date.now()}`;
  let projectId: number | null = null;
  const taskIds: number[] = [];

  try {
    const [project] = await db
      .insert(projects)
      .values({ name: `${tag}-proj`, status: 'active', estimatedHours: 100 })
      .returning();
    projectId = project.id;

    const inserted = await db
      .insert(tasks)
      .values([
        { projectId, name: `${tag}-a`, status: 'pending', estimatedHours: 10 },
        { projectId, name: `${tag}-b`, status: 'pending', estimatedHours: null },
      ])
      .returning();
    taskIds.push(...inserted.map((t) => t.id));

    const rows = await reportService.getAllProjectsSummary();
    const row = rows.find((r) => r.projectId === projectId);
    assert.ok(row, 'summary row for seeded project');
    assert.equal(row.taskEstimatesTotal, null);
    assert.equal(row.estimatedHours, 100);
  } finally {
    if (taskIds.length) await db.delete(tasks).where(inArray(tasks.id, taskIds));
    if (projectId) await db.delete(projects).where(eq(projects.id, projectId));
  }
});

test('Story 6.1: projectsSummary taskEstimatesTotal sums when every task has a set estimate (0 allowed)', async () => {
  const tag = `ps61-sum-${Date.now()}`;
  let projectId: number | null = null;
  const taskIds: number[] = [];

  try {
    const [project] = await db
      .insert(projects)
      .values({ name: `${tag}-proj`, status: 'active', estimatedHours: null })
      .returning();
    projectId = project.id;

    const inserted = await db
      .insert(tasks)
      .values([
        { projectId, name: `${tag}-a`, status: 'pending', estimatedHours: 0 },
        { projectId, name: `${tag}-b`, status: 'pending', estimatedHours: 4.5 },
      ])
      .returning();
    taskIds.push(...inserted.map((t) => t.id));

    const rows = await reportService.getAllProjectsSummary();
    const row = rows.find((r) => r.projectId === projectId);
    assert.ok(row);
    assert.equal(row.taskEstimatesTotal, 4.5);
  } finally {
    if (taskIds.length) await db.delete(tasks).where(inArray(tasks.id, taskIds));
    if (projectId) await db.delete(projects).where(eq(projects.id, projectId));
  }
});

test('Story 6.1: projectsSummary taskEstimatesTotal is 0 for project with no tasks', async () => {
  const tag = `ps61-empty-${Date.now()}`;
  let projectId: number | null = null;

  try {
    const [project] = await db
      .insert(projects)
      .values({ name: `${tag}-proj`, status: 'active' })
      .returning();
    projectId = project.id;

    const rows = await reportService.getAllProjectsSummary();
    const row = rows.find((r) => r.projectId === projectId);
    assert.ok(row);
    assert.equal(row.taskEstimatesTotal, 0);
    assert.equal(row.taskCount, 0);
  } finally {
    if (projectId) await db.delete(projects).where(eq(projects.id, projectId));
  }
});
