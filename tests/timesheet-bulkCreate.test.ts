import test from 'node:test';
import assert from 'node:assert/strict';
import { db } from '../src/server/db';
import { developers, projects, timeEntries } from '../src/server/db/schema';
import { eq } from 'drizzle-orm';
import { timesheetService } from '../src/server/services/TimesheetService';

test('bulkCreateEntries should return an array without throwing', async () => {
  const unique = Date.now();
  const devName = `QA Dev ${unique}`;
  const projectName = `QA Project ${unique}`;

  let developerId: number | null = null;
  let projectId: number | null = null;
  let createdEntryIds: number[] = [];

  try {
    const [dev] = await db
      .insert(developers)
      .values({ name: devName, isActive: true })
      .returning();
    developerId = dev.id;

    const [proj] = await db
      .insert(projects)
      .values({ name: projectName, status: 'active' })
      .returning();
    projectId = proj.id;

    const entries = await timesheetService.bulkCreateEntries([
      {
        projectId,
        developerId,
        startTime: new Date('2026-02-01T09:00:00'),
        durationMinutes: 15,
        description: 'QA bulk insert',
      },
    ]);

    assert.ok(Array.isArray(entries));
    createdEntryIds = entries.map((e) => e.id);
  } finally {
    if (createdEntryIds.length > 0) {
      await db.delete(timeEntries).where(eq(timeEntries.id, createdEntryIds[0]));
    }
    if (projectId) {
      await db.delete(projects).where(eq(projects.id, projectId));
    }
    if (developerId) {
      await db.delete(developers).where(eq(developers.id, developerId));
    }
  }
});
