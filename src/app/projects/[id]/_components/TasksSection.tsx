'use client';

import { useEffect, useMemo, useState } from 'react';
import { trpc } from '@/lib/trpc-client';
import {
  TaskForm,
  type TaskFormSubmitValues,
  type TaskFormValues,
  type TaskStatus,
} from '../../_components/TaskForm';
import { Modal } from '@/components/Modal';

export function TasksSection({
  projectId,
  onTaskCountChange,
}: {
  projectId: number;
  onTaskCountChange?: (count: number) => void;
}) {
  const utils = trpc.useUtils();

  const {
    data: tasks,
    isLoading: tasksLoading,
    error: tasksError,
  } = trpc.task.listByProject.useQuery(
    { projectId },
    { enabled: Number.isFinite(projectId) }
  );

  const [toast, setToast] = useState<string | null>(null);
  const [createOpen, setCreateOpen] = useState(false);
  const [editTask, setEditTask] = useState<
    | null
    | {
        id: number;
        name: string;
        description: string | null;
        estimatedHours: number | null;
        status: TaskStatus;
      }
  >(null);
  const [confirmDelete, setConfirmDelete] = useState<null | { id: number; name: string }>(null);

  const createTask = trpc.task.create.useMutation({
    onSuccess: async () => {
      await utils.task.listByProject.invalidate({ projectId });
      setToast('Task created.');
      setCreateOpen(false);
    },
    onError: (e) => setToast(`Create failed: ${e.message}`),
  });

  const updateTask = trpc.task.update.useMutation({
    onSuccess: async () => {
      await utils.task.listByProject.invalidate({ projectId });
      setToast('Task updated.');
      setEditTask(null);
    },
    onError: (e) => setToast(`Update failed: ${e.message}`),
  });

  const deleteTask = trpc.task.delete.useMutation({
    onSuccess: async () => {
      await utils.task.listByProject.invalidate({ projectId });
      setToast('Task deleted.');
      setConfirmDelete(null);
    },
    onError: (e) => setToast(`Delete failed: ${e.message}`),
  });

  const taskRows = tasks ?? [];
  const taskCount = useMemo(() => taskRows.length, [taskRows.length]);

  useEffect(() => {
    onTaskCountChange?.(taskCount);
  }, [onTaskCountChange, taskCount]);

  return (
    <div className="space-y-6">
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
        <div className="p-6 border-b flex items-center justify-between gap-4">
          <h2 className="text-lg font-semibold">Tasks</h2>
          <button
            type="button"
            className="inline-flex items-center rounded-md bg-primary px-4 py-2 text-primary-foreground"
            onClick={() => setCreateOpen(true)}
          >
            Add Task
          </button>
        </div>
        <div className="p-6">
          {tasksLoading ? <div>Loading…</div> : null}
          {tasksError ? (
            <div className="text-destructive text-sm">Failed to load tasks: {tasksError.message}</div>
          ) : null}

          {!tasksLoading && taskRows.length === 0 ? (
            <div className="text-muted-foreground text-sm">No tasks yet. Add one to get started.</div>
          ) : null}

          {taskRows.length > 0 ? (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b">
                    <th className="text-left py-3 px-4">Name</th>
                    <th className="text-left py-3 px-4">Status</th>
                    <th className="text-right py-3 px-4">Estimated Hours</th>
                    <th className="text-right py-3 px-4">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {taskRows.map((t) => (
                    <tr key={t.id} className="border-b last:border-b-0">
                      <td className="py-3 px-4">
                        <div className="font-medium">{t.name}</div>
                        {t.description ? (
                          <div className="text-muted-foreground text-xs mt-1">{t.description}</div>
                        ) : null}
                      </td>
                      <td className="py-3 px-4">
                        <select
                          className="rounded-md border bg-background px-2 py-1 text-sm"
                          value={t.status}
                          onChange={(e) =>
                            updateTask.mutate({
                              id: t.id,
                              data: { status: e.target.value as TaskStatus },
                            })
                          }
                          disabled={updateTask.isPending}
                        >
                          <option value="pending">pending</option>
                          <option value="in-progress">in-progress</option>
                          <option value="completed">completed</option>
                          <option value="blocked">blocked</option>
                        </select>
                      </td>
                      <td className="py-3 px-4 text-right">
                        {t.estimatedHours === null || t.estimatedHours === undefined
                          ? 'N/A'
                          : `${t.estimatedHours.toFixed(1)}h`}
                      </td>
                      <td className="py-3 px-4 text-right">
                        <div className="inline-flex gap-2">
                          <button
                            type="button"
                            className="rounded-md border px-3 py-1 hover:bg-muted"
                            onClick={() =>
                              setEditTask({
                                id: t.id,
                                name: t.name,
                                description: t.description ?? null,
                                estimatedHours: t.estimatedHours ?? null,
                                status: t.status as TaskStatus,
                              })
                            }
                          >
                            Edit
                          </button>
                          <button
                            type="button"
                            className="rounded-md border border-destructive/40 px-3 py-1 text-destructive hover:bg-destructive/10"
                            onClick={() => setConfirmDelete({ id: t.id, name: t.name })}
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

      {createOpen ? (
        <Modal onClose={() => setCreateOpen(false)} closeOnBackdrop showCloseButton>
          <TaskForm
            title="New Task"
            initialValues={
              {
                name: '',
                description: '',
                estimatedHours: '',
                status: 'pending',
              } satisfies TaskFormValues
            }
            submitLabel="Create Task"
            isSubmitting={createTask.isPending}
            submitError={createTask.error?.message ?? null}
            onCancel={() => setCreateOpen(false)}
            onSubmit={async (values: TaskFormSubmitValues) => {
              await createTask.mutateAsync({
                projectId,
                ...values,
              });
            }}
          />
        </Modal>
      ) : null}

      {editTask ? (
        <Modal onClose={() => setEditTask(null)} closeOnBackdrop showCloseButton>
          <TaskForm
            title={`Edit Task: ${editTask.name}`}
            initialValues={{
              name: editTask.name,
              description: editTask.description ?? '',
              estimatedHours:
                editTask.estimatedHours === null || editTask.estimatedHours === undefined
                  ? ''
                  : String(editTask.estimatedHours),
              status: editTask.status,
            }}
            submitLabel="Save Changes"
            isSubmitting={updateTask.isPending}
            submitError={updateTask.error?.message ?? null}
            onCancel={() => setEditTask(null)}
            onSubmit={async (values: TaskFormSubmitValues) => {
              await updateTask.mutateAsync({ id: editTask.id, data: values });
            }}
          />
        </Modal>
      ) : null}

      {confirmDelete ? (
        <Modal onClose={() => setConfirmDelete(null)} closeOnBackdrop>
          <div className="space-y-4">
            <div className="text-lg font-semibold">Delete task?</div>
            <div className="text-sm text-muted-foreground">
              <div className="text-foreground font-medium">{confirmDelete.name}</div>
              <div className="mt-1">
                Delete this task? Time entries linked to this task will become unassigned.
              </div>
            </div>
            <div className="flex items-center justify-end gap-3">
              <button
                type="button"
                className="rounded-md border px-4 py-2"
                onClick={() => setConfirmDelete(null)}
                disabled={deleteTask.isPending}
              >
                Cancel
              </button>
              <button
                type="button"
                className="rounded-md bg-destructive px-4 py-2 text-destructive-foreground disabled:opacity-50"
                disabled={deleteTask.isPending}
                onClick={() => deleteTask.mutate({ id: confirmDelete.id })}
              >
                {deleteTask.isPending ? 'Deleting…' : 'Delete'}
              </button>
            </div>
          </div>
        </Modal>
      ) : null}
    </div>
  );
}

