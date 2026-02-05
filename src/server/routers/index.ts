/**
 * Root tRPC Router
 * Combines all sub-routers into a single API
 */

import { createTRPCRouter } from '../trpc';
import { projectRouter } from './project';
import { developerRouter } from './developer';
import { taskRouter } from './task';
import { timesheetRouter } from './timesheet';
import { reportRouter } from './report';

export const appRouter = createTRPCRouter({
  project: projectRouter,
  developer: developerRouter,
  task: taskRouter,
  timesheet: timesheetRouter,
  report: reportRouter,
});

// Export type definition for client
export type AppRouter = typeof appRouter;
