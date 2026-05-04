/**
 * BUG-REPORT-001 — Actuals report date window vs project planning dates.
 * @see `van/stories.md` → Bug backlog → BUG-REPORT-001
 */
import test from 'node:test';
import assert from 'node:assert/strict';
import { eq } from 'drizzle-orm';
import { aggregationEngine } from '../src/server/services/AggregationEngine';
import { db } from '../src/server/db';
import { developers, projects, tasks, timeEntries } from '../src/server/db/schema';

test('BUG-REPORT-001 baseline: explicit wide range includes time after project.endDate', async () => {
  const tag = `br001-${Date.now()}`;
  let devId = 0;
  let projectId = 0;
  let taskId = 0;
  let entryId = 0;

  try {
    const [dev] = await db
      .insert(developers)
      .values({ name: `${tag}-dev`, email: `${tag}@example.test`, isActive: true })
      .returning();
    devId = dev.id;

    const [proj] = await db
      .insert(projects)
      .values({
        name: `${tag}-proj`,
        status: 'active',
        startDate: new Date('2020-01-01'),
        endDate: new Date('2020-06-01'),
      })
      .returning();
    projectId = proj.id;

    const [task] = await db
      .insert(tasks)
      .values({
        projectId,
        name: `${tag}-task`,
        status: 'pending',
        estimatedHours: 10,
      })
      .returning();
    taskId = task.id;

    const [entry] = await db
      .insert(timeEntries)
      .values({
        projectId,
        taskId,
        developerId: devId,
        startTime: new Date('2026-04-01T10:00:00Z'),
        durationMinutes: 60,
        description: 'work after project endDate',
      })
      .returning();
    entryId = entry.id;

    const report = await aggregationEngine.getActualsVsEstimates(
      projectId,
      new Date(0),
      new Date('2099-12-31T23:59:59Z')
    );

    assert.equal(report.totalActualHours, 1, '1h logged');
    const row = report.tasks.find((t) => t.taskId === taskId);
    assert.ok(row);
    assert.equal(row!.actualHours, 1);
  } finally {
    if (entryId) await db.delete(timeEntries).where(eq(timeEntries.id, entryId));
    if (taskId) await db.delete(tasks).where(eq(tasks.id, taskId));
    if (projectId) await db.delete(projects).where(eq(projects.id, projectId));
    if (devId) await db.delete(developers).where(eq(developers.id, devId));
  }
});

/** Remove `.skip` when Story 6.7 / BUG-REPORT-001 is fixed (implicit “All Time” must not clip to project.endDate — Hannibal rule locked 2026-04-12). */
test.skip('BUG-REPORT-001: implicit date range (undefined) must include entries after project.endDate', async () => {
  const tag = `br001-skip-${Date.now()}`;
  let devId = 0;
  let projectId = 0;
  let taskId = 0;
  let entryId = 0;

  try {
    const [dev] = await db
      .insert(developers)
      .values({ name: `${tag}-dev`, email: `${tag}@example.test`, isActive: true })
      .returning();
    devId = dev.id;

    const [proj] = await db
      .insert(projects)
      .values({
        name: `${tag}-proj`,
        status: 'active',
        startDate: new Date('2020-01-01'),
        endDate: new Date('2020-06-01'),
      })
      .returning();
    projectId = proj.id;

    const [task] = await db
      .insert(tasks)
      .values({
        projectId,
        name: `${tag}-task`,
        status: 'pending',
        estimatedHours: 10,
      })
      .returning();
    taskId = task.id;

    const [entry] = await db
      .insert(timeEntries)
      .values({
        projectId,
        taskId,
        developerId: devId,
        startTime: new Date('2026-04-01T10:00:00Z'),
        durationMinutes: 60,
      })
      .returning();
    entryId = entry.id;

    const report = await aggregationEngine.getActualsVsEstimates(projectId, undefined, undefined);

    assert.equal(
      report.totalActualHours,
      1,
      'All-time preset should count 1h after project planning endDate'
    );
    const row = report.tasks.find((t) => t.taskId === taskId);
    assert.ok(row);
    assert.equal(row!.actualHours, 1);
  } finally {
    if (entryId) await db.delete(timeEntries).where(eq(timeEntries.id, entryId));
    if (taskId) await db.delete(tasks).where(eq(tasks.id, taskId));
    if (projectId) await db.delete(projects).where(eq(projects.id, projectId));
    if (devId) await db.delete(developers).where(eq(developers.id, devId));
  }
});
