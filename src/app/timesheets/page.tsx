'use client';

import { useMemo, useState } from 'react';
import { trpc } from '@/lib/trpc-client';
import { Modal } from '@/components/Modal';
import { type DatePreset, endOfDay, formatMinutesHumanReadable, getPresetRange, startOfDay } from '@/lib/date-utils';
import type {
  DeveloperListRow,
  ProjectListRow,
  TaskByProjectRow,
  TimesheetListData,
  TimesheetListEntry,
} from '@/lib/router-types';

export default function TimesheetsPage() {
  const utils = trpc.useUtils();
  const limit = 100;
  const [offset, setOffset] = useState(0);

  const [filterProjectId, setFilterProjectId] = useState<number | undefined>(undefined);
  const [filterDeveloperId, setFilterDeveloperId] = useState<number | undefined>(undefined);
  const [preset, setPreset] = useState<DatePreset>('All Time');
  const [startDate, setStartDate] = useState<Date | undefined>(undefined);
  const [endDate, setEndDate] = useState<Date | undefined>(undefined);

  const effectiveStartDate = startDate ? startOfDay(startDate) : undefined;
  const effectiveEndDate = endDate ? endOfDay(endDate) : undefined;

  const { data, isLoading, error, refetch } = trpc.timesheet.list.useQuery(
    {
      projectId: filterProjectId,
      developerId: filterDeveloperId,
      startDate: effectiveStartDate,
      endDate: effectiveEndDate,
      limit,
      offset,
    },
    { meta: { suppressGlobalError: true } }
  );

  const allDevelopers = trpc.developer.list.useQuery(
    { activeOnly: false },
    { meta: { suppressGlobalError: true } }
  );
  const activeDevelopers = trpc.developer.list.useQuery(
    { activeOnly: true },
    { meta: { suppressGlobalError: true } }
  );
  const allProjects = trpc.project.list.useQuery(undefined, { meta: { suppressGlobalError: true } });
  const activeProjects = trpc.project.list.useQuery(
    { status: 'active' },
    { meta: { suppressGlobalError: true } }
  );

  const [createOpen, setCreateOpen] = useState(false);
  const [editOpen, setEditOpen] = useState(false);
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [selectedId, setSelectedId] = useState<number | null>(null);
  const listData = data as TimesheetListData | undefined;

  const selectedEntry = useMemo(() => {
    if (!listData || selectedId === null) return null;
    return listData.entries.find((e: TimesheetListEntry) => e.id === selectedId) ?? null;
  }, [listData, selectedId]);

  const [formDeveloperId, setFormDeveloperId] = useState<number | undefined>(undefined);
  const [formProjectId, setFormProjectId] = useState<number | undefined>(undefined);
  const [formTaskId, setFormTaskId] = useState<number | undefined>(undefined);
  const [formDate, setFormDate] = useState<string>('');
  const [formTime, setFormTime] = useState<string>('');
  const [formDurationMinutes, setFormDurationMinutes] = useState<number>(60);
  const [formDescription, setFormDescription] = useState<string>('');
  const [submitAttempted, setSubmitAttempted] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);

  const tasksByProject = trpc.task.listByProject.useQuery(
    { projectId: formProjectId ?? 0 },
    {
      enabled: typeof formProjectId === 'number' && Number.isFinite(formProjectId),
      meta: { suppressGlobalError: true },
    }
  );

  const createEntry = trpc.timesheet.create.useMutation({
    meta: { suppressGlobalToast: true },
  });
  const updateEntry = trpc.timesheet.update.useMutation({
    meta: { suppressGlobalToast: true },
  });
  const deleteEntry = trpc.timesheet.delete.useMutation({
    meta: { suppressGlobalToast: true },
  });

  const durationOptions = useMemo(() => {
    const out: number[] = [];
    for (let m = 15; m <= 480; m += 15) out.push(m);
    return out;
  }, []);

  function formatLocalDateInputValue(d: Date): string {
    const yyyy = String(d.getFullYear());
    const mm = String(d.getMonth() + 1).padStart(2, '0');
    const dd = String(d.getDate()).padStart(2, '0');
    return `${yyyy}-${mm}-${dd}`;
  }

  function clearForm() {
    setSubmitAttempted(false);
    setFormError(null);
    setFormDeveloperId(undefined);
    setFormProjectId(undefined);
    setFormTaskId(undefined);
    setFormDate('');
    setFormTime('');
    setFormDurationMinutes(60);
    setFormDescription('');
  }

  function openCreate() {
    clearForm();
    setSelectedId(null);
    setCreateOpen(true);
  }

  function openEdit(id: number) {
    const entry = listData?.entries.find((e: TimesheetListEntry) => e.id === id);
    if (!entry) return;
    clearForm();
    setSelectedId(id);
    setFormDeveloperId(entry.developerId);
    setFormProjectId(entry.projectId);
    // taskId can be null in existing data (Excel imports); manual entry requires it.
    setFormTaskId(entry.taskId ?? undefined);
    const dt = new Date(entry.startTime);
    setFormDate(formatLocalDateInputValue(dt));
    setFormTime(
      `${String(dt.getHours()).padStart(2, '0')}:${String(dt.getMinutes()).padStart(2, '0')}`
    );
    setFormDurationMinutes(entry.durationMinutes);
    setFormDescription(entry.description ?? '');
    setEditOpen(true);
  }

  function openDelete(id: number) {
    setSelectedId(id);
    setDeleteOpen(true);
  }

  function applyPreset(next: DatePreset) {
    setPreset(next);
    const range = getPresetRange(next, new Date());
    setStartDate(range.startDate);
    setEndDate(range.endDate);
    setOffset(0);
  }

  const formHasErrors =
    !formDeveloperId ||
    !formProjectId ||
    !formTaskId ||
    !formDate ||
    !formTime ||
    !formDurationMinutes;

  async function onSubmitCreateOrEdit(isEdit: boolean) {
    setSubmitAttempted(true);
    setFormError(null);

    if (formHasErrors) return;

    const startTime = new Date(`${formDate}T${formTime}:00`);
    if (Number.isNaN(startTime.getTime())) {
      setFormError('Invalid date/time.');
      return;
    }

    try {
      if (isEdit) {
        if (!selectedId) return;
        await updateEntry.mutateAsync({
          id: selectedId,
          data: {
            developerId: formDeveloperId!,
            projectId: formProjectId!,
            taskId: formTaskId!,
            startTime,
            durationMinutes: formDurationMinutes,
            description: formDescription || undefined,
          },
        });
      } else {
        await createEntry.mutateAsync({
          developerId: formDeveloperId!,
          projectId: formProjectId!,
          taskId: formTaskId!,
          startTime,
          durationMinutes: formDurationMinutes,
          description: formDescription || undefined,
        });
        setOffset(0);
      }

      await utils.timesheet.list.invalidate();
      await utils.report.projectsSummary.invalidate();
      setCreateOpen(false);
      setEditOpen(false);
    } catch (e) {
      setFormError(e instanceof Error ? e.message : 'Save failed');
    }
  }

  async function onConfirmDelete() {
    setFormError(null);
    if (!selectedId) return;
    try {
      await deleteEntry.mutateAsync({ id: selectedId });
      await utils.timesheet.list.invalidate();
      await utils.report.projectsSummary.invalidate();
      setDeleteOpen(false);
      setSelectedId(null);
    } catch (e) {
      setFormError(e instanceof Error ? e.message : 'Delete failed');
    }
  }

  // Reset task when project changes (required by AC)
  const taskOptions = useMemo(() => {
    return tasksByProject.data ?? [];
  }, [tasksByProject.data]);

  return (
    <div className="space-y-6">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold">Timesheets</h1>
          <p className="text-muted-foreground mt-2">Recent time entries.</p>
        </div>
        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={openCreate}
            className="inline-flex items-center rounded-md bg-primary px-4 py-2 text-primary-foreground"
          >
            Add Entry
          </button>
          <a
            href="/timesheets/upload"
            className="inline-flex items-center rounded-md border px-4 py-2 text-sm"
          >
            Upload Excel
          </a>
        </div>
      </div>

      <div className="rounded-lg border bg-card p-4 space-y-4">
        <div className="grid grid-cols-1 lg:grid-cols-5 gap-4 items-end">
          <div className="space-y-2">
            <label className="text-sm font-medium">Project</label>
            <select
              className="w-full rounded-md border bg-background px-3 py-2 text-sm"
              value={filterProjectId ? String(filterProjectId) : ''}
              onChange={(e) => {
                const v = e.target.value ? Number(e.target.value) : undefined;
                setFilterProjectId(v);
                setOffset(0);
              }}
            >
              <option value="">All projects</option>
              {(allProjects.data ?? []).map((p: ProjectListRow) => (
                <option key={p.id} value={String(p.id)}>
                  {p.name}
                </option>
              ))}
            </select>
          </div>

          <div className="space-y-2">
            <label className="text-sm font-medium">Developer</label>
            <select
              className="w-full rounded-md border bg-background px-3 py-2 text-sm"
              value={filterDeveloperId ? String(filterDeveloperId) : ''}
              onChange={(e) => {
                const v = e.target.value ? Number(e.target.value) : undefined;
                setFilterDeveloperId(v);
                setOffset(0);
              }}
            >
              <option value="">All developers</option>
              {(allDevelopers.data ?? []).map((d: DeveloperListRow) => (
                <option key={d.id} value={String(d.id)}>
                  {d.name}
                </option>
              ))}
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

          <div className="space-y-2">
            <label className="text-sm font-medium">Start</label>
            <input
              type="date"
              className="w-full rounded-md border bg-background px-3 py-2 text-sm"
              value={effectiveStartDate ? formatLocalDateInputValue(effectiveStartDate) : ''}
              onChange={(e) => {
                setPreset('All Time');
                setStartDate(e.target.value ? new Date(`${e.target.value}T00:00:00`) : undefined);
                setOffset(0);
              }}
            />
          </div>

          <div className="space-y-2">
            <label className="text-sm font-medium">End</label>
            <input
              type="date"
              className="w-full rounded-md border bg-background px-3 py-2 text-sm"
              value={effectiveEndDate ? formatLocalDateInputValue(effectiveEndDate) : ''}
              onChange={(e) => {
                setPreset('All Time');
                setEndDate(e.target.value ? new Date(`${e.target.value}T00:00:00`) : undefined);
                setOffset(0);
              }}
            />
          </div>
        </div>
      </div>

      {isLoading ? <div>Loading…</div> : null}
      {error ? (
        <div className="rounded-md border border-destructive/40 bg-destructive/10 p-3 text-sm">
          <div className="font-medium text-destructive">Failed to load entries</div>
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

      {listData ? (
        <div className="rounded-lg border bg-card overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b text-sm">
                <th className="text-left py-3 px-4">Date</th>
                <th className="text-left py-3 px-4">Developer</th>
                <th className="text-left py-3 px-4">Project</th>
                <th className="text-left py-3 px-4">Task</th>
                <th className="text-right py-3 px-4">Duration</th>
                <th className="text-left py-3 px-4">Description</th>
                <th className="text-right py-3 px-4">Actions</th>
              </tr>
            </thead>
            <tbody className="text-sm">
              {listData.entries.length === 0 ? (
                <tr>
                  <td className="py-6 px-4 text-muted-foreground" colSpan={7}>
                    No time entries found.
                  </td>
                </tr>
              ) : (
                listData.entries.map((e: TimesheetListEntry) => (
                  <tr key={e.id} className="border-b last:border-b-0">
                    <td className="py-3 px-4 whitespace-nowrap">
                      <div>{new Date(e.startTime).toLocaleDateString()}</div>
                      <div className="text-xs text-muted-foreground">
                        {new Date(e.startTime).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                      </div>
                    </td>
                    <td className="py-3 px-4">{e.developerName}</td>
                    <td className="py-3 px-4">{e.projectName}</td>
                    <td className="py-3 px-4">{e.taskName ?? ''}</td>
                    <td className="py-3 px-4 text-right whitespace-nowrap">
                      {formatMinutesHumanReadable(e.durationMinutes)}
                    </td>
                    <td className="py-3 px-4">{e.description ?? ''}</td>
                    <td className="py-3 px-4 text-right whitespace-nowrap">
                      <button
                        type="button"
                        className="text-sm hover:underline"
                        onClick={() => openEdit(e.id)}
                      >
                        Edit
                      </button>
                      <span className="mx-2 text-muted-foreground">|</span>
                      <button
                        type="button"
                        className="text-sm text-destructive hover:underline"
                        onClick={() => openDelete(e.id)}
                      >
                        Delete
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      ) : null}

      {listData ? (
        <div className="flex items-center justify-between text-sm text-muted-foreground">
          <div>
            Showing {listData.entries.length ? offset + 1 : 0}–{offset + listData.entries.length} of{' '}
            {listData.total}
          </div>
          <div className="flex items-center gap-2">
            <button
              type="button"
              className="rounded-md border px-3 py-1.5 disabled:opacity-50"
              disabled={offset === 0}
              onClick={() => setOffset((o) => Math.max(0, o - limit))}
            >
              Prev
            </button>
            <button
              type="button"
              className="rounded-md border px-3 py-1.5 disabled:opacity-50"
              disabled={!listData.hasMore}
              onClick={() => setOffset((o) => o + limit)}
            >
              Next
            </button>
          </div>
        </div>
      ) : null}

      {createOpen ? (
        <Modal
          onClose={() => setCreateOpen(false)}
          closeOnBackdrop
          showCloseButton
          maxWidthClassName="max-w-2xl"
        >
          <div className="space-y-4">
            <div className="text-lg font-semibold">Add Time Entry</div>

            {formError ? (
              <div className="rounded-md border border-destructive/40 bg-destructive/10 p-3 text-sm">
                <div className="font-medium text-destructive">Save failed</div>
                <div className="text-muted-foreground mt-1">{formError}</div>
              </div>
            ) : null}

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <label className={`text-sm font-medium ${submitAttempted && !formDeveloperId ? 'text-destructive' : ''}`}>
                  Developer *
                </label>
                <select
                  className="w-full rounded-md border bg-background px-3 py-2 text-sm"
                  value={formDeveloperId ? String(formDeveloperId) : ''}
                  onChange={(e) => setFormDeveloperId(e.target.value ? Number(e.target.value) : undefined)}
                >
                  <option value="">Select developer…</option>
                  {(activeDevelopers.data?.filter((d: DeveloperListRow) => d.isActive) ?? []).map(
                    (d: DeveloperListRow) => (
                    <option key={d.id} value={String(d.id)}>
                      {d.name}
                    </option>
                  )
                  )}
                </select>
                {submitAttempted && !formDeveloperId ? (
                  <div className="text-xs text-destructive">Developer is required.</div>
                ) : null}
                <a href="/developers" className="text-xs text-muted-foreground hover:underline">
                  Manage developers →
                </a>
              </div>

              <div className="space-y-2">
                <label className={`text-sm font-medium ${submitAttempted && !formProjectId ? 'text-destructive' : ''}`}>
                  Project *
                </label>
                <select
                  className="w-full rounded-md border bg-background px-3 py-2 text-sm"
                  value={formProjectId ? String(formProjectId) : ''}
                  onChange={(e) => {
                    const next = e.target.value ? Number(e.target.value) : undefined;
                    setFormProjectId(next);
                    setFormTaskId(undefined);
                  }}
                >
                  <option value="">Select project…</option>
                  {(activeProjects.data ?? []).map((p: ProjectListRow) => (
                    <option key={p.id} value={String(p.id)}>
                      {p.name}
                    </option>
                  ))}
                </select>
                {submitAttempted && !formProjectId ? (
                  <div className="text-xs text-destructive">Project is required.</div>
                ) : null}
              </div>

              <div className="space-y-2 md:col-span-2">
                <label className={`text-sm font-medium ${submitAttempted && !formTaskId ? 'text-destructive' : ''}`}>
                  Task *
                </label>
                <select
                  className="w-full rounded-md border bg-background px-3 py-2 text-sm"
                  value={formTaskId ? String(formTaskId) : ''}
                  onChange={(e) => setFormTaskId(e.target.value ? Number(e.target.value) : undefined)}
                  disabled={!formProjectId || tasksByProject.isLoading}
                >
                  <option value="">{formProjectId ? 'Select task…' : 'Select a project first…'}</option>
                  {taskOptions.map((t: TaskByProjectRow) => (
                    <option key={t.id} value={String(t.id)}>
                      {t.name}
                    </option>
                  ))}
                </select>
                {submitAttempted && !formTaskId ? (
                  <div className="text-xs text-destructive">Task is required.</div>
                ) : null}
              </div>

              <div className="space-y-2">
                <label className={`text-sm font-medium ${submitAttempted && !formDate ? 'text-destructive' : ''}`}>
                  Date *
                </label>
                <input
                  type="date"
                  className="w-full rounded-md border bg-background px-3 py-2 text-sm"
                  value={formDate}
                  onChange={(e) => setFormDate(e.target.value)}
                />
                {submitAttempted && !formDate ? (
                  <div className="text-xs text-destructive">Date is required.</div>
                ) : null}
              </div>

              <div className="space-y-2">
                <label className={`text-sm font-medium ${submitAttempted && !formTime ? 'text-destructive' : ''}`}>
                  Start time *
                </label>
                <input
                  type="time"
                  className="w-full rounded-md border bg-background px-3 py-2 text-sm"
                  value={formTime}
                  onChange={(e) => setFormTime(e.target.value)}
                />
                {submitAttempted && !formTime ? (
                  <div className="text-xs text-destructive">Start time is required.</div>
                ) : null}
              </div>

              <div className="space-y-2">
                <label className={`text-sm font-medium ${submitAttempted && !formDurationMinutes ? 'text-destructive' : ''}`}>
                  Duration *
                </label>
                <select
                  className="w-full rounded-md border bg-background px-3 py-2 text-sm"
                  value={String(formDurationMinutes)}
                  onChange={(e) => setFormDurationMinutes(Number(e.target.value))}
                >
                  {durationOptions.map((m) => (
                    <option key={m} value={String(m)}>
                      {m} min
                    </option>
                  ))}
                </select>
              </div>

              <div className="space-y-2 md:col-span-2">
                <label className="text-sm font-medium">Description</label>
                <textarea
                  className="w-full rounded-md border bg-background px-3 py-2 text-sm min-h-24"
                  value={formDescription}
                  onChange={(e) => setFormDescription(e.target.value)}
                  placeholder="Optional notes…"
                />
              </div>
            </div>

            <div className="flex items-center justify-end gap-3 pt-2">
              <button
                type="button"
                className="rounded-md border px-4 py-2"
                onClick={() => setCreateOpen(false)}
                disabled={createEntry.isPending}
              >
                Cancel
              </button>
              <button
                type="button"
                className="rounded-md bg-primary px-4 py-2 text-primary-foreground disabled:opacity-50"
                onClick={() => onSubmitCreateOrEdit(false)}
                disabled={createEntry.isPending}
              >
                {createEntry.isPending ? 'Saving…' : 'Save'}
              </button>
            </div>
          </div>
        </Modal>
      ) : null}

      {editOpen && selectedEntry ? (
        <Modal
          onClose={() => setEditOpen(false)}
          closeOnBackdrop
          showCloseButton
          maxWidthClassName="max-w-2xl"
        >
          <div className="space-y-4">
            <div className="text-lg font-semibold">Edit Time Entry</div>

            {formError ? (
              <div className="rounded-md border border-destructive/40 bg-destructive/10 p-3 text-sm">
                <div className="font-medium text-destructive">Save failed</div>
                <div className="text-muted-foreground mt-1">{formError}</div>
              </div>
            ) : null}

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <label className={`text-sm font-medium ${submitAttempted && !formDeveloperId ? 'text-destructive' : ''}`}>
                  Developer *
                </label>
                <select
                  className="w-full rounded-md border bg-background px-3 py-2 text-sm"
                  value={formDeveloperId ? String(formDeveloperId) : ''}
                  onChange={(e) => setFormDeveloperId(e.target.value ? Number(e.target.value) : undefined)}
                >
                  <option value="">Select developer…</option>
                  {(activeDevelopers.data?.filter((d: DeveloperListRow) => d.isActive) ?? []).map(
                    (d: DeveloperListRow) => (
                    <option key={d.id} value={String(d.id)}>
                      {d.name}
                    </option>
                  )
                  )}
                </select>
                {submitAttempted && !formDeveloperId ? (
                  <div className="text-xs text-destructive">Developer is required.</div>
                ) : null}
                <a href="/developers" className="text-xs text-muted-foreground hover:underline">
                  Manage developers →
                </a>
              </div>

              <div className="space-y-2">
                <label className={`text-sm font-medium ${submitAttempted && !formProjectId ? 'text-destructive' : ''}`}>
                  Project *
                </label>
                <select
                  className="w-full rounded-md border bg-background px-3 py-2 text-sm"
                  value={formProjectId ? String(formProjectId) : ''}
                  onChange={(e) => {
                    const next = e.target.value ? Number(e.target.value) : undefined;
                    setFormProjectId(next);
                    setFormTaskId(undefined);
                  }}
                >
                  <option value="">Select project…</option>
                  {(activeProjects.data ?? []).map((p: ProjectListRow) => (
                    <option key={p.id} value={String(p.id)}>
                      {p.name}
                    </option>
                  ))}
                </select>
                {submitAttempted && !formProjectId ? (
                  <div className="text-xs text-destructive">Project is required.</div>
                ) : null}
              </div>

              <div className="space-y-2 md:col-span-2">
                <label className={`text-sm font-medium ${submitAttempted && !formTaskId ? 'text-destructive' : ''}`}>
                  Task *
                </label>
                <select
                  className="w-full rounded-md border bg-background px-3 py-2 text-sm"
                  value={formTaskId ? String(formTaskId) : ''}
                  onChange={(e) => setFormTaskId(e.target.value ? Number(e.target.value) : undefined)}
                  disabled={!formProjectId || tasksByProject.isLoading}
                >
                  <option value="">{formProjectId ? 'Select task…' : 'Select a project first…'}</option>
                  {taskOptions.map((t: TaskByProjectRow) => (
                    <option key={t.id} value={String(t.id)}>
                      {t.name}
                    </option>
                  ))}
                </select>
                {submitAttempted && !formTaskId ? (
                  <div className="text-xs text-destructive">Task is required.</div>
                ) : null}
              </div>

              <div className="space-y-2">
                <label className={`text-sm font-medium ${submitAttempted && !formDate ? 'text-destructive' : ''}`}>
                  Date *
                </label>
                <input
                  type="date"
                  className="w-full rounded-md border bg-background px-3 py-2 text-sm"
                  value={formDate}
                  onChange={(e) => setFormDate(e.target.value)}
                />
                {submitAttempted && !formDate ? (
                  <div className="text-xs text-destructive">Date is required.</div>
                ) : null}
              </div>

              <div className="space-y-2">
                <label className={`text-sm font-medium ${submitAttempted && !formTime ? 'text-destructive' : ''}`}>
                  Start time *
                </label>
                <input
                  type="time"
                  className="w-full rounded-md border bg-background px-3 py-2 text-sm"
                  value={formTime}
                  onChange={(e) => setFormTime(e.target.value)}
                />
                {submitAttempted && !formTime ? (
                  <div className="text-xs text-destructive">Start time is required.</div>
                ) : null}
              </div>

              <div className="space-y-2">
                <label className={`text-sm font-medium ${submitAttempted && !formDurationMinutes ? 'text-destructive' : ''}`}>
                  Duration *
                </label>
                <select
                  className="w-full rounded-md border bg-background px-3 py-2 text-sm"
                  value={String(formDurationMinutes)}
                  onChange={(e) => setFormDurationMinutes(Number(e.target.value))}
                >
                  {durationOptions.map((m) => (
                    <option key={m} value={String(m)}>
                      {m} min
                    </option>
                  ))}
                </select>
              </div>

              <div className="space-y-2 md:col-span-2">
                <label className="text-sm font-medium">Description</label>
                <textarea
                  className="w-full rounded-md border bg-background px-3 py-2 text-sm min-h-24"
                  value={formDescription}
                  onChange={(e) => setFormDescription(e.target.value)}
                  placeholder="Optional notes…"
                />
              </div>
            </div>

            <div className="flex items-center justify-end gap-3 pt-2">
              <button
                type="button"
                className="rounded-md border px-4 py-2"
                onClick={() => setEditOpen(false)}
                disabled={updateEntry.isPending}
              >
                Cancel
              </button>
              <button
                type="button"
                className="rounded-md bg-primary px-4 py-2 text-primary-foreground disabled:opacity-50"
                onClick={() => onSubmitCreateOrEdit(true)}
                disabled={updateEntry.isPending}
              >
                {updateEntry.isPending ? 'Saving…' : 'Save'}
              </button>
            </div>
          </div>
        </Modal>
      ) : null}

      {deleteOpen && selectedEntry ? (
        <Modal onClose={() => setDeleteOpen(false)} closeOnBackdrop showCloseButton>
          <div className="space-y-4">
            <div className="text-lg font-semibold">Delete time entry</div>
            <div className="text-sm text-muted-foreground">
              Delete this time entry? This cannot be undone.
            </div>

            {formError ? (
              <div className="rounded-md border border-destructive/40 bg-destructive/10 p-3 text-sm">
                <div className="font-medium text-destructive">Delete failed</div>
                <div className="text-muted-foreground mt-1">{formError}</div>
              </div>
            ) : null}

            <div className="flex items-center justify-end gap-3">
              <button
                type="button"
                className="rounded-md border px-4 py-2"
                onClick={() => setDeleteOpen(false)}
                disabled={deleteEntry.isPending}
              >
                Cancel
              </button>
              <button
                type="button"
                className="rounded-md bg-destructive px-4 py-2 text-destructive-foreground disabled:opacity-50"
                onClick={onConfirmDelete}
                disabled={deleteEntry.isPending}
              >
                {deleteEntry.isPending ? 'Deleting…' : 'Delete'}
              </button>
            </div>
          </div>
        </Modal>
      ) : null}
    </div>
  );
}

