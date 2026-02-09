'use client';

import { useMemo, useState } from 'react';
import { useParams } from 'next/navigation';
import { trpc } from '@/lib/trpc-client';

function downloadTextFile(filename: string, content: string, mime = 'text/plain') {
  const blob = new Blob([content], { type: mime });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
}

export default function ProjectReportPage() {
  const params = useParams();
  const projectId = Number(params.projectId);
  const enabled = Number.isFinite(projectId);

  const { data, isLoading, error } = trpc.report.actualsVsEstimates.useQuery(
    { projectId, groupBy: 'task' },
    { enabled }
  );

  const exportCsv = trpc.report.exportCSV.useMutation();
  const [exportError, setExportError] = useState<string | null>(null);

  const totals = useMemo(() => {
    if (!data) return null;
    const estimated = data.totalEstimatedHours ?? 0;
    const actual = data.totalActualHours;
    const variance = actual - estimated;
    return { estimated, actual, variance };
  }, [data]);

  async function onExport() {
    setExportError(null);
    if (!enabled) return;
    try {
      const res = await exportCsv.mutateAsync({ projectId });
      downloadTextFile(res.filename, res.content, 'text/csv');
    } catch (e) {
      setExportError(e instanceof Error ? e.message : 'Export failed');
    }
  }

  if (!enabled) return <div className="text-destructive">Invalid project id.</div>;

  return (
    <div className="space-y-6">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold">Actuals vs Estimates</h1>
          <p className="text-muted-foreground mt-2">Project #{projectId}</p>
        </div>
        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={onExport}
            disabled={exportCsv.isPending}
            className="inline-flex items-center rounded-md bg-secondary px-4 py-2 text-secondary-foreground disabled:opacity-50"
          >
            {exportCsv.isPending ? 'Exporting…' : 'Export CSV'}
          </button>
          <a href="/reports" className="text-sm text-muted-foreground hover:underline">
            Back to Reports
          </a>
        </div>
      </div>

      {isLoading ? <div>Loading…</div> : null}
      {error ? <div className="text-destructive">Failed to load: {error.message}</div> : null}
      {exportError ? <div className="text-destructive">Export failed: {exportError}</div> : null}

      {data && totals ? (
        <>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="rounded-lg border bg-card p-4">
              <div className="text-sm text-muted-foreground">Estimated</div>
              <div className="text-2xl font-bold mt-1">{(data.totalEstimatedHours ?? 0).toFixed(1)}h</div>
            </div>
            <div className="rounded-lg border bg-card p-4">
              <div className="text-sm text-muted-foreground">Actual</div>
              <div className="text-2xl font-bold mt-1">{data.totalActualHours.toFixed(1)}h</div>
            </div>
            <div className="rounded-lg border bg-card p-4">
              <div className="text-sm text-muted-foreground">Variance</div>
              <div className={`text-2xl font-bold mt-1 ${data.variance > 0 ? 'text-destructive' : 'text-green-600'}`}>
                {data.variance > 0 ? '+' : ''}
                {data.variance.toFixed(1)}h
                <span className="text-sm ml-2">({data.variancePercentage.toFixed(1)}%)</span>
              </div>
            </div>
          </div>

          <div className="rounded-lg border bg-card overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b">
                  <th className="text-left py-3 px-4">Task</th>
                  <th className="text-right py-3 px-4">Estimated</th>
                  <th className="text-right py-3 px-4">Actual</th>
                  <th className="text-right py-3 px-4">Variance</th>
                </tr>
              </thead>
              <tbody>
                {data.tasks.length === 0 ? (
                  <tr>
                    <td className="py-6 px-4 text-muted-foreground" colSpan={4}>
                      No tasks found for this project yet.
                    </td>
                  </tr>
                ) : (
                  data.tasks.map((t) => (
                    <tr key={t.taskId} className="border-b last:border-b-0">
                      <td className="py-3 px-4">{t.taskName}</td>
                      <td className="py-3 px-4 text-right">{t.estimatedHours?.toFixed(1) ?? 'N/A'}h</td>
                      <td className="py-3 px-4 text-right">{t.actualHours.toFixed(1)}h</td>
                      <td className={`py-3 px-4 text-right ${t.variance > 0 ? 'text-destructive' : 'text-green-600'}`}>
                        {t.variance > 0 ? '+' : ''}
                        {t.variance.toFixed(1)}h
                        <span className="text-xs ml-1">({t.variancePercentage.toFixed(0)}%)</span>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </>
      ) : null}
    </div>
  );
}

