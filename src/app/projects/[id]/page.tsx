'use client';

import { trpc } from '@/lib/trpc-client';

export default function ProjectDetailPage({ params }: { params: { id: string } }) {
  const projectId = Number(params.id);
  const { data, isLoading, error } = trpc.project.get.useQuery(
    { id: projectId },
    { enabled: Number.isFinite(projectId) }
  );

  if (!Number.isFinite(projectId)) {
    return <div className="text-destructive">Invalid project id.</div>;
  }

  if (isLoading) return <div>Loading…</div>;
  if (error) return <div className="text-destructive">Failed to load: {error.message}</div>;
  if (!data) return <div className="text-muted-foreground">Project not found.</div>;

  return (
    <div className="space-y-6">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold">{data.name}</h1>
          {data.description ? <p className="text-muted-foreground mt-2">{data.description}</p> : null}
        </div>
        <div className="flex gap-3">
          <a
            href={`/reports/${data.id}`}
            className="inline-flex items-center rounded-md bg-secondary px-4 py-2 text-secondary-foreground"
          >
            View Report
          </a>
          <a
            href="/timesheets/upload"
            className="inline-flex items-center rounded-md bg-primary px-4 py-2 text-primary-foreground"
          >
            Upload Timesheet
          </a>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="rounded-lg border bg-card p-4">
          <div className="text-sm text-muted-foreground">Status</div>
          <div className="text-lg font-semibold mt-1">{data.status}</div>
        </div>
        <div className="rounded-lg border bg-card p-4">
          <div className="text-sm text-muted-foreground">Estimated hours</div>
          <div className="text-lg font-semibold mt-1">{data.estimatedHours?.toFixed(1) ?? 'N/A'}h</div>
        </div>
        <div className="rounded-lg border bg-card p-4">
          <div className="text-sm text-muted-foreground">Tasks</div>
          <div className="text-lg font-semibold mt-1">{data.tasks?.length ?? 0}</div>
        </div>
      </div>

      <div className="rounded-lg border bg-card">
        <div className="p-6 border-b">
          <h2 className="text-lg font-semibold">Tasks</h2>
        </div>
        <div className="p-6">
          {data.tasks?.length ? (
            <ul className="space-y-2 text-sm">
              {data.tasks.map((t) => (
                <li key={t.id} className="flex items-center justify-between border rounded-md px-3 py-2">
                  <div>
                    <div className="font-medium">{t.name}</div>
                    <div className="text-muted-foreground">{t.status}</div>
                  </div>
                  <div className="text-muted-foreground">
                    {t.estimatedHours?.toFixed(1) ?? 'N/A'}h
                  </div>
                </li>
              ))}
            </ul>
          ) : (
            <div className="text-muted-foreground text-sm">
              No tasks yet. They’ll be auto-created on Excel import (task names are unique per project).
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

