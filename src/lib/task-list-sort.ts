/**
 * Story 6.3 — `task.listByProject` ordering (Hannibal: status workflow rank, nulls-last for story # / estimates).
 */
import { asc, desc, sql } from 'drizzle-orm';
import { tasks } from '@/server/db/schema';
import { z } from 'zod';

export const taskListSortBySchema = z.enum(['story_number', 'name', 'status', 'estimated_hours']);
export const taskListSortDirSchema = z.enum(['asc', 'desc']);

export type TaskListSortBy = z.infer<typeof taskListSortBySchema>;
export type TaskListSortDir = z.infer<typeof taskListSortDirSchema>;

export const listByProjectInputSchema = z.object({
  projectId: z.number().int().positive(),
  sortBy: taskListSortBySchema.default('story_number'),
  sortDir: taskListSortDirSchema.default('asc'),
});

export type ListByProjectInput = z.infer<typeof listByProjectInputSchema>;

/** Pipeline rank: ascending = pending → … → completed (Hannibal Story 6.3). */
export const taskStatusRankSql = sql`(CASE ${tasks.status} WHEN 'pending' THEN 1 WHEN 'in-progress' THEN 2 WHEN 'blocked' THEN 3 WHEN 'completed' THEN 4 ELSE 99 END)`;

export function taskListOrderBy(sortBy: TaskListSortBy, sortDir: TaskListSortDir) {
  const idAsc = asc(tasks.id);

  const nullsLastGroup = (col: typeof tasks.storyNumber | typeof tasks.estimatedHours) =>
    asc(sql`(CASE WHEN ${col} IS NULL THEN 1 ELSE 0 END)`);

  if (sortBy === 'story_number') {
    return [
      nullsLastGroup(tasks.storyNumber),
      sortDir === 'asc' ? asc(tasks.storyNumber) : desc(tasks.storyNumber),
      idAsc,
    ];
  }

  if (sortBy === 'estimated_hours') {
    return [
      nullsLastGroup(tasks.estimatedHours),
      sortDir === 'asc' ? asc(tasks.estimatedHours) : desc(tasks.estimatedHours),
      idAsc,
    ];
  }

  if (sortBy === 'name') {
    return [sortDir === 'asc' ? asc(tasks.name) : desc(tasks.name), idAsc];
  }

  return [sortDir === 'asc' ? asc(taskStatusRankSql) : desc(taskStatusRankSql), idAsc];
}
