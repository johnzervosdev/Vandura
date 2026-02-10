import { z } from 'zod';
import { createTRPCRouter, publicProcedure } from '../trpc';
import { timesheetService } from '../services/TimesheetService';
import { excelParser } from '../services/ExcelParser';
import { createTimeEntrySchema, bulkCreateTimeEntriesSchema } from '@/lib/validators';

/**
 * Timesheet Router
 * Handles time entry operations and Excel imports
 */
export const timesheetRouter = createTRPCRouter({
  // Create single time entry
  create: publicProcedure
    .input(createTimeEntrySchema)
    .mutation(async ({ input }) => {
      return timesheetService.createEntry({
        projectId: input.projectId,
        taskId: input.taskId,
        developerId: input.developerId,
        startTime: input.startTime,
        durationMinutes: input.durationMinutes,
        description: input.description,
      });
    }),

  // Bulk create time entries (for programmatic imports)
  bulkCreate: publicProcedure
    .input(bulkCreateTimeEntriesSchema)
    .mutation(async ({ input }) => {
      return timesheetService.bulkCreateEntries(
        input.map((entry) => ({
          projectId: entry.projectId,
          taskId: entry.taskId,
          developerId: entry.developerId,
          startTime: entry.startTime,
          durationMinutes: entry.durationMinutes,
          description: entry.description,
        }))
      );
    }),

  // Parse Excel file (returns parsed data without saving)
  parseExcel: publicProcedure
    .input(
      z.object({
        fileBuffer: z.string(), // Base64 encoded file
      })
    )
    .mutation(async ({ input }) => {
      const buffer = Buffer.from(input.fileBuffer, 'base64');
      const parseResult = await excelParser.parseFile(buffer);
      return {
        entryCount: parseResult.entries.length,
        preview: parseResult.preview,
        errors: parseResult.errors,
        warnings: parseResult.warnings,
      };
    }),

  // Import from Excel (parse and save)
  importExcel: publicProcedure
    .input(
      z.object({
        fileBuffer: z.string(), // Base64 encoded file
      })
    )
    .mutation(async ({ input }) => {
      const buffer = Buffer.from(input.fileBuffer, 'base64');
      const parseResult = await excelParser.parseFile(buffer);

      if (parseResult.errors.length > 0) {
        throw new Error(`Parse errors: ${parseResult.errors.join(', ')}`);
      }

      const entries = await timesheetService.bulkCreateEntries(parseResult.entries);

      return {
        imported: entries.length,
        errors: parseResult.errors,
        warnings: parseResult.warnings,
      };
    }),

  // List time entries with filters
  list: publicProcedure
    .input(
      z.object({
        projectId: z.number().optional(),
        developerId: z.number().optional(),
        taskId: z.number().optional(),
        startDate: z.date().optional(),
        endDate: z.date().optional(),
        limit: z.number().min(1).max(1000).default(100),
        offset: z.number().min(0).default(0),
      })
    )
    .query(async ({ input }) => {
      const entries = await timesheetService.getEntries(
        {
          projectId: input.projectId,
          developerId: input.developerId,
          taskId: input.taskId,
          startDate: input.startDate,
          endDate: input.endDate,
        },
        input.limit,
        input.offset
      );

      const total = await timesheetService.getEntriesCount({
        projectId: input.projectId,
        developerId: input.developerId,
        taskId: input.taskId,
        startDate: input.startDate,
        endDate: input.endDate,
      });

      return {
        entries,
        total,
        hasMore: input.offset + entries.length < total,
      };
    }),

  // Get single entry
  get: publicProcedure
    .input(z.object({ id: z.number() }))
    .query(async ({ input }) => {
      return timesheetService.getEntryById(input.id);
    }),

  // Update entry
  update: publicProcedure
    .input(
      z.object({
        id: z.number(),
        data: createTimeEntrySchema.partial(),
      })
    )
    .mutation(async ({ input }) => {
      return timesheetService.updateEntry(input.id, input.data);
    }),

  // Delete entry
  delete: publicProcedure
    .input(z.object({ id: z.number() }))
    .mutation(async ({ input }) => {
      return timesheetService.deleteEntry(input.id);
    }),
});
