'use client';

import Link from 'next/link';
import { useMemo, useState } from 'react';
import { useParams } from 'next/navigation';
import { trpc } from '@/lib/trpc-client';
import type { ProjectSummaryRow } from '@/lib/router-types';
import { type DatePreset, endOfDay, getPresetRange, startOfDay } from '@/lib/date-utils';
import { formatProjectBudgetHours, formatTaskEstimatedHours } from '@/lib/budget-display';

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
  const rawProjectId = Array.isArray((params as any)?.projectId)
    ? (params as any).projectId[0]
    : (params as any)?.projectId;
  const projectId = Number(rawProjectId);
  const enabled = Number.isFinite(projectId);

  const projectsSummary = trpc.report.projectsSummary.useQuery(undefined, {
    staleTime: 30_000,
    meta: { suppressGlobalError: true },
  });

  const [preset, setPreset] = useState<DatePreset>('All Time');
  const [startDate, setStartDate] = useState<Date | undefined>(undefined);
  const [endDate, setEndDate] = useState<Date | undefined>(undefined);

  const effectiveStartDate = startDate ? startOfDay(startDate) : undefined;
  const effectiveEndDate = endDate ? endOfDay(endDate) : undefined;

  const { data, isLoading, error, refetch } = trpc.report.actualsVsEstimates.useQuery(
    {
      projectId,
      startDate: effectiveStartDate,
      endDate: effectiveEndDate,
      groupBy: 'task',
    },
    { enabled, meta: { suppressGlobalError: true } }
  );

  const exportCsv = trpc.report.exportCSV.useMutation({
    meta: { suppressGlobalToast: true },
  });
  const [exportError, setExportError] = useState<string | null>(null);

  const [sortKey, setSortKey] = useState<
    'taskName' | 'estimatedHours' | 'actualHours' | 'variance' | 'variancePercentage'
  >('variance');
  const [sortDir, setSortDir] = useState<'asc' | 'desc'>('desc');

  const totals = useMemo(() => {
    if (!data) return null;
    const budget = data.totalEstimatedHours;
    const actual = data.totalActualHours;
    const hasBudget = budget !== null && budget !== undefined;
    const variance = hasBudget ? actual - budget : null;
    return { budget, actual, variance, hasBudget };
  }, [data]);

  const projectRow = useMemo(() => {
    return projectsSummary.data?.find((p) => p.projectId === projectId) ?? null;
  }, [projectsSummary.data, projectId]);

  const sortedTasks = useMemo(() => {
    if (!data) return [];
    const rows = [...data.tasks];
    const dir = sortDir === 'asc' ? 1 : -1;
    const numberOrNullLast = (v: number | null | undefined) =>
      v === null || v === undefined ? Number.POSITIVE_INFINITY : v;

    rows.sort((a, b) => {
      if (sortKey === 'taskName') return dir * a.taskName.localeCompare(b.taskName);
      if (sortKey === 'estimatedHours') return dir * (numberOrNullLast(a.estimatedHours) - numberOrNullLast(b.estimatedHours));
      if (sortKey === 'actualHours') return dir * (a.actualHours - b.actualHours);
      if (sortKey === 'variance') return dir * (a.variance - b.variance);
      return dir * (a.variancePercentage - b.variancePercentage);
    });

    return rows;
  }, [data, sortKey, sortDir]);

  function toggleSort(nextKey: typeof sortKey) {
    if (nextKey === sortKey) {
      setSortDir((d) => (d === 'asc' ? 'desc' : 'asc'));
    } else {
      setSortKey(nextKey);
      setSortDir('desc');
    }
  }

  function applyPreset(next: DatePreset) {
    setPreset(next);
    const range = getPresetRange(next, new Date());
    setStartDate(range.startDate);
    setEndDate(range.endDate);
  }

  async function onExport() {
    setExportError(null);
    if (!enabled) return;
    try {
      const res = await exportCsv.mutateAsync({
        projectId,
        startDate: effectiveStartDate,
        endDate: effectiveEndDate,
      });
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
          <p className="text-muted-foreground mt-2">
            Project #{projectId} — project row uses <span className="text-foreground">budget</span>; task
            rows use per-task <span className="text-foreground">estimated</span> hours.
          </p>
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
          <Link href="/reports" className="text-sm text-muted-foreground hover:underline">
            Back to Reports
          </Link>
        </div>
      </div>

      <div className="rounded-lg border bg-card p-4 space-y-4">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 items-end">
          <div className="space-y-2">
            <label className="text-sm font-medium">Project</label>
            <select
              className="w-full rounded-md border bg-background px-3 py-2 text-sm"
              value={String(projectId)}
              onChange={(e) => {
                const next = e.target.value;
                if (next) window.location.href = `/reports/${next}`;
              }}
            >
              {projectsSummary.data?.map((p: ProjectSummaryRow) => (
                <option key={p.projectId} value={String(p.projectId)}>
                  {p.projectName}
                </option>
              )) ?? (
                <option value={String(projectId)}>Project #{projectId}</option>
              )}
            </select>
          </div>

          <div className="space-y-2">
            <label className="text-sm font-medium">Preset</label>
            <select
              className="w-full rounded-md border bg-background px-3 py-2 text-sm"
              value={preset}
              onChange={(e) => applyPreset(e.target.value as DatePreset)}
            >
              <option value="All Time">All Time</option>
              <option value="Last 7 Days">Last 7 Days</option>
              <option value="Last 30 Days">Last 30 Days</option>
              <option value="This Month">This Month</option>
            </select>
          </div>

          <div className="text-sm text-muted-foreground">
            Filters apply to both the report and CSV export. CSV column names are documented in the README
            (project budget vs task estimates).
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="space-y-2">
            <label className="text-sm font-medium">Start date</label>
            <input
              type="date"
              className="w-full rounded-md border bg-background px-3 py-2 text-sm"
              value={effectiveStartDate ? effectiveStartDate.toISOString().slice(0, 10) : ''}
              onChange={(e) => {
                setPreset('All Time');
                setStartDate(e.target.value ? new Date(`${e.target.value}T00:00:00`) : undefined);
              }}
            />
          </div>
          <div className="space-y-2">
            <label className="text-sm font-medium">End date</label>
            <input
              type="date"
              className="w-full rounded-md border bg-background px-3 py-2 text-sm"
              value={effectiveEndDate ? effectiveEndDate.toISOString().slice(0, 10) : ''}
              onChange={(e) => {
                setPreset('All Time');
                setEndDate(e.target.value ? new Date(`${e.target.value}T00:00:00`) : undefined);
              }}
            />
          </div>
        </div>
      </div>

      {isLoading ? <div>Loading…</div> : null}
      {error ? (
        <div className="rounded-md border border-destructive/40 bg-destructive/10 p-3 text-sm">
          <div className="font-medium text-destructive">Failed to load report</div>
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
      {exportError ? (
        <div className="rounded-md border border-destructive/40 bg-destructive/10 p-3 text-sm">
          <div className="font-medium text-destructive">Export failed</div>
          <div className="text-muted-foreground mt-1">{exportError}</div>
        </div>
      ) : null}

      {data && totals ? (
        <>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <div className="rounded-lg border bg-card p-4">
              <div className="text-sm text-muted-foreground">Budget (project)</div>
              <div className="text-2xl font-bold mt-1">
                {formatProjectBudgetHours(data.totalEstimatedHours)}
              </div>
            </div>
            <div className="rounded-lg border bg-card p-4">
              <div className="text-sm text-muted-foreground">Task est. total</div>
              <div className="text-2xl font-bold mt-1">
                {projectsSummary.isLoading
                  ? '…'
                  : projectRow
                    ? formatProjectBudgetHours(projectRow.taskEstimatesTotal)
                    : '—'}
              </div>
            </div>
            <div className="rounded-lg border bg-card p-4">
              <div className="text-sm text-muted-foreground">Actual</div>
              <div className="text-2xl font-bold mt-1">{data.totalActualHours.toFixed(1)}h</div>
            </div>
            <div className="rounded-lg border bg-card p-4">
              <div className="text-sm text-muted-foreground">Variance</div>
              {totals.hasBudget ? (
                <div
                  className={`text-2xl font-bold mt-1 ${
                    data.variance > 0 ? 'text-destructive' : 'text-green-600'
                  }`}
                >
                  {data.variance > 0 ? '+' : ''}
                  {data.variance.toFixed(1)}h
                  <span className="text-sm ml-2">
                    ({data.variancePercentage.toFixed(1)}%)
                  </span>
                </div>
              ) : (
                <div className="text-2xl font-bold mt-1 text-muted-foreground">
                  TBD
                </div>
              )}
            </div>
          </div>

          <div className="rounded-lg border bg-card overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b">
                  <th className="text-left py-3 px-4">
                    <button type="button" className="hover:underline" onClick={() => toggleSort('taskName')}>
                      Task
                    </button>
                  </th>
                  <th className="text-right py-3 px-4">
                    <button type="button" className="hover:underline" onClick={() => toggleSort('estimatedHours')}>
                      Est. (task)
                    </button>
                  </th>
                  <th className="text-right py-3 px-4">
                    <button type="button" className="hover:underline" onClick={() => toggleSort('actualHours')}>
                      Actual
                    </button>
                  </th>
                  <th className="text-right py-3 px-4">
                    <button type="button" className="hover:underline" onClick={() => toggleSort('variance')}>
                      Variance
                    </button>
                  </th>
                </tr>
              </thead>
              <tbody>
                {data.totalActualHours === 0 ? (
                  <tr>
                    <td className="py-6 px-4 text-muted-foreground" colSpan={4}>
                      No time entries found for this project in the selected date range.
                    </td>
                  </tr>
                ) : (
                  sortedTasks.map((t) => {
                    const taskHasEstimate =
                      t.estimatedHours !== null && t.estimatedHours !== undefined;
                    const varianceClass = taskHasEstimate
                      ? t.variance > 0
                        ? 'text-destructive'
                        : 'text-green-600'
                      : 'text-muted-foreground';

                    return (
                      <tr key={t.taskId} className="border-b last:border-b-0">
                        <td className="py-3 px-4">{t.taskName}</td>
                        <td className="py-3 px-4 text-right">
                          {formatTaskEstimatedHours(t.estimatedHours)}
                        </td>
                        <td className="py-3 px-4 text-right">
                          {t.actualHours.toFixed(1)}h
                        </td>
                        <td className={`py-3 px-4 text-right ${varianceClass}`}>
                          {taskHasEstimate ? (
                            <>
                              {t.variance > 0 ? '+' : ''}
                              {t.variance.toFixed(1)}h
                              <span className="text-xs ml-1">
                                ({t.variancePercentage.toFixed(0)}%)
                              </span>
                            </>
                          ) : (
                            'TBD'
                          )}
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        </>
      ) : null}
    </div>
  );
}

