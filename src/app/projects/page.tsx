'use client';

import { useEffect, useState } from 'react';
import { useSearchParams } from 'next/navigation';
import { trpc } from '@/lib/trpc-client';
import { Modal } from './_components/Modal';

export default function ProjectsPage() {
  const utils = trpc.useUtils();
  const searchParams = useSearchParams();
  const created = searchParams.get('created');
  const updated = searchParams.get('updated');
  const deleted = searchParams.get('deleted');

  const { data: summaries, isLoading, error } = trpc.report.projectsSummary.useQuery();

  const [toast, setToast] = useState<string | null>(null);
  const [confirmDelete, setConfirmDelete] = useState<{
    projectId: number;
    projectName: string;
  } | null>(null);

  useEffect(() => {
    // Map query params to a one-time message (simple MVP pattern).
    if (created) setToast('Project created successfully.');
    else if (updated) setToast('Project updated successfully.');
    else if (deleted) setToast('Project deleted successfully.');
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const deleteProject = trpc.project.delete.useMutation({
    onSuccess: async () => {
      await utils.report.projectsSummary.invalidate();
      setConfirmDelete(null);
      setToast('Project deleted successfully.');
    },
    onError: (e) => setToast(`Delete failed: ${e.message}`),
  });

  const updateProject = trpc.project.update.useMutation({
    onSuccess: async () => {
      await utils.report.projectsSummary.invalidate();
      setToast('Status updated.');
    },
    onError: (e) => setToast(`Update failed: ${e.message}`),
  });

  const rows = summaries ?? [];

  return (
    <div className="space-y-8">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold">Projects</h1>
          <p className="text-muted-foreground mt-2">
            Manage projects and track estimated vs actual hours.
          </p>
        </div>
        <a
          href="/projects/new"
          className="inline-flex items-center rounded-md bg-primary px-4 py-2 text-primary-foreground"
        >
          New Project
        </a>
      </div>

      {toast ? (
        <div className="rounded-md border bg-card p-3 text-sm flex items-start justify-between gap-3">
          <div>{toast}</div>
          <button
            type="button"
            className="text-muted-foreground hover:underline"
            onClick={() => setToast(null)}
          >
            Dismiss
          </button>
        </div>
      ) : null}

      <div className="rounded-lg border bg-card">
        <div className="p-6 border-b">
          <h2 className="text-lg font-semibold">All Projects</h2>
        </div>

        <div className="p-6">
          {isLoading ? <div>Loading…</div> : null}
          {error ? <div className="text-destructive">Failed to load: {error.message}</div> : null}

          {rows.length === 0 && !isLoading ? (
            <div className="text-muted-foreground">No projects yet. Create one to get started.</div>
          ) : null}

          {rows.length > 0 ? (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b">
                    <th className="text-left py-3 px-4">Name</th>
                    <th className="text-left py-3 px-4">Status</th>
                    <th className="text-right py-3 px-4">Estimated Hours</th>
                    <th className="text-right py-3 px-4">Actual Hours</th>
                    <th className="text-right py-3 px-4">Variance</th>
                    <th className="text-right py-3 px-4">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {rows.map((p) => (
                    <tr key={p.projectId} className="border-b last:border-b-0">
                      <td className="py-3 px-4">
                        <a className="font-medium hover:underline" href={`/projects/${p.projectId}`}>
                          {p.projectName}
                        </a>
                      </td>
                      <td className="py-3 px-4">
                        <select
                          className="rounded-md border bg-background px-2 py-1 text-sm"
                          value={p.status}
                          onChange={(e) =>
                            updateProject.mutate({
                              id: p.projectId,
                              data: {
                                status: e.target.value as 'active' | 'completed' | 'on-hold' | 'cancelled',
                              },
                            })
                          }
                        >
                          <option value="active">active</option>
                          <option value="completed">completed</option>
                          <option value="on-hold">on-hold</option>
                          <option value="cancelled">cancelled</option>
                        </select>
                      </td>
                      <td className="py-3 px-4 text-right">
                        {p.estimatedHours === null || p.estimatedHours === undefined ? 'N/A' : `${p.estimatedHours.toFixed(1)}h`}
                      </td>
                      <td className="py-3 px-4 text-right">{p.actualHours.toFixed(1)}h</td>
                      <td className={`py-3 px-4 text-right ${p.variance > 0 ? 'text-destructive' : 'text-green-600'}`}>
                        {p.variance > 0 ? '+' : ''}
                        {p.variance.toFixed(1)}h
                      </td>
                      <td className="py-3 px-4 text-right">
                        <div className="inline-flex gap-2">
                          <a
                            className="rounded-md border px-3 py-1 hover:bg-muted"
                            href={`/projects/${p.projectId}/edit`}
                          >
                            Edit
                          </a>
                          <button
                            type="button"
                            className="rounded-md border border-destructive/40 px-3 py-1 text-destructive hover:bg-destructive/10"
                            onClick={() =>
                              setConfirmDelete({ projectId: p.projectId, projectName: p.projectName })
                            }
                          >
                            Delete
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : null}
        </div>
      </div>

      {confirmDelete ? (
        <Modal onClose={() => setConfirmDelete(null)} maxWidthClassName="max-w-md">
          <div className="space-y-4">
            <div className="text-lg font-semibold">Delete project?</div>
            <div className="text-sm text-muted-foreground">
              <div className="text-foreground font-medium">{confirmDelete.projectName}</div>
              <div className="mt-1">This will delete all tasks and time entries. Continue?</div>
            </div>
            <div className="flex items-center justify-end gap-3">
              <button
                type="button"
                className="rounded-md border px-4 py-2"
                onClick={() => setConfirmDelete(null)}
                disabled={deleteProject.isPending}
              >
                Cancel
              </button>
              <button
                type="button"
                className="rounded-md bg-destructive px-4 py-2 text-destructive-foreground disabled:opacity-50"
                disabled={deleteProject.isPending}
                onClick={() => deleteProject.mutate({ id: confirmDelete.projectId })}
              >
                {deleteProject.isPending ? 'Deleting…' : 'Delete'}
              </button>
            </div>
          </div>
        </Modal>
      ) : null}
    </div>
  );
}

