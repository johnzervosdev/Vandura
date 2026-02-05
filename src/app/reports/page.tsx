'use client';

import { trpc } from '@/lib/trpc-client';

export default function ReportsPage() {
  const { data, isLoading, error } = trpc.report.projectsSummary.useQuery();

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold">Reports</h1>
        <p className="text-muted-foreground mt-2">Actuals vs estimates by project.</p>
      </div>

      {isLoading ? <div>Loading…</div> : null}
      {error ? <div className="text-destructive">Failed to load: {error.message}</div> : null}

      {data ? (
        <div className="rounded-lg border bg-card overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b">
                <th className="text-left py-3 px-4">Project</th>
                <th className="text-right py-3 px-4">Estimated</th>
                <th className="text-right py-3 px-4">Actual</th>
                <th className="text-right py-3 px-4">Variance</th>
              </tr>
            </thead>
            <tbody>
              {data.length === 0 ? (
                <tr>
                  <td className="py-6 px-4 text-muted-foreground" colSpan={4}>
                    No data yet. Create a project and import a timesheet.
                  </td>
                </tr>
              ) : (
                data.map((p) => (
                  <tr key={p.projectId} className="border-b last:border-b-0">
                    <td className="py-3 px-4">
                      <a className="font-medium hover:underline" href={`/reports/${p.projectId}`}>
                        {p.projectName}
                      </a>
                      <div className="text-xs text-muted-foreground">{p.status}</div>
                    </td>
                    <td className="py-3 px-4 text-right">{p.estimatedHours?.toFixed(1) ?? 'N/A'}h</td>
                    <td className="py-3 px-4 text-right">{p.actualHours.toFixed(1)}h</td>
                    <td className={`py-3 px-4 text-right ${p.variance > 0 ? 'text-destructive' : 'text-green-600'}`}>
                      {p.variance > 0 ? '+' : ''}
                      {p.variance.toFixed(1)}h
                      <span className="text-xs ml-1">({p.variancePercentage.toFixed(0)}%)</span>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      ) : null}
    </div>
  );
}

