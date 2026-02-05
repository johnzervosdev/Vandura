import { z } from 'zod';
import { createTRPCRouter, publicProcedure } from '../trpc';
import { reportService } from '../services/ReportService';
import { actualsReportInputSchema } from '@/lib/validators';

/**
 * Report Router
 * Handles report generation and data export
 */
export const reportRouter = createTRPCRouter({
  // Get Actuals vs Estimates report
  actualsVsEstimates: publicProcedure
    .input(actualsReportInputSchema)
    .query(async ({ input }) => {
      return reportService.getActualsVsEstimates(
        input.projectId,
        input.startDate,
        input.endDate
      );
    }),

  // Get all projects summary
  projectsSummary: publicProcedure.query(async () => {
    return reportService.getAllProjectsSummary();
  }),

  // Get developer productivity report
  developerProductivity: publicProcedure
    .input(
      z.object({
        developerId: z.number().optional(),
        startDate: z.date().optional(),
        endDate: z.date().optional(),
      })
    )
    .query(async ({ input }) => {
      return reportService.getDeveloperProductivity(
        input.developerId,
        input.startDate,
        input.endDate
      );
    }),

  // Get timeline data for charts
  timeline: publicProcedure
    .input(
      z.object({
        projectId: z.number(),
        startDate: z.date(),
        endDate: z.date(),
      })
    )
    .query(async ({ input }) => {
      return reportService.getTimeline(
        input.projectId,
        input.startDate,
        input.endDate
      );
    }),

  // Export report as CSV
  exportCSV: publicProcedure
    .input(
      z.object({
        projectId: z.number(),
        startDate: z.date().optional(),
        endDate: z.date().optional(),
      })
    )
    .mutation(async ({ input }) => {
      const report = await reportService.getActualsVsEstimates(
        input.projectId,
        input.startDate,
        input.endDate
      );

      const csv = reportService.exportToCSV(report);

      return {
        filename: `actuals-report-${input.projectId}-${Date.now()}.csv`,
        content: csv,
      };
    }),
});
