'use client';

import { useMemo, useState } from 'react';
import { trpc } from '@/lib/trpc-client';

export default function ReportsPage() {
  const { data, isLoading, error, refetch } = trpc.report.projectsSummary.useQuery();
  const [selectedProjectId, setSelectedProjectId] = useState<string>('');

  const sortedProjects = useMemo(() => {
    if (!data) return [];
    return [...data].sort((a, b) => a.projectName.localeCompare(b.projectName));
  }, [data]);

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-3">
        <div>
          <h1 className="text-3xl font-bold">Reports</h1>
          <p className="text-muted-foreground mt-2">Actuals vs estimates by project.</p>
        </div>
        <a
          href="/reports/productivity"
          className="text-sm font-medium text-primary hover:underline whitespace-nowrap"
        >
          Developer productivity →
        </a>
      </div>

      {isLoading ? <div>Loading…</div> : null}
      {error && !isLoading && !data ? (
        <div className="rounded-md border border-destructive/40 bg-destructive/10 p-3 text-sm">
          <div className="font-medium text-destructive">Failed to load reports</div>
          <div className="text-muted-foreground mt-1">{error.message}</div>
          <button
            type="button"
            className="mt-2 inline-flex items-center rounded-md border px-3 py-1.5 text-xs"
            onClick={() => refetch()}
          >
            Retry
          </button>
        </div>
      ) : null}

      {sortedProjects.length ? (
        <div className="rounded-lg border bg-card p-4 space-y-2">
          <label className="text-sm font-medium">Project</label>
          <div className="flex flex-col sm:flex-row gap-3 sm:items-center">
            <select
              className="rounded-md border bg-background px-3 py-2 text-sm"
              value={selectedProjectId}
              onChange={(e) => {
                const next = e.target.value;
                setSelectedProjectId(next);
                if (next) window.location.href = `/reports/${next}`;
              }}
            >
              <option value="">Select a project…</option>
              {sortedProjects.map((p) => (
                <option key={p.projectId} value={String(p.projectId)}>
                  {p.projectName}
                </option>
              ))}
            </select>
            <div className="text-sm text-muted-foreground">
              Or click a project in the table below.
            </div>
          </div>
        </div>
      ) : null}

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
                data.map((p) => {
                  const hasEstimate =
                    p.estimatedHours !== null && p.estimatedHours !== undefined;
                  const varianceClass = hasEstimate
                    ? p.variance > 0
                      ? 'text-destructive'
                      : 'text-green-600'
                    : 'text-muted-foreground';

                  return (
                    <tr key={p.projectId} className="border-b last:border-b-0">
                      <td className="py-3 px-4">
                        <a
                          className="font-medium hover:underline"
                          href={`/reports/${p.projectId}`}
                        >
                          {p.projectName}
                        </a>
                        <div className="text-xs text-muted-foreground">
                          {p.status}
                        </div>
                      </td>
                      <td className="py-3 px-4 text-right">
                        {hasEstimate ? `${p.estimatedHours!.toFixed(1)}h` : 'N/A'}
                      </td>
                      <td className="py-3 px-4 text-right">
                        {p.actualHours.toFixed(1)}h
                      </td>
                      <td className={`py-3 px-4 text-right ${varianceClass}`}>
                        {hasEstimate ? (
                          <>
                            {p.variance > 0 ? '+' : ''}
                            {p.variance.toFixed(1)}h
                            <span className="text-xs ml-1">
                              ({p.variancePercentage.toFixed(0)}%)
                            </span>
                          </>
                        ) : (
                          'N/A'
                        )}
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      ) : null}
    </div>
  );
}

