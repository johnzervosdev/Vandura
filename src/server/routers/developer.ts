import { z } from 'zod';
import { createTRPCRouter, publicProcedure } from '../trpc';
import { db } from '../db';
import { developers, type NewDeveloper } from '../db/schema';
import { eq } from 'drizzle-orm';
import { createDeveloperSchema } from '@/lib/validators';

/**
 * Developer Router
 * Handles developer CRUD operations
 */
export const developerRouter = createTRPCRouter({
  // Create new developer
  create: publicProcedure
    .input(createDeveloperSchema)
    .mutation(async ({ input }) => {
      const newDeveloper: NewDeveloper = {
        name: input.name,
        email: input.email || null,
        hourlyRate: input.hourlyRate || null,
        isActive: input.isActive,
      };

      const result = await db.insert(developers).values(newDeveloper).returning();
      return result[0];
    }),

  // Get all developers
  list: publicProcedure
    .input(
      z.object({
        activeOnly: z.boolean().default(false),
      }).optional()
    )
    .query(async ({ input }) => {
      if (input?.activeOnly) {
        return db.query.developers.findMany({
          where: eq(developers.isActive, true),
        });
      }
      return db.query.developers.findMany();
    }),

  // Get single developer
  get: publicProcedure
    .input(z.object({ id: z.number() }))
    .query(async ({ input }) => {
      return db.query.developers.findFirst({
        where: eq(developers.id, input.id),
      });
    }),

  // Update developer
  update: publicProcedure
    .input(
      z.object({
        id: z.number(),
        data: createDeveloperSchema.partial(),
      })
    )
    .mutation(async ({ input }) => {
      const result = await db
        .update(developers)
        .set({
          ...input.data,
          updatedAt: new Date(),
        })
        .where(eq(developers.id, input.id))
        .returning();

      return result[0];
    }),

  // Delete developer
  delete: publicProcedure
    .input(z.object({ id: z.number() }))
    .mutation(async ({ input }) => {
      const result = await db
        .delete(developers)
        .where(eq(developers.id, input.id))
        .returning();

      return result.length > 0;
    }),
});
