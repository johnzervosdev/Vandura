import { z } from 'zod';

/**
 * Zod validators for runtime type checking
 * These ensure data integrity at API boundaries
 */

export const createDeveloperSchema = z.object({
  name: z.string().min(1, 'Name is required').max(100),
  email: z.string().email('Invalid email').optional(),
  hourlyRate: z.number().positive().optional(),
  isActive: z.boolean().default(true),
});

export const createProjectSchema = z.object({
  name: z.string().min(1, 'Project name is required').max(200),
  description: z.string().optional(),
  estimatedHours: z.number().positive().optional(),
  startDate: z.date().optional(),
  endDate: z.date().optional(),
  status: z.enum(['active', 'completed', 'on-hold', 'cancelled']).default('active'),
});

export const createTaskSchema = z.object({
  projectId: z.number().int().positive(),
  name: z.string().min(1, 'Task name is required').max(200),
  description: z.string().optional(),
  estimatedHours: z.number().positive().optional(),
  parentTaskId: z.number().int().positive().optional(),
  status: z.enum(['pending', 'in-progress', 'completed', 'blocked']).default('pending'),
});

export const createTimeEntrySchema = z.object({
  projectId: z.number().int().positive(),
  taskId: z.number().int().positive().optional(),
  developerId: z.number().int().positive(),
  startTime: z.date(),
  durationMinutes: z
    .number()
    .int()
    .positive()
    .refine((val) => val % 15 === 0, {
      message: 'Duration must be a multiple of 15 minutes',
    }),
  description: z.string().optional(),
});

export const bulkCreateTimeEntriesSchema = z.array(createTimeEntrySchema);

export const dateRangeSchema = z.object({
  startDate: z.date(),
  endDate: z.date(),
});

export const actualsReportInputSchema = z.object({
  projectId: z.number().int().positive(),
  startDate: z.date().optional(),
  endDate: z.date().optional(),
  groupBy: z.enum(['task', 'developer', 'day', 'week']).default('task'),
});
