import { db } from '../src/server/db';
import { developers, projects, tasks } from '../src/server/db/schema';
import { eq } from 'drizzle-orm';

/** Used when tests call ExcelParser in default import mode (getOrCreate* writes to shared DB). */
export async function deleteProjectCascadeByName(projectName: string) {
  const project = await db.query.projects.findFirst({
    where: eq(projects.name, projectName),
  });
  if (project) {
    await db.delete(tasks).where(eq(tasks.projectId, project.id));
    await db.delete(projects).where(eq(projects.id, project.id));
  }
}

export async function cleanupParserImportSideEffects(developerName: string, projectName: string) {
  await deleteProjectCascadeByName(projectName);
  await db.delete(developers).where(eq(developers.name, developerName));
}
