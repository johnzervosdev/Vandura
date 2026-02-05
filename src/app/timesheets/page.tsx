'use client';

import { useState } from 'react';
import { trpc } from '@/lib/trpc-client';

export default function TimesheetsPage() {
  const [limit] = useState(50);
  const [offset] = useState(0);

  const { data, isLoading, error } = trpc.timesheet.list.useQuery({
    limit,
    offset,
  });

  return (
    <div className="space-y-6">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold">Timesheets</h1>
          <p className="text-muted-foreground mt-2">Recent time entries.</p>
        </div>
        <a
          href="/timesheets/upload"
          className="inline-flex items-center rounded-md bg-primary px-4 py-2 text-primary-foreground"
        >
          Upload Excel
        </a>
      </div>

      {isLoading ? <div>Loading…</div> : null}
      {error ? <div className="text-destructive">Failed to load entries: {error.message}</div> : null}

      {data ? (
        <div className="rounded-lg border bg-card overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b text-sm">
                <th className="text-left py-3 px-4">ID</th>
                <th className="text-left py-3 px-4">Project</th>
                <th className="text-left py-3 px-4">Developer</th>
                <th className="text-left py-3 px-4">Start</th>
                <th className="text-right py-3 px-4">Minutes</th>
                <th className="text-left py-3 px-4">Description</th>
              </tr>
            </thead>
            <tbody className="text-sm">
              {data.entries.length === 0 ? (
                <tr>
                  <td className="py-6 px-4 text-muted-foreground" colSpan={6}>
                    No time entries yet. Upload an Excel timesheet to get started.
                  </td>
                </tr>
              ) : (
                data.entries.map((e) => (
                  <tr key={e.id} className="border-b last:border-b-0">
                    <td className="py-3 px-4">{e.id}</td>
                    <td className="py-3 px-4">{e.projectId}</td>
                    <td className="py-3 px-4">{e.developerId}</td>
                    <td className="py-3 px-4">{new Date(e.startTime).toLocaleString()}</td>
                    <td className="py-3 px-4 text-right">{e.durationMinutes}</td>
                    <td className="py-3 px-4">{e.description ?? ''}</td>
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

