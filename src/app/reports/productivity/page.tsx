'use client';

import { useMemo, useState } from 'react';
import { trpc } from '@/lib/trpc-client';
import { type DatePreset, endOfDay, getPresetRange, startOfDay } from '@/lib/date-utils';

const AVG_DAY_TOOLTIP =
  'Average hours per calendar day on which this developer logged at least one entry in the selected range.';

type SortKey =
  | 'developerName'
  | 'totalHours'
  | 'projectCount'
  | 'taskCount'
  | 'averageHoursPerDay'
  | 'entriesCount';

function formatLocalDateInputValue(d: Date): string {
  const yyyy = String(d.getFullYear());
  const mm = String(d.getMonth() + 1).padStart(2, '0');
  const dd = String(d.getDate()).padStart(2, '0');
  return `${yyyy}-${mm}-${dd}`;
}

export default function DeveloperProductivityReportPage() {
  const [preset, setPreset] = useState<DatePreset>('All Time');
  const [startDate, setStartDate] = useState<Date | undefined>(undefined);
  const [endDate, setEndDate] = useState<Date | undefined>(undefined);

  const effectiveStartDate = startDate ? startOfDay(startDate) : undefined;
  const effectiveEndDate = endDate ? endOfDay(endDate) : undefined;

  const { data, isLoading, error, refetch } = trpc.report.developerProductivity.useQuery({
    startDate: effectiveStartDate,
    endDate: effectiveEndDate,
  });

  const [sortKey, setSortKey] = useState<SortKey>('developerName');
  const [sortDir, setSortDir] = useState<'asc' | 'desc'>('asc');

  const totalEntriesInRange = useMemo(
    () => (data ?? []).reduce((s, r) => s + r.entriesCount, 0),
    [data]
  );

  const showNoActiveDevelopers = !isLoading && data && data.length === 0;
  const showNoTimeEntriesInRange =
    !isLoading && data && data.length > 0 && totalEntriesInRange === 0;

  const sortedRows = useMemo(() => {
    if (!data) return [];
    const rows = [...data];
    const dir = sortDir === 'asc' ? 1 : -1;
    rows.sort((a, b) => {
      if (sortKey === 'developerName') return dir * a.developerName.localeCompare(b.developerName);
      if (sortKey === 'totalHours') return dir * (a.totalHours - b.totalHours);
      if (sortKey === 'projectCount') return dir * (a.projectCount - b.projectCount);
      if (sortKey === 'taskCount') return dir * (a.taskCount - b.taskCount);
      if (sortKey === 'averageHoursPerDay')
        return dir * (a.averageHoursPerDay - b.averageHoursPerDay);
      return dir * (a.entriesCount - b.entriesCount);
    });
    return rows;
  }, [data, sortKey, sortDir]);

  function toggleSort(nextKey: SortKey) {
    if (nextKey === sortKey) {
      setSortDir((d) => (d === 'asc' ? 'desc' : 'asc'));
    } else {
      setSortKey(nextKey);
      setSortDir(nextKey === 'developerName' ? 'asc' : 'desc');
    }
  }

  function applyPreset(next: DatePreset) {
    setPreset(next);
    const range = getPresetRange(next, new Date());
    setStartDate(range.startDate);
    setEndDate(range.endDate);
  }

  function sortHeader(label: string, key: SortKey) {
    const active = sortKey === key;
    return (
      <button
        type="button"
        className={`inline-flex items-center gap-1 font-medium hover:underline ${
          active ? 'text-foreground' : 'text-muted-foreground'
        }`}
        onClick={() => toggleSort(key)}
      >
        {label}
        {active ? (sortDir === 'asc' ? ' ↑' : ' ↓') : null}
      </button>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold">Developer productivity</h1>
          <p className="text-muted-foreground mt-2">
            Hours and counts per active developer for the selected range.
          </p>
        </div>
        <a href="/reports" className="text-sm text-muted-foreground hover:underline">
          Back to Reports
        </a>
      </div>

      <div className="rounded-lg border bg-card p-4 space-y-4">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 items-end">
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
          <div className="text-sm text-muted-foreground md:col-span-2">
            Same date boundaries as the Actuals vs Estimates report (inclusive start/end of day).
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="space-y-2">
            <label className="text-sm font-medium">Start date</label>
            <input
              type="date"
              className="w-full rounded-md border bg-background px-3 py-2 text-sm"
              value={effectiveStartDate ? formatLocalDateInputValue(effectiveStartDate) : ''}
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
              value={effectiveEndDate ? formatLocalDateInputValue(effectiveEndDate) : ''}
              onChange={(e) => {
                setPreset('All Time');
                setEndDate(e.target.value ? new Date(`${e.target.value}T00:00:00`) : undefined);
              }}
            />
          </div>
        </div>
      </div>

      {isLoading ? <div>Loading…</div> : null}
      {error && !isLoading && !data ? (
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

      {data && !isLoading ? (
        showNoActiveDevelopers ? (
          <div className="rounded-lg border bg-card p-6 text-sm text-muted-foreground">
            No active developers.
          </div>
        ) : showNoTimeEntriesInRange ? (
          <div className="rounded-lg border bg-card p-6 text-sm text-muted-foreground">
            No time entries in this range.
          </div>
        ) : (
          <div className="rounded-lg border bg-card overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b">
                  <th className="text-left py-3 px-4">{sortHeader('Developer name', 'developerName')}</th>
                  <th className="text-right py-3 px-4">{sortHeader('Total hours', 'totalHours')}</th>
                  <th className="text-right py-3 px-4">
                    {sortHeader('Project count', 'projectCount')}
                  </th>
                  <th className="text-right py-3 px-4">{sortHeader('Task count', 'taskCount')}</th>
                  <th
                    className="text-right py-3 px-4 cursor-help"
                    title={AVG_DAY_TOOLTIP}
                  >
                    {sortHeader('Avg Hours/Active Day', 'averageHoursPerDay')}
                  </th>
                  <th className="text-right py-3 px-4">{sortHeader('Entries', 'entriesCount')}</th>
                </tr>
              </thead>
              <tbody>
                {sortedRows.map((row) => (
                  <tr key={row.developerId} className="border-b last:border-b-0">
                    <td className="py-3 px-4 font-medium">{row.developerName}</td>
                    <td className="py-3 px-4 text-right whitespace-nowrap">
                      {row.totalHours.toFixed(1)}h
                    </td>
                    <td className="py-3 px-4 text-right">{row.projectCount}</td>
                    <td className="py-3 px-4 text-right">{row.taskCount}</td>
                    <td className="py-3 px-4 text-right whitespace-nowrap">
                      {row.averageHoursPerDay.toFixed(1)}h
                    </td>
                    <td className="py-3 px-4 text-right">{row.entriesCount}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )
      ) : null}
    </div>
  );
}
