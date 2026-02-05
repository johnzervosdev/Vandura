import { sql } from 'drizzle-orm';
import { integer, text, real, sqliteTable, index } from 'drizzle-orm/sqlite-core';

/**
 * Developers Table
 * Stores information about team members who log time
 */
export const developers = sqliteTable('developers', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  name: text('name').notNull(),
  email: text('email').unique(),
  hourlyRate: real('hourly_rate'), // Optional: for cost tracking
  isActive: integer('is_active', { mode: 'boolean' }).notNull().default(true),
  createdAt: integer('created_at', { mode: 'timestamp' }).notNull().default(sql`(unixepoch())`),
  updatedAt: integer('updated_at', { mode: 'timestamp' }).notNull().default(sql`(unixepoch())`),
});

/**
 * Projects Table
 * Top-level container for work items
 */
export const projects = sqliteTable('projects', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  name: text('name').notNull(),
  description: text('description'),
  estimatedHours: real('estimated_hours'),
  startDate: integer('start_date', { mode: 'timestamp' }),
  endDate: integer('end_date', { mode: 'timestamp' }),
  status: text('status', { enum: ['active', 'completed', 'on-hold', 'cancelled'] })
    .notNull()
    .default('active'),
  createdAt: integer('created_at', { mode: 'timestamp' }).notNull().default(sql`(unixepoch())`),
  updatedAt: integer('updated_at', { mode: 'timestamp' }).notNull().default(sql`(unixepoch())`),
});

/**
 * Tasks Table
 * Breakdown of work within projects
 * Supports hierarchical structure via parentTaskId
 */
export const tasks = sqliteTable(
  'tasks',
  {
    id: integer('id').primaryKey({ autoIncrement: true }),
    projectId: integer('project_id')
      .notNull()
      .references(() => projects.id, { onDelete: 'cascade' }),
    name: text('name').notNull(),
    description: text('description'),
    estimatedHours: real('estimated_hours'),
    parentTaskId: integer('parent_task_id'), // Self-referential for subtasks
    status: text('status', { enum: ['pending', 'in-progress', 'completed', 'blocked'] })
      .notNull()
      .default('pending'),
    createdAt: integer('created_at', { mode: 'timestamp' }).notNull().default(sql`(unixepoch())`),
    updatedAt: integer('updated_at', { mode: 'timestamp' }).notNull().default(sql`(unixepoch())`),
  },
  (table) => ({
    projectIdIdx: index('tasks_project_id_idx').on(table.projectId),
    parentTaskIdIdx: index('tasks_parent_task_id_idx').on(table.parentTaskId),
  })
);

/**
 * Time Entries Table
 * Core table: stores individual 15-minute increments
 * Optimized for fast inserts and aggregation queries
 */
export const timeEntries = sqliteTable(
  'time_entries',
  {
    id: integer('id').primaryKey({ autoIncrement: true }),
    projectId: integer('project_id')
      .notNull()
      .references(() => projects.id, { onDelete: 'cascade' }),
    taskId: integer('task_id').references(() => tasks.id, { onDelete: 'set null' }),
    developerId: integer('developer_id')
      .notNull()
      .references(() => developers.id, { onDelete: 'cascade' }),
    startTime: integer('start_time', { mode: 'timestamp' }).notNull(),
    durationMinutes: integer('duration_minutes').notNull(), // Always 15, 30, 45, 60, etc.
    description: text('description'),
    createdAt: integer('created_at', { mode: 'timestamp' }).notNull().default(sql`(unixepoch())`),
    updatedAt: integer('updated_at', { mode: 'timestamp' }).notNull().default(sql`(unixepoch())`),
  },
  (table) => ({
    // Composite indexes for common query patterns
    projectStartTimeIdx: index('time_entries_project_start_time_idx').on(
      table.projectId,
      table.startTime
    ),
    developerStartTimeIdx: index('time_entries_developer_start_time_idx').on(
      table.developerId,
      table.startTime
    ),
    taskIdIdx: index('time_entries_task_id_idx').on(table.taskId),
    startTimeIdx: index('time_entries_start_time_idx').on(table.startTime),
  })
);

/**
 * Actuals Cache Table
 * Materialized view pattern for pre-computed aggregations
 * Improves performance for historical reports
 */
export const actualsCache = sqliteTable(
  'actuals_cache',
  {
    id: integer('id').primaryKey({ autoIncrement: true }),
    projectId: integer('project_id')
      .notNull()
      .references(() => projects.id, { onDelete: 'cascade' }),
    taskId: integer('task_id').references(() => tasks.id, { onDelete: 'cascade' }),
    developerId: integer('developer_id').references(() => developers.id, { onDelete: 'cascade' }),
    periodStart: integer('period_start', { mode: 'timestamp' }).notNull(),
    periodEnd: integer('period_end', { mode: 'timestamp' }).notNull(),
    totalMinutes: integer('total_minutes').notNull(),
    entryCount: integer('entry_count').notNull(),
    calculatedAt: integer('calculated_at', { mode: 'timestamp' }).notNull().default(sql`(unixepoch())`),
  },
  (table) => ({
    projectPeriodIdx: index('actuals_cache_project_period_idx').on(
      table.projectId,
      table.periodStart,
      table.periodEnd
    ),
  })
);

/**
 * Type exports for TypeScript
 * Drizzle automatically infers these from schema
 */
export type Developer = typeof developers.$inferSelect;
export type NewDeveloper = typeof developers.$inferInsert;

export type Project = typeof projects.$inferSelect;
export type NewProject = typeof projects.$inferInsert;

export type Task = typeof tasks.$inferSelect;
export type NewTask = typeof tasks.$inferInsert;

export type TimeEntry = typeof timeEntries.$inferSelect;
export type NewTimeEntry = typeof timeEntries.$inferInsert;

export type ActualsCache = typeof actualsCache.$inferSelect;
export type NewActualsCache = typeof actualsCache.$inferInsert;
