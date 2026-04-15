import type { inferRouterOutputs } from '@trpc/server';
import type { AppRouter } from '@/server/routers';

export type ProjectSummaryRow = inferRouterOutputs<AppRouter>['report']['projectsSummary'][number];
export type TimesheetListData = inferRouterOutputs<AppRouter>['timesheet']['list'];
export type TimesheetListEntry = TimesheetListData['entries'][number];
export type DeveloperProductivityRow =
  inferRouterOutputs<AppRouter>['report']['developerProductivity'][number];
export type TaskByProjectRow = inferRouterOutputs<AppRouter>['task']['listByProject'][number];
export type DeveloperListRow = inferRouterOutputs<AppRouter>['developer']['list'][number];
export type ProjectListRow = inferRouterOutputs<AppRouter>['project']['list'][number];
