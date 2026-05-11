import { TRPCError } from '@trpc/server';
import { z } from 'zod';
import { createTRPCRouter, publicProcedure } from '../trpc';
import { db } from '../db';
import { tasks, type NewTask } from '../db/schema';
import { eq } from 'drizzle-orm';
import { createTaskSchema, updateTaskDataSchema } from '@/lib/validators';
import { listByProjectInputSchema, taskListOrderBy } from '@/lib/task-list-sort';

function isSqliteUniqueViolation(err: unknown): boolean {
  if (!err || typeof err !== 'object') return false;
  const anyErr = err as { code?: string; message?: string };
  return (
    anyErr.code === 'SQLITE_CONSTRAINT_UNIQUE' ||
    (typeof anyErr.message === 'string' &&
      (anyErr.message.includes('UNIQUE constraint failed') ||
        anyErr.message.includes('tasks_project_id_story_number_uidx')))
  );
}

function throwStoryNumberConflict(): never {
  throw new TRPCError({
    code: 'BAD_REQUEST',
    message:
      'Another task in this project already uses that Story #. Choose a different number or clear the field.',
  });
}

/**
 * Task Router
 * Handles task CRUD operations
 */
export const taskRouter = createTRPCRouter({
  // Create new task
  create: publicProcedure
    .input(createTaskSchema)
    .mutation(async ({ input }) => {
      const newTask: NewTask = {
        projectId: input.projectId,
        name: input.name,
        description: input.description || null,
        estimatedHours: input.estimatedHours || null,
        storyNumber: input.storyNumber ?? null,
        parentTaskId: input.parentTaskId || null,
        status: input.status,
      };

      try {
        const result = await db.insert(tasks).values(newTask).returning();
        return result[0];
      } catch (err) {
        if (isSqliteUniqueViolation(err)) throwStoryNumberConflict();
        throw err;
      }
    }),

  // Get all tasks for a project (Story 6.3 — sortable)
  listByProject: publicProcedure.input(listByProjectInputSchema).query(async ({ input }) => {
    const orderBy = taskListOrderBy(input.sortBy, input.sortDir);
    return db.select().from(tasks).where(eq(tasks.projectId, input.projectId)).orderBy(...orderBy);
  }),

  // Get single task
  get: publicProcedure
    .input(z.object({ id: z.number() }))
    .query(async ({ input }) => {
      return db.query.tasks.findFirst({
        where: eq(tasks.id, input.id),
      });
    }),

  // Update task
  update: publicProcedure
    .input(
      z.object({
        id: z.number(),
        data: updateTaskDataSchema,
      })
    )
    .mutation(async ({ input }) => {
      const d = input.data;
      const patch: Partial<NewTask> = {
        updatedAt: new Date(),
      };

      if (d.name !== undefined) patch.name = d.name;
      if (d.description !== undefined) patch.description = d.description ?? null;
      if (d.estimatedHours !== undefined) patch.estimatedHours = d.estimatedHours ?? null;
      if (d.parentTaskId !== undefined) patch.parentTaskId = d.parentTaskId ?? null;
      if (d.status !== undefined) patch.status = d.status;
      if (d.storyNumber !== undefined) patch.storyNumber = d.storyNumber;

      try {
        const result = await db.update(tasks).set(patch).where(eq(tasks.id, input.id)).returning();

        return result[0];
      } catch (err) {
        if (isSqliteUniqueViolation(err)) throwStoryNumberConflict();
        throw err;
      }
    }),

  // Delete task
  delete: publicProcedure
    .input(z.object({ id: z.number() }))
    .mutation(async ({ input }) => {
      const result = await db.delete(tasks).where(eq(tasks.id, input.id)).returning();

      return result.length > 0;
    }),
});
