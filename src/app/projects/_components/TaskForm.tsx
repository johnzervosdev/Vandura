'use client';

import { useMemo, useState } from 'react';

export type TaskStatus = 'pending' | 'in-progress' | 'completed' | 'blocked';

export interface TaskFormValues {
  name: string;
  description: string;
  estimatedHours: string; // string for controlled input
  status: TaskStatus;
}

export interface TaskFormSubmitValues {
  name: string;
  description?: string;
  estimatedHours?: number;
  status: TaskStatus;
}

export function TaskForm({
  title,
  initialValues,
  submitLabel,
  isSubmitting,
  onSubmit,
  onCancel,
  submitError,
}: {
  title: string;
  initialValues: TaskFormValues;
  submitLabel: string;
  isSubmitting: boolean;
  onSubmit: (values: TaskFormSubmitValues) => void | Promise<void>;
  onCancel: () => void;
  submitError?: string | null;
}) {
  const [values, setValues] = useState<TaskFormValues>(initialValues);
  const [fieldErrors, setFieldErrors] = useState<Partial<Record<keyof TaskFormValues, string>>>(
    {}
  );

  const canSubmit = useMemo(() => !isSubmitting, [isSubmitting]);

  function validate(v: TaskFormValues) {
    const next: Partial<Record<keyof TaskFormValues, string>> = {};

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

    const payload: TaskFormSubmitValues = {
      name: values.name.trim(),
      description: values.description.trim() ? values.description.trim() : undefined,
      estimatedHours: values.estimatedHours.trim() ? Number(values.estimatedHours) : undefined,
      status: values.status,
    };

    await onSubmit(payload);
  }

  return (
    <div className="space-y-4">
      <div className="text-lg font-semibold">{title}</div>

      {submitError ? (
        <div className="rounded-md border border-destructive/40 bg-destructive/10 p-3 text-sm">
          <div className="font-medium text-destructive">Error</div>
          <div className="text-muted-foreground mt-1">{submitError}</div>
        </div>
      ) : null}

      <form onSubmit={handleSubmit} className="space-y-4">
        <div className="space-y-2">
          <label className="text-sm font-medium">
            Name <span className="text-destructive">*</span>
          </label>
          <input
            className="w-full rounded-md border bg-background px-3 py-2 text-sm"
            value={values.name}
            onChange={(e) => setValues((s) => ({ ...s, name: e.target.value }))}
            placeholder="e.g. API Integration"
          />
          {fieldErrors.name ? <div className="text-sm text-destructive">{fieldErrors.name}</div> : null}
        </div>

        <div className="space-y-2">
          <label className="text-sm font-medium">Status</label>
          <select
            className="w-full rounded-md border bg-background px-3 py-2 text-sm"
            value={values.status}
            onChange={(e) => setValues((s) => ({ ...s, status: e.target.value as TaskStatus }))}
          >
            <option value="pending">pending</option>
            <option value="in-progress">in-progress</option>
            <option value="completed">completed</option>
            <option value="blocked">blocked</option>
          </select>
        </div>

        <div className="space-y-2">
          <label className="text-sm font-medium">Estimated Hours (optional)</label>
          <input
            className="w-full rounded-md border bg-background px-3 py-2 text-sm"
            value={values.estimatedHours}
            onChange={(e) => setValues((s) => ({ ...s, estimatedHours: e.target.value }))}
            inputMode="decimal"
            placeholder="e.g. 12"
          />
          {fieldErrors.estimatedHours ? (
            <div className="text-sm text-destructive">{fieldErrors.estimatedHours}</div>
          ) : null}
        </div>

        <div className="space-y-2">
          <label className="text-sm font-medium">Description (optional)</label>
          <textarea
            className="w-full rounded-md border bg-background px-3 py-2 text-sm min-h-24"
            value={values.description}
            onChange={(e) => setValues((s) => ({ ...s, description: e.target.value }))}
            placeholder="Optional notes about the task"
          />
        </div>

        <div className="flex items-center justify-end gap-3 pt-2">
          <button
            type="button"
            className="rounded-md border px-4 py-2"
            onClick={onCancel}
            disabled={isSubmitting}
          >
            Cancel
          </button>
          <button
            type="submit"
            disabled={!canSubmit}
            className="rounded-md bg-primary px-4 py-2 text-primary-foreground disabled:opacity-50"
          >
            {isSubmitting ? 'Saving…' : submitLabel}
          </button>
        </div>
      </form>
    </div>
  );
}

