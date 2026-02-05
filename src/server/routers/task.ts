import { z } from 'zod';
import { createTRPCRouter, publicProcedure } from '../trpc';
import { db } from '../db';
import { tasks, type NewTask } from '../db/schema';
import { eq } from 'drizzle-orm';
import { createTaskSchema } from '@/lib/validators';

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
        parentTaskId: input.parentTaskId || null,
        status: input.status,
      };

      const result = await db.insert(tasks).values(newTask).returning();
      return result[0];
    }),

  // Get all tasks for a project
  listByProject: publicProcedure
    .input(z.object({ projectId: z.number() }))
    .query(async ({ input }) => {
      return db.query.tasks.findMany({
        where: eq(tasks.projectId, input.projectId),
      });
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
        data: createTaskSchema.partial().omit({ projectId: true }),
      })
    )
    .mutation(async ({ input }) => {
      const result = await db
        .update(tasks)
        .set({
          ...input.data,
          updatedAt: new Date(),
        })
        .where(eq(tasks.id, input.id))
        .returning();

      return result[0];
    }),

  // Delete task
  delete: publicProcedure
    .input(z.object({ id: z.number() }))
    .mutation(async ({ input }) => {
      const result = await db
        .delete(tasks)
        .where(eq(tasks.id, input.id))
        .returning();

      return result.length > 0;
    }),
});
