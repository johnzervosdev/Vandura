'use client';

import { useParams } from 'next/navigation';
import { useState } from 'react';
import { trpc } from '@/lib/trpc-client';
import { TasksSection } from './_components/TasksSection';
import { formatProjectBudgetHours, taskEstimatesTotal, taskEstimatesTotalDisplay } from '@/lib/budget-display';

export default function ProjectDetailPage() {
  const params = useParams();
  // Handle Next.js 15: params.id can be string | string[] | undefined
  const idParam = Array.isArray(params?.id) ? params.id[0] : params?.id;
  const projectId = Number(idParam);
  const { data, isLoading, error, refetch } = trpc.project.get.useQuery(
    { id: projectId },
    { enabled: Number.isFinite(projectId), meta: { suppressGlobalError: true } }
  );
  const { data: projectTasks } = trpc.task.listByProject.useQuery(
    { projectId },
    { enabled: Number.isFinite(projectId), meta: { suppressGlobalError: true } }
  );
  const [taskCount, setTaskCount] = useState<number>(0);

  if (!Number.isFinite(projectId)) {
    return <div className="text-destructive">Invalid project id.</div>;
  }

  if (isLoading) return <div>Loading…</div>;
  if (error) {
    return (
      <div className="space-y-4">
        <div className="rounded-md border border-destructive/40 bg-destructive/10 p-4 text-sm">
          <div className="font-medium text-destructive">Failed to load project</div>
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
  if (!data) return <div className="text-muted-foreground">Project not found.</div>;

  const tasks = projectTasks ?? [];
  const budgetLabel = formatProjectBudgetHours(data.estimatedHours);
  const taskTotalLine = taskEstimatesTotalDisplay(tasks);
  const taskSum = taskEstimatesTotal(tasks);
  const budgetNum = data.estimatedHours;
  const showCompare =
    taskSum.kind === 'hours' &&
    typeof budgetNum === 'number' &&
    Math.abs(budgetNum - taskSum.value) > 0.001;

  return (
    <div className="space-y-6">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold">{data.name}</h1>
          {data.description ? <p className="text-muted-foreground mt-2">{data.description}</p> : null}
          <p className="text-sm text-muted-foreground mt-2 max-w-2xl">
            <span className="text-foreground font-medium">Budget</span> (below) is the project hour cap
            from this page&apos;s edit form. <span className="text-foreground font-medium">Task
            estimates</span> on the tasks table are separate roll-ups used for the &quot;Task estimates
            total&quot; line.
          </p>
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
        <div className="rounded-lg border bg-card p-4 md:col-span-2">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <div className="text-sm text-muted-foreground">Budget</div>
              <div className="text-lg font-semibold mt-1">{budgetLabel}</div>
            </div>
            <div>
              <div className="text-sm text-muted-foreground">Task estimates total</div>
              <div className="text-lg font-semibold mt-1">{taskTotalLine}</div>
            </div>
          </div>
          {showCompare && taskSum.kind === 'hours' && typeof budgetNum === 'number' ? (
            <p className="text-sm text-muted-foreground mt-3">
              Task estimates total {taskSum.value.toFixed(1)}h · Project budget {budgetNum.toFixed(1)}h
            </p>
          ) : null}
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




