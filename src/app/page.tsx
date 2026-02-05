'use client';

import { trpc } from '@/lib/trpc-client';

export default function HomePage() {
  const { data: projects, isLoading } = trpc.report.projectsSummary.useQuery();

  if (isLoading) {
    return <div>Loading dashboard...</div>;
  }

  const activeProjects = projects?.filter((p) => p.status === 'active') || [];
  const totalEstimated = activeProjects.reduce((sum, p) => sum + (p.estimatedHours || 0), 0);
  const totalActual = activeProjects.reduce((sum, p) => sum + p.actualHours, 0);
  const totalVariance = totalActual - totalEstimated;
  const variancePercent = totalEstimated > 0 ? (totalVariance / totalEstimated) * 100 : 0;

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-4xl font-bold">Dashboard</h1>
        <p className="text-muted-foreground mt-2">
          Welcome to Project Vandura - Your automated time tracking system
        </p>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-card border rounded-lg p-6">
          <div className="text-sm text-muted-foreground">Active Projects</div>
          <div className="text-3xl font-bold mt-2">{activeProjects.length}</div>
        </div>

        <div className="bg-card border rounded-lg p-6">
          <div className="text-sm text-muted-foreground">Total Estimated Hours</div>
          <div className="text-3xl font-bold mt-2">{totalEstimated.toFixed(1)}h</div>
        </div>

        <div className="bg-card border rounded-lg p-6">
          <div className="text-sm text-muted-foreground">Total Actual Hours</div>
          <div className="text-3xl font-bold mt-2">{totalActual.toFixed(1)}h</div>
        </div>

        <div className="bg-card border rounded-lg p-6">
          <div className="text-sm text-muted-foreground">Variance</div>
          <div className={`text-3xl font-bold mt-2 ${totalVariance > 0 ? 'text-destructive' : 'text-green-600'}`}>
            {totalVariance > 0 ? '+' : ''}{totalVariance.toFixed(1)}h
            <span className="text-sm ml-2">({variancePercent.toFixed(1)}%)</span>
          </div>
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
              No active projects. Create one to get started.
            </p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b">
                    <th className="text-left py-3 px-4">Project</th>
                    <th className="text-right py-3 px-4">Estimated</th>
                    <th className="text-right py-3 px-4">Actual</th>
                    <th className="text-right py-3 px-4">Variance</th>
                    <th className="text-right py-3 px-4">Tasks</th>
                    <th className="text-right py-3 px-4">Team</th>
                  </tr>
                </thead>
                <tbody>
                  {activeProjects.map((project) => (
                    <tr key={project.projectId} className="border-b hover:bg-muted/50">
                      <td className="py-3 px-4">
                        <a href={`/projects/${project.projectId}`} className="font-medium hover:text-primary">
                          {project.projectName}
                        </a>
                      </td>
                      <td className="text-right py-3 px-4">
                        {project.estimatedHours?.toFixed(1) || 'N/A'}h
                      </td>
                      <td className="text-right py-3 px-4">
                        {project.actualHours.toFixed(1)}h
                      </td>
                      <td className={`text-right py-3 px-4 ${project.variance > 0 ? 'text-destructive' : 'text-green-600'}`}>
                        {project.variance > 0 ? '+' : ''}{project.variance.toFixed(1)}h
                        <span className="text-xs ml-1">
                          ({project.variancePercentage.toFixed(0)}%)
                        </span>
                      </td>
                      <td className="text-right py-3 px-4">{project.taskCount}</td>
                      <td className="text-right py-3 px-4">{project.developerCount}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>

      {/* Quick Actions */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <a
          href="/timesheets/upload"
          className="bg-primary text-primary-foreground rounded-lg p-6 hover:bg-primary/90 transition-colors"
        >
          <h3 className="font-semibold text-lg">Upload Timesheet</h3>
          <p className="text-sm mt-1 opacity-90">Import time entries from Excel</p>
        </a>

        <a
          href="/projects"
          className="bg-secondary text-secondary-foreground rounded-lg p-6 hover:bg-secondary/80 transition-colors"
        >
          <h3 className="font-semibold text-lg">Manage Projects</h3>
          <p className="text-sm mt-1">Create and configure projects</p>
        </a>

        <a
          href="/reports"
          className="bg-secondary text-secondary-foreground rounded-lg p-6 hover:bg-secondary/80 transition-colors"
        >
          <h3 className="font-semibold text-lg">View Reports</h3>
          <p className="text-sm mt-1">Generate actuals vs estimates</p>
        </a>
      </div>
    </div>
  );
}
