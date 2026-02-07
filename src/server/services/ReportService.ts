import { aggregationEngine, type ActualsVsEstimates } from './AggregationEngine';
import { db } from '../db';
import { projects, tasks, developers, timeEntries } from '../db/schema';
import { eq, and, gte, lte, desc, sql } from 'drizzle-orm';
import { startOfDay, endOfDay, startOfWeek, endOfWeek } from '@/lib/date-utils';

/**
 * ReportService
 * High-level service for generating various reports
 * Orchestrates data from multiple sources
 */

export interface ProjectSummary {
  projectId: number;
  projectName: string;
  status: string;
  estimatedHours: number | null;
  actualHours: number;
  variance: number;
  variancePercentage: number;
  developerCount: number;
  taskCount: number;
}

export interface DeveloperProductivity {
  developerId: number;
  developerName: string;
  totalHours: number;
  projectCount: number;
  taskCount: number;
  entriesCount: number;
  averageHoursPerDay: number;
}

export interface TimelineData {
  date: Date;
  totalMinutes: number;
  entryCount: number;
}

export class ReportService {
  /**
   * Get Actuals vs Estimates report (wrapper around AggregationEngine)
   */
  async getActualsVsEstimates(
    projectId: number,
    startDate?: Date,
    endDate?: Date
  ): Promise<ActualsVsEstimates> {
    return aggregationEngine.getActualsVsEstimates(projectId, startDate, endDate);
  }

  /**
   * Get summary for all projects
   */
  async getAllProjectsSummary(): Promise<ProjectSummary[]> {
    const allProjects = await db.query.projects.findMany();

    const summaries: ProjectSummary[] = [];

    for (const project of allProjects) {
      try {
        // Get actuals
        const actuals = await aggregationEngine.getActualsVsEstimates(project.id);

        // Count developers
        const developerResult = await db
          .selectDistinct({ developerId: timeEntries.developerId })
          .from(timeEntries)
          .where(eq(timeEntries.projectId, project.id));

        // Count tasks
        const taskResult = await db
          .select()
          .from(tasks)
          .where(eq(tasks.projectId, project.id));

        summaries.push({
          projectId: project.id,
          projectName: project.name,
          status: project.status,
          estimatedHours: project.estimatedHours,
          actualHours: actuals.totalActualHours,
          variance: actuals.variance,
          variancePercentage: actuals.variancePercentage,
          developerCount: developerResult.length,
          taskCount: taskResult.length,
        });
      } catch (error) {
        // Skip projects with errors
        console.error(`Error processing project ${project.id}:`, error);
      }
    }

    return summaries;
  }

  /**
   * Get developer productivity report
   */
  async getDeveloperProductivity(
    developerId?: number,
    startDate?: Date,
    endDate?: Date
  ): Promise<DeveloperProductivity[]> {
    const developerList = developerId
      ? [await db.query.developers.findFirst({ where: eq(developers.id, developerId) })]
      : await db.query.developers.findMany({ where: eq(developers.isActive, true) });

    const productivity: DeveloperProductivity[] = [];

    for (const dev of developerList) {
      if (!dev) continue;

      // Get time entries
      const conditions = [eq(timeEntries.developerId, dev.id)];
      if (startDate) conditions.push(gte(timeEntries.startTime, startDate));
      if (endDate) conditions.push(lte(timeEntries.startTime, endDate));

      const entries = await db
        .select()
        .from(timeEntries)
        .where(and(...conditions));

      // Calculate metrics
      const totalMinutes = entries.reduce((sum, e) => sum + e.durationMinutes, 0);
      const totalHours = totalMinutes / 60;

      const uniqueProjects = new Set(entries.map((e) => e.projectId));
      const uniqueTasks = new Set(entries.map((e) => e.taskId).filter(Boolean));

      // Calculate average hours per day
      const days = new Set(
        entries.map((e) => startOfDay(e.startTime).toISOString())
      );
      const averageHoursPerDay = days.size > 0 ? totalHours / days.size : 0;

      productivity.push({
        developerId: dev.id,
        developerName: dev.name,
        totalHours,
        projectCount: uniqueProjects.size,
        taskCount: uniqueTasks.size,
        entriesCount: entries.length,
        averageHoursPerDay,
      });
    }

    return productivity;
  }

  /**
   * Get timeline data for charts (grouped by day)
   */
  async getTimeline(
    projectId: number,
    startDate: Date,
    endDate: Date
  ): Promise<TimelineData[]> {
    const entries = await db
      .select()
      .from(timeEntries)
      .where(
        and(
          eq(timeEntries.projectId, projectId),
          gte(timeEntries.startTime, startOfDay(startDate)),
          lte(timeEntries.startTime, endOfDay(endDate))
        )
      )
      .orderBy(timeEntries.startTime);

    // Group by day
    const byDay = new Map<string, { totalMinutes: number; count: number }>();

    for (const entry of entries) {
      const dayKey = startOfDay(entry.startTime).toISOString();
      const existing = byDay.get(dayKey) || { totalMinutes: 0, count: 0 };
      existing.totalMinutes += entry.durationMinutes;
      existing.count += 1;
      byDay.set(dayKey, existing);
    }

    // Convert to array
    const timeline: TimelineData[] = [];
    for (const [dateStr, data] of byDay) {
      timeline.push({
        date: new Date(dateStr),
        totalMinutes: data.totalMinutes,
        entryCount: data.count,
      });
    }

    return timeline.sort((a, b) => a.date.getTime() - b.date.getTime());
  }

  /**
   * Export report data to CSV format
   */
  exportToCSV(report: ActualsVsEstimates): string {
    const csvEscape = (value: string) => value.replace(/"/g, '""');
    const csvString = (value: string) => `"${csvEscape(value)}"`;

    const lines: string[] = [];

    // Header
    lines.push('Project Summary');
    lines.push(`Project,${csvString(report.projectName)}`);
    lines.push(`Total Estimated Hours,${report.totalEstimatedHours ?? 'N/A'}`);
    lines.push(`Total Actual Hours,${report.totalActualHours.toFixed(2)}`);
    lines.push(`Variance,${report.variance.toFixed(2)}`);
    lines.push(`Variance %,${report.variancePercentage.toFixed(1)}%`);
    lines.push('');

    // Task breakdown
    lines.push('Task,Estimated Hours,Actual Hours,Variance,Variance %');
    for (const task of report.tasks) {
      lines.push(
        `${csvString(task.taskName)},${task.estimatedHours ?? 'N/A'},${task.actualHours.toFixed(2)},${task.variance.toFixed(2)},${task.variancePercentage.toFixed(1)}%`
      );
    }

    return lines.join('\n');
  }
}

// Export singleton instance
export const reportService = new ReportService();
