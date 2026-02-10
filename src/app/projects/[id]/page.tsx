'use client';

import { useParams } from 'next/navigation';
import { useState } from 'react';
import { trpc } from '@/lib/trpc-client';
import { TasksSection } from './_components/TasksSection';

export default function ProjectDetailPage() {
  const params = useParams();
  // Handle Next.js 15: params.id can be string | string[] | undefined
  const idParam = Array.isArray(params?.id) ? params.id[0] : params?.id;
  const projectId = Number(idParam);
  const { data, isLoading, error } = trpc.project.get.useQuery(
    { id: projectId },
    { enabled: Number.isFinite(projectId) }
  );
  const [taskCount, setTaskCount] = useState<number>(0);

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
              href={`/projects/${data.id}/edit`}
              className="inline-flex items-center rounded-md border px-4 py-2 hover:bg-muted"
            >
              Edit Project
            </a>
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
          <div className="text-lg font-semibold mt-1">
            {data.estimatedHours === null || data.estimatedHours === undefined
              ? 'N/A'
              : `${data.estimatedHours.toFixed(1)}h`}
          </div>
        </div>
        <div className="rounded-lg border bg-card p-4">
          <div className="text-sm text-muted-foreground">Tasks</div>
          <div className="text-lg font-semibold mt-1">{taskCount}</div>
        </div>
      </div>

      <TasksSection projectId={projectId} onTaskCountChange={setTaskCount} />
    </div>
  );
}



