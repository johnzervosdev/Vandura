'use client';

import { useMemo, useState } from 'react';
import { trpc } from '@/lib/trpc-client';
import { Modal } from '@/components/Modal';
import {
  DeveloperForm,
  type DeveloperFormSubmitValues,
  type DeveloperFormValues,
} from './_components/DeveloperForm';

function formatHourlyRate(rate: number | null): string {
  if (rate === null || rate === undefined) return '';
  return String(rate);
}

export default function DevelopersPage() {
  const utils = trpc.useUtils();

  const [activeOnly, setActiveOnly] = useState(true);
  const [toast, setToast] = useState<string | null>(null);

  const devsQuery = trpc.developer.list.useQuery({ activeOnly: false });

  const [createOpen, setCreateOpen] = useState(false);
  const [editDev, setEditDev] = useState<
    | null
    | {
        id: number;
        name: string;
        email: string | null;
        hourlyRate: number | null;
        isActive: boolean;
      }
  >(null);
  const [confirmDeactivate, setConfirmDeactivate] = useState<null | { id: number; name: string }>(
    null
  );

  const createDeveloper = trpc.developer.create.useMutation({
    onSuccess: async () => {
      await utils.developer.list.invalidate();
      setToast('Developer created.');
      setCreateOpen(false);
    },
    onError: (e) => setToast(`Create failed: ${e.message}`),
  });

  const updateDeveloper = trpc.developer.update.useMutation({
    onSuccess: async () => {
      await utils.developer.list.invalidate();
      setToast('Developer updated.');
      setEditDev(null);
      setConfirmDeactivate(null);
    },
    onError: (e) => setToast(`Update failed: ${e.message}`),
  });

  const allDevelopers = devsQuery.data ?? [];
  const visibleDevelopers = useMemo(
    () => (activeOnly ? allDevelopers.filter((d) => d.isActive) : allDevelopers),
    [activeOnly, allDevelopers]
  );

  const emptyState = useMemo(() => {
    if (devsQuery.isLoading) return null;
    if (allDevelopers.length === 0) return 'No developers yet. Add one to get started.';
    if (activeOnly && visibleDevelopers.length === 0) return 'No active developers.';
    return null;
  }, [activeOnly, allDevelopers.length, devsQuery.isLoading, visibleDevelopers.length]);

  async function onCreate(values: DeveloperFormSubmitValues) {
    await createDeveloper.mutateAsync({
      name: values.name,
      email: values.email,
      hourlyRate: values.hourlyRate,
      isActive: true,
    });
  }

  async function onEdit(values: DeveloperFormSubmitValues) {
    if (!editDev) return;
    await updateDeveloper.mutateAsync({
      id: editDev.id,
      data: {
        name: values.name,
        email: values.email,
        hourlyRate: values.hourlyRate,
      },
    });
  }

  async function setDeveloperActive(id: number, isActive: boolean) {
    await updateDeveloper.mutateAsync({
      id,
      data: { isActive },
    });
    if (isActive) setToast('Developer reactivated.');
    else setToast('Developer marked inactive.');
  }

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

      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold">Developers</h1>
          <p className="text-muted-foreground mt-2">Manage who can log time entries.</p>
        </div>
        <button
          type="button"
          className="inline-flex items-center rounded-md bg-primary px-4 py-2 text-primary-foreground"
          onClick={() => setCreateOpen(true)}
        >
          Add Developer
        </button>
      </div>

      <div className="rounded-lg border bg-card p-4">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="inline-flex rounded-md border overflow-hidden">
            <button
              type="button"
              className={`px-3 py-1.5 text-sm ${
                activeOnly ? 'bg-muted font-medium' : 'hover:bg-muted'
              }`}
              onClick={() => setActiveOnly(true)}
            >
              Active only
            </button>
            <button
              type="button"
              className={`px-3 py-1.5 text-sm ${
                !activeOnly ? 'bg-muted font-medium' : 'hover:bg-muted'
              }`}
              onClick={() => setActiveOnly(false)}
            >
              All
            </button>
          </div>

          {devsQuery.isLoading ? <div className="text-sm text-muted-foreground">Loading…</div> : null}
          {devsQuery.error ? (
            <div className="text-sm text-destructive">Failed to load developers: {devsQuery.error.message}</div>
          ) : null}
        </div>
      </div>

      <div className="rounded-lg border bg-card overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b">
              <th className="text-left py-3 px-4">Name</th>
              <th className="text-left py-3 px-4">Email</th>
              <th className="text-left py-3 px-4">Hourly Rate</th>
              <th className="text-left py-3 px-4">Status</th>
              <th className="text-right py-3 px-4">Actions</th>
            </tr>
          </thead>
          <tbody>
            {emptyState ? (
              <tr>
                <td className="py-6 px-4 text-muted-foreground" colSpan={5}>
                  {emptyState}
                </td>
              </tr>
            ) : (
              visibleDevelopers.map((d) => (
                <tr key={d.id} className="border-b last:border-b-0">
                  <td className="py-3 px-4 font-medium">{d.name}</td>
                  <td className="py-3 px-4">{d.email ?? ''}</td>
                  <td className="py-3 px-4">{formatHourlyRate(d.hourlyRate ?? null)}</td>
                  <td className="py-3 px-4">
                    <span
                      className={`inline-flex items-center rounded-md border px-2 py-0.5 text-xs ${
                        d.isActive ? 'border-emerald-500/30 bg-emerald-500/10' : 'border-muted-foreground/30 bg-muted'
                      }`}
                    >
                      {d.isActive ? 'Active' : 'Inactive'}
                    </span>
                  </td>
                  <td className="py-3 px-4 text-right">
                    <div className="inline-flex gap-2">
                      <button
                        type="button"
                        className="rounded-md border px-3 py-1 hover:bg-muted"
                        onClick={() =>
                          setEditDev({
                            id: d.id,
                            name: d.name,
                            email: d.email ?? null,
                            hourlyRate: d.hourlyRate ?? null,
                            isActive: d.isActive,
                          })
                        }
                      >
                        Edit
                      </button>

                      {d.isActive ? (
                        <button
                          type="button"
                          className="rounded-md border border-destructive/40 px-3 py-1 text-destructive hover:bg-destructive/10"
                          onClick={() => setConfirmDeactivate({ id: d.id, name: d.name })}
                        >
                          Deactivate
                        </button>
                      ) : (
                        <button
                          type="button"
                          className="rounded-md border px-3 py-1 hover:bg-muted"
                          onClick={() => setDeveloperActive(d.id, true)}
                          disabled={updateDeveloper.isPending}
                        >
                          Reactivate
                        </button>
                      )}
                    </div>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {createOpen ? (
        <Modal onClose={() => setCreateOpen(false)} closeOnBackdrop showCloseButton>
          <DeveloperForm
            title="New Developer"
            initialValues={
              {
                name: '',
                email: '',
                hourlyRate: '',
              } satisfies DeveloperFormValues
            }
            submitLabel="Create Developer"
            isSubmitting={createDeveloper.isPending}
            submitError={createDeveloper.error?.message ?? null}
            onCancel={() => setCreateOpen(false)}
            onSubmit={onCreate}
          />
        </Modal>
      ) : null}

      {editDev ? (
        <Modal onClose={() => setEditDev(null)} closeOnBackdrop showCloseButton>
          <DeveloperForm
            title={`Edit Developer: ${editDev.name}`}
            initialValues={{
              name: editDev.name,
              email: editDev.email ?? '',
              hourlyRate: editDev.hourlyRate === null || editDev.hourlyRate === undefined ? '' : String(editDev.hourlyRate),
            }}
            submitLabel="Save Changes"
            isSubmitting={updateDeveloper.isPending}
            submitError={updateDeveloper.error?.message ?? null}
            onCancel={() => setEditDev(null)}
            onSubmit={onEdit}
          />
        </Modal>
      ) : null}

      {confirmDeactivate ? (
        <Modal onClose={() => setConfirmDeactivate(null)} closeOnBackdrop>
          <div className="space-y-4">
            <div className="text-lg font-semibold">Mark developer inactive?</div>
            <div className="text-sm text-muted-foreground">
              <div className="text-foreground font-medium">{confirmDeactivate.name}</div>
              <div className="mt-1">
                Mark this developer as inactive? They will no longer appear in time entry dropdowns.
              </div>
            </div>
            <div className="flex items-center justify-end gap-3">
              <button
                type="button"
                className="rounded-md border px-4 py-2"
                onClick={() => setConfirmDeactivate(null)}
                disabled={updateDeveloper.isPending}
              >
                Cancel
              </button>
              <button
                type="button"
                className="rounded-md bg-destructive px-4 py-2 text-destructive-foreground disabled:opacity-50"
                onClick={() => setDeveloperActive(confirmDeactivate.id, false)}
                disabled={updateDeveloper.isPending}
              >
                {updateDeveloper.isPending ? 'Saving…' : 'Mark inactive'}
              </button>
            </div>
          </div>
        </Modal>
      ) : null}
    </div>
  );
}

