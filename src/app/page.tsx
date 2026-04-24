'use client';

import Link from 'next/link';
import { trpc } from '@/lib/trpc-client';
import type { ProjectSummaryRow } from '@/lib/router-types';
import { formatProjectBudgetHours, totalActiveProjectBudget } from '@/lib/budget-display';

export default function HomePage() {
  const { data: projects, isLoading, error, refetch } = trpc.report.projectsSummary.useQuery(undefined, {
    meta: { suppressGlobalError: true },
  });

  if (isLoading) {
    return <div>Loading dashboard...</div>;
  }

  if (error && !projects) {
    return (
      <div className="space-y-4">
        <h1 className="text-4xl font-bold">Dashboard</h1>
        <div className="rounded-md border border-destructive/40 bg-destructive/10 p-4 text-sm">
          <div className="font-medium text-destructive">Failed to load dashboard</div>
          <div className="text-muted-foreground mt-1">{error.message}</div>
          <button
            type="button"
            className="mt-3 inline-flex items-center rounded-md border px-3 py-1.5 text-xs"
            onClick={() => refetch()}
          >
            Retry
          </button>
        </div>
      </div>
    );
  }

  const allProjects = projects || [];
  const activeProjects = allProjects.filter((p) => p.status === 'active');
  const hasAnyProjects = allProjects.length > 0;
  const totalBudgetAgg = totalActiveProjectBudget(allProjects);
  const totalActual = activeProjects.reduce((sum: number, p: ProjectSummaryRow) => sum + p.actualHours, 0);
  const totalVariance =
    totalBudgetAgg.kind === 'hours' ? totalActual - totalBudgetAgg.value : null;
  const variancePercent =
    totalBudgetAgg.kind === 'hours' && totalBudgetAgg.value > 0 && totalVariance !== null
      ? (totalVariance / totalBudgetAgg.value) * 100
      : null;

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-4xl font-bold">Dashboard</h1>
        <p className="text-muted-foreground mt-2">
          Welcome to Project Vandura - Your automated time tracking system. The table below shows
          per-project <span className="text-foreground font-medium">budget</span> (hour cap),{' '}
          <span className="text-foreground font-medium">task estimates total</span> (roll-up of task
          hours), and <span className="text-foreground font-medium">actuals</span> from time entries.
        </p>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-card border rounded-lg p-6">
          <div className="text-sm text-muted-foreground">Active Projects</div>
          <div className="text-3xl font-bold mt-2">{activeProjects.length}</div>
        </div>

        <div className="bg-card border rounded-lg p-6">
          <div className="text-sm text-muted-foreground">Total budgeted hours (active projects)</div>
          <div className="text-3xl font-bold mt-2">
            {totalBudgetAgg.kind === 'tbd' ? 'TBD' : `${totalBudgetAgg.value.toFixed(1)}h`}
          </div>
        </div>

        <div className="bg-card border rounded-lg p-6">
          <div className="text-sm text-muted-foreground">Total Actual Hours</div>
          <div className="text-3xl font-bold mt-2">{totalActual.toFixed(1)}h</div>
        </div>

        <div className="bg-card border rounded-lg p-6">
          <div className="text-sm text-muted-foreground">Variance (actual − budget)</div>
          {totalBudgetAgg.kind === 'tbd' || totalVariance === null ? (
            <div className="text-3xl font-bold mt-2 text-muted-foreground">TBD</div>
          ) : (
            <div
              className={`text-3xl font-bold mt-2 ${totalVariance > 0 ? 'text-destructive' : 'text-green-600'}`}
            >
              {totalVariance > 0 ? '+' : ''}
              {totalVariance.toFixed(1)}h
              {variancePercent !== null ? (
                <span className="text-sm ml-2">({variancePercent.toFixed(1)}%)</span>
              ) : null}
            </div>
          )}
        </div>
      </div>

      {/* Projects Table */}
      <div className="bg-card border rounded-lg">
        <div className="p-6 border-b">
          <h2 className="text-xl font-semibold">Active Projects</h2>
        </div>
        <div className="p-6">
          {activeProjects.length === 0 ? (
            <p className="text-muted-foreground text-center py-8">
              {hasAnyProjects
                ? 'No active projects. Create one to get started.'
                : 'No projects yet. Create one to get started.'}
            </p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b">
                    <th className="text-left py-3 px-4">Project</th>
                    <th className="text-right py-3 px-4">Budget</th>
                    <th className="text-right py-3 px-4">Task est. total</th>
                    <th className="text-right py-3 px-4">Actual</th>
                    <th className="text-right py-3 px-4">Variance</th>
                    <th className="text-right py-3 px-4">Tasks</th>
                    <th className="text-right py-3 px-4">Team</th>
                  </tr>
                </thead>
                <tbody>
                  {activeProjects.map((project: ProjectSummaryRow) => {
                    const hasBudget =
                      project.estimatedHours !== null && project.estimatedHours !== undefined;
                    const varianceClass = hasBudget
                      ? project.variance > 0
                        ? 'text-destructive'
                        : 'text-green-600'
                      : 'text-muted-foreground';
                    return (
                      <tr key={project.projectId} className="border-b hover:bg-muted/50">
                        <td className="py-3 px-4">
                          <Link
                            href={`/projects/${project.projectId}`}
                            className="font-medium hover:text-primary"
                          >
                            {project.projectName}
                          </Link>
                        </td>
                        <td className="text-right py-3 px-4">
                          {formatProjectBudgetHours(project.estimatedHours)}
                        </td>
                        <td className="text-right py-3 px-4">
                          {formatProjectBudgetHours(project.taskEstimatesTotal)}
                        </td>
                        <td className="text-right py-3 px-4">
                          {project.actualHours.toFixed(1)}h
                        </td>
                        <td className={`text-right py-3 px-4 ${varianceClass}`}>
                          {hasBudget ? (
                            <>
                              {project.variance > 0 ? '+' : ''}
                              {project.variance.toFixed(1)}h
                              <span className="text-xs ml-1">
                                ({project.variancePercentage.toFixed(0)}%)
                              </span>
                            </>
                          ) : (
                            'TBD'
                          )}
                        </td>
                        <td className="text-right py-3 px-4">{project.taskCount}</td>
                        <td className="text-right py-3 px-4">{project.developerCount}</td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>

      {/* Quick Actions */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Link
          href="/timesheets/upload"
          className="bg-primary text-primary-foreground rounded-lg p-6 hover:bg-primary/90 transition-colors"
        >
          <h3 className="font-semibold text-lg">Upload Timesheet</h3>
          <p className="text-sm mt-1 opacity-90">Import time entries from Excel</p>
        </Link>

        <Link
          href="/projects/new"
          className="bg-secondary text-secondary-foreground rounded-lg p-6 hover:bg-secondary/80 transition-colors"
        >
          <h3 className="font-semibold text-lg">Create Project</h3>
          <p className="text-sm mt-1">Create and configure projects</p>
        </Link>

        <Link
          href="/reports"
          className="bg-secondary text-secondary-foreground rounded-lg p-6 hover:bg-secondary/80 transition-colors"
        >
          <h3 className="font-semibold text-lg">View Reports</h3>
          <p className="text-sm mt-1">Generate actuals vs estimates</p>
        </Link>
      </div>
    </div>
  );
}
