import { db } from '../db';
import { timeEntries, tasks, actualsCache, projects, developers } from '../db/schema';
import { eq, and, gte, lte, sql } from 'drizzle-orm';
import { startOfDay, endOfDay } from '@/lib/date-utils';

/**
 * AggregationEngine
 * Core engine for efficiently aggregating 15-minute time increments
 * Implements caching strategy to avoid redundant calculations
 */

export interface ActualsData {
  taskId: number | null;
  taskName: string | null;
  totalMinutes: number;
  totalHours: number;
  entryCount: number;
}

export interface ActualsVsEstimates {
  projectId: number;
  projectName: string;
  totalEstimatedHours: number | null;
  totalActualHours: number;
  variance: number;
  variancePercentage: number;
  tasks: Array<{
    taskId: number;
    taskName: string;
    estimatedHours: number | null;
    actualHours: number;
    variance: number;
    variancePercentage: number;
  }>;
}

export interface DeveloperSummary {
  developerId: number;
  developerName: string;
  totalMinutes: number;
  totalHours: number;
  entryCount: number;
}

export class AggregationEngine {
  /**
   * Main method: Get Actuals vs Estimates report for a project
   */
  async getActualsVsEstimates(
    projectId: number,
    startDate?: Date,
    endDate?: Date
  ): Promise<ActualsVsEstimates> {
    // Set default date range if not provided (project lifetime)
    const project = await db.query.projects.findFirst({
      where: eq(projects.id, projectId),
    });

    if (!project) {
      throw new Error(`Project ${projectId} not found`);
    }

    const start = startDate || project.startDate || new Date(0);
    const end = endDate || project.endDate || new Date();

    // Get actuals from time entries
    const actuals = await this.getActualsByTask(projectId, start, end);

    // Get estimates from tasks
    const taskEstimates = await db.query.tasks.findMany({
      where: eq(tasks.projectId, projectId),
    });

    // Calculate total actual hours
    const totalActualHours = actuals.reduce((sum, a) => sum + a.totalHours, 0);

    // Build task-level variance report
    const taskVariances = taskEstimates.map((task) => {
      const actual = actuals.find((a) => a.taskId === task.id);
      const actualHours = actual?.totalHours || 0;
      const estimatedHours = task.estimatedHours || 0;
      const variance = actualHours - estimatedHours;
      const variancePercentage = estimatedHours > 0 ? (variance / estimatedHours) * 100 : 0;

      return {
        taskId: task.id,
        taskName: task.name,
        estimatedHours,
        actualHours,
        variance,
        variancePercentage,
      };
    });

    // Calculate project-level variance
    const totalEstimatedHours = project.estimatedHours;
    const projectVariance = totalEstimatedHours
      ? totalActualHours - totalEstimatedHours
      : 0;
    const projectVariancePercentage = totalEstimatedHours
      ? (projectVariance / totalEstimatedHours) * 100
      : 0;

    return {
      projectId: project.id,
      projectName: project.name,
      totalEstimatedHours,
      totalActualHours,
      variance: projectVariance,
      variancePercentage: projectVariancePercentage,
      tasks: taskVariances,
    };
  }

  /**
   * Get actuals grouped by task
   */
  async getActualsByTask(
    projectId: number,
    startDate: Date,
    endDate: Date
  ): Promise<ActualsData[]> {
    const result = await db
      .select({
        taskId: timeEntries.taskId,
        totalMinutes: sql<number>`CAST(SUM(${timeEntries.durationMinutes}) AS INTEGER)`,
        entryCount: sql<number>`COUNT(*)`,
      })
      .from(timeEntries)
      .where(
        and(
          eq(timeEntries.projectId, projectId),
          gte(timeEntries.startTime, startOfDay(startDate)),
          lte(timeEntries.startTime, endOfDay(endDate))
        )
      )
      .groupBy(timeEntries.taskId);

    // Enrich with task names
    const enriched: ActualsData[] = [];
    for (const row of result) {
      let taskName: string | null = null;
      if (row.taskId) {
        const task = await db.query.tasks.findFirst({
          where: eq(tasks.id, row.taskId),
        });
        taskName = task?.name || null;
      }

      enriched.push({
        taskId: row.taskId,
        taskName,
        totalMinutes: row.totalMinutes,
        totalHours: row.totalMinutes / 60,
        entryCount: row.entryCount,
      });
    }

    return enriched;
  }

  /**
   * Get actuals grouped by developer
   */
  async getActualsByDeveloper(
    projectId: number,
    startDate: Date,
    endDate: Date
  ): Promise<DeveloperSummary[]> {
    const result = await db
      .select({
        developerId: timeEntries.developerId,
        totalMinutes: sql<number>`CAST(SUM(${timeEntries.durationMinutes}) AS INTEGER)`,
        entryCount: sql<number>`COUNT(*)`,
      })
      .from(timeEntries)
      .where(
        and(
          eq(timeEntries.projectId, projectId),
          gte(timeEntries.startTime, startOfDay(startDate)),
          lte(timeEntries.startTime, endOfDay(endDate))
        )
      )
      .groupBy(timeEntries.developerId);

    // Enrich with developer names
    const enriched: DeveloperSummary[] = [];
    for (const row of result) {
      const developer = await db.query.developers.findFirst({
        where: eq(developers.id, row.developerId),
      });

      enriched.push({
        developerId: row.developerId,
        developerName: developer?.name || 'Unknown',
        totalMinutes: row.totalMinutes,
        totalHours: row.totalMinutes / 60,
        entryCount: row.entryCount,
      });
    }

    return enriched;
  }

  /**
   * Check if cached actuals exist and are fresh
   */
  private async checkCache(
    projectId: number,
    startDate: Date,
    endDate: Date
  ): Promise<ActualsData[] | null> {
    const cached = await db.query.actualsCache.findMany({
      where: and(
        eq(actualsCache.projectId, projectId),
        eq(actualsCache.periodStart, startDate),
        eq(actualsCache.periodEnd, endDate)
      ),
    });

    if (cached.length === 0) return null;

    // Check if cache is stale (older than 1 hour)
    const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000);
    const isStale = cached.some((c) => c.calculatedAt < oneHourAgo);

    if (isStale) return null;

    // Convert cache to ActualsData format
    return cached.map((c) => ({
      taskId: c.taskId,
      taskName: null, // Not stored in cache
      totalMinutes: c.totalMinutes,
      totalHours: c.totalMinutes / 60,
      entryCount: c.entryCount,
    }));
  }

  /**
   * Update cache with fresh actuals
   */
  private async updateCache(
    projectId: number,
    startDate: Date,
    endDate: Date,
    actuals: ActualsData[]
  ): Promise<void> {
    // Delete old cache entries
    await db
      .delete(actualsCache)
      .where(
        and(
          eq(actualsCache.projectId, projectId),
          eq(actualsCache.periodStart, startDate),
          eq(actualsCache.periodEnd, endDate)
        )
      );

    // Insert new cache entries
    const cacheEntries = actuals.map((a) => ({
      projectId,
      taskId: a.taskId,
      developerId: null, // Not grouping by developer in this cache
      periodStart: startDate,
      periodEnd: endDate,
      totalMinutes: a.totalMinutes,
      entryCount: a.entryCount,
    }));

    if (cacheEntries.length > 0) {
      await db.insert(actualsCache).values(cacheEntries);
    }
  }
}

// Export singleton instance
export const aggregationEngine = new AggregationEngine();
