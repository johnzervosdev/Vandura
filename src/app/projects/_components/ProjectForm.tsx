'use client';

import { useMemo, useState } from 'react';

export type ProjectStatus = 'active' | 'completed' | 'on-hold' | 'cancelled';

export interface ProjectFormValues {
  name: string;
  description: string;
  estimatedHours: string; // keep as string for input control
  startDate: string; // YYYY-MM-DD
  endDate: string; // YYYY-MM-DD
  status: ProjectStatus;
}

export interface ProjectFormSubmitValues {
  name: string;
  description?: string;
  estimatedHours?: number;
  startDate?: Date;
  endDate?: Date;
  status: ProjectStatus;
}

function parseLocalDate(dateStr: string): Date {
  // Treat as local date (no timezone conversion expectations for this MVP).
  return new Date(`${dateStr}T00:00:00`);
}

export function ProjectForm({
  title,
  initialValues,
  submitLabel,
  isSubmitting,
  onSubmit,
  submitError,
}: {
  title: string;
  initialValues: ProjectFormValues;
  submitLabel: string;
  isSubmitting: boolean;
  onSubmit: (values: ProjectFormSubmitValues) => void | Promise<void>;
  submitError?: string | null;
}) {
  const [values, setValues] = useState<ProjectFormValues>(initialValues);
  const [fieldErrors, setFieldErrors] = useState<Partial<Record<keyof ProjectFormValues, string>>>(
    {}
  );

  const canSubmit = useMemo(() => !isSubmitting, [isSubmitting]);

  function validate(v: ProjectFormValues) {
    const next: Partial<Record<keyof ProjectFormValues, string>> = {};

    if (!v.name.trim()) next.name = 'Name is required';

    if (v.estimatedHours.trim()) {
      const n = Number(v.estimatedHours);
      if (!Number.isFinite(n)) next.estimatedHours = 'Estimated hours must be a number';
      else if (n < 0) next.estimatedHours = 'Estimated hours must be 0 or greater';
    }

    return next;
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const nextErrors = validate(values);
    setFieldErrors(nextErrors);
    if (Object.keys(nextErrors).length > 0) return;

    const payload: ProjectFormSubmitValues = {
      name: values.name.trim(),
      description: values.description.trim() ? values.description.trim() : undefined,
      estimatedHours: values.estimatedHours.trim() ? Number(values.estimatedHours) : undefined,
      startDate: values.startDate ? parseLocalDate(values.startDate) : undefined,
      endDate: values.endDate ? parseLocalDate(values.endDate) : undefined,
      status: values.status,
    };

    await onSubmit(payload);
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold">{title}</h1>
        <p className="text-muted-foreground mt-2">Fields marked required must be filled in.</p>
      </div>

      <form onSubmit={handleSubmit} className="rounded-lg border bg-card p-6 space-y-5">
        {submitError ? (
          <div className="rounded-md border border-destructive/40 bg-destructive/10 p-3 text-sm">
            <div className="font-medium text-destructive">Error</div>
            <div className="text-muted-foreground mt-1">{submitError}</div>
          </div>
        ) : null}

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="space-y-2">
            <label className="text-sm font-medium">
              Name <span className="text-destructive">*</span>
            </label>
            <input
              className="w-full rounded-md border bg-background px-3 py-2 text-sm"
              value={values.name}
              onChange={(e) => setValues((s) => ({ ...s, name: e.target.value }))}
              placeholder="e.g. Project Alpha"
            />
            {fieldErrors.name ? <div className="text-sm text-destructive">{fieldErrors.name}</div> : null}
          </div>

          <div className="space-y-2">
            <label className="text-sm font-medium">Status</label>
            <select
              className="w-full rounded-md border bg-background px-3 py-2 text-sm"
              value={values.status}
              onChange={(e) => setValues((s) => ({ ...s, status: e.target.value as ProjectStatus }))}
            >
              <option value="active">active</option>
              <option value="completed">completed</option>
              <option value="on-hold">on-hold</option>
              <option value="cancelled">cancelled</option>
            </select>
          </div>

          <div className="space-y-2 md:col-span-2">
            <label className="text-sm font-medium">Description</label>
            <textarea
              className="w-full rounded-md border bg-background px-3 py-2 text-sm min-h-24"
              value={values.description}
              onChange={(e) => setValues((s) => ({ ...s, description: e.target.value }))}
              placeholder="Optional notes about the project"
            />
          </div>

          <div className="space-y-2">
            <label className="text-sm font-medium">Estimated Hours (optional)</label>
            <input
              className="w-full rounded-md border bg-background px-3 py-2 text-sm"
              value={values.estimatedHours}
              onChange={(e) => setValues((s) => ({ ...s, estimatedHours: e.target.value }))}
              inputMode="decimal"
              placeholder="e.g. 120"
            />
            {fieldErrors.estimatedHours ? (
              <div className="text-sm text-destructive">{fieldErrors.estimatedHours}</div>
            ) : null}
          </div>

          <div className="space-y-2">
            <label className="text-sm font-medium">Start Date (optional)</label>
            <input
              type="date"
              className="w-full rounded-md border bg-background px-3 py-2 text-sm"
              value={values.startDate}
              onChange={(e) => setValues((s) => ({ ...s, startDate: e.target.value }))}
            />
          </div>

          <div className="space-y-2">
            <label className="text-sm font-medium">End Date (optional)</label>
            <input
              type="date"
              className="w-full rounded-md border bg-background px-3 py-2 text-sm"
              value={values.endDate}
              onChange={(e) => setValues((s) => ({ ...s, endDate: e.target.value }))}
            />
          </div>
        </div>

        <div className="flex items-center gap-3">
          <button
            type="submit"
            disabled={!canSubmit}
            className="inline-flex items-center rounded-md bg-primary px-4 py-2 text-primary-foreground disabled:opacity-50"
          >
            {isSubmitting ? 'Saving…' : submitLabel}
          </button>
          <a href="/projects" className="text-sm text-muted-foreground hover:underline">
            Cancel
          </a>
        </div>
      </form>
    </div>
  );
}

