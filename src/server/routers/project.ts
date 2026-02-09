import { z } from 'zod';
import { createTRPCRouter, publicProcedure } from '../trpc';
import { db } from '../db';
import { projects, type NewProject } from '../db/schema';
import { eq } from 'drizzle-orm';
import { createProjectSchema } from '@/lib/validators';

/**
 * Project Router
 * Handles project CRUD operations
 */
export const projectRouter = createTRPCRouter({
  // Create new project
  create: publicProcedure
    .input(createProjectSchema)
    .mutation(async ({ input }) => {
      const newProject: NewProject = {
        name: input.name,
        description: input.description || null,
        estimatedHours: input.estimatedHours || null,
        startDate: input.startDate || null,
        endDate: input.endDate || null,
        status: input.status,
      };

      const result = await db.insert(projects).values(newProject).returning();
      return result[0];
    }),

  // Get all projects
  list: publicProcedure
    .input(
      z.object({
        status: z.enum(['active', 'completed', 'on-hold', 'cancelled']).optional(),
      }).optional()
    )
    .query(async ({ input }) => {
      if (input?.status) {
        return db.query.projects.findMany({
          where: eq(projects.status, input.status),
        });
      }
      return db.query.projects.findMany();
    }),

  // Get single project
  get: publicProcedure
    .input(z.object({ id: z.number() }))
    .query(async ({ input }) => {
      return db.query.projects.findFirst({
        where: eq(projects.id, input.id),
      });
    }),

  // Update project
  update: publicProcedure
    .input(
      z.object({
        id: z.number(),
        data: createProjectSchema.partial(),
      })
    )
    .mutation(async ({ input }) => {
      const result = await db
        .update(projects)
        .set({
          ...input.data,
          updatedAt: new Date(),
        })
        .where(eq(projects.id, input.id))
        .returning();

      return result[0];
    }),

  // Delete project
  delete: publicProcedure
    .input(z.object({ id: z.number() }))
    .mutation(async ({ input }) => {
      const result = await db
        .delete(projects)
        .where(eq(projects.id, input.id))
        .returning();

      return result.length > 0;
    }),
});
