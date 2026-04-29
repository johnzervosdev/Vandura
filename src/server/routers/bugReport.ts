import { z } from 'zod';
import { createTRPCRouter, publicProcedure } from '../trpc';
import { db } from '../db';
import { bugReports } from '../db/schema';
import { eq, desc, and } from 'drizzle-orm';
import { createBugReportSchema, closeBugReportSchema } from '@/lib/validators';

export const bugReportRouter = createTRPCRouter({
  create: publicProcedure.input(createBugReportSchema).mutation(async ({ input }) => {
    const [row] = await db
      .insert(bugReports)
      .values({
        title: input.title.trim(),
        description: input.description.trim(),
        pagePath: input.pagePath?.trim() || null,
        status: 'open',
      })
      .returning();
    return row;
  }),

  listOpen: publicProcedure.query(async () => {
    return db
      .select()
      .from(bugReports)
      .where(eq(bugReports.status, 'open'))
      .orderBy(desc(bugReports.createdAt));
  }),

  close: publicProcedure.input(closeBugReportSchema).mutation(async ({ input }) => {
    const closedAt = new Date();
    const [row] = await db
      .update(bugReports)
      .set({
        status: 'closed',
        closedAt,
        closeNote: input.closeNote?.trim() || null,
      })
      .where(and(eq(bugReports.id, input.id), eq(bugReports.status, 'open')))
      .returning();
    if (!row) {
      throw new Error('Report not found or already closed');
    }
    return row;
  }),
});
