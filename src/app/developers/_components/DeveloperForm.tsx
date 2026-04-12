'use client';

import { useMemo, useState } from 'react';

export interface DeveloperFormValues {
  name: string;
  email: string;
  hourlyRate: string; // string for controlled input
}

export interface DeveloperFormSubmitValues {
  name: string;
  email?: string;
  hourlyRate?: number;
}

function isValidEmail(email: string): boolean {
  // Minimal sanity check; server-side Zod enforces email format too.
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}

export function DeveloperForm({
  title,
  initialValues,
  submitLabel,
  isSubmitting,
  onSubmit,
  onCancel,
  submitError,
}: {
  title: string;
  initialValues: DeveloperFormValues;
  submitLabel: string;
  isSubmitting: boolean;
  onSubmit: (values: DeveloperFormSubmitValues) => void | Promise<void>;
  onCancel: () => void;
  submitError?: string | null;
}) {
  const [values, setValues] = useState<DeveloperFormValues>(initialValues);
  const [fieldErrors, setFieldErrors] = useState<
    Partial<Record<keyof DeveloperFormValues, string>>
  >({});

  const canSubmit = useMemo(() => !isSubmitting, [isSubmitting]);

  function validate(v: DeveloperFormValues) {
    const next: Partial<Record<keyof DeveloperFormValues, string>> = {};

    if (!v.name.trim()) next.name = 'Name is required';

    const email = v.email.trim();
    if (email && !isValidEmail(email)) next.email = 'Email must be a valid format';

    const rateStr = v.hourlyRate.trim();
    if (rateStr) {
      const n = Number(rateStr);
      if (!Number.isFinite(n)) next.hourlyRate = 'Hourly rate must be a number';
      else if (n < 0) next.hourlyRate = 'Hourly rate must be 0 or greater';
    }

    return next;
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const nextErrors = validate(values);
    setFieldErrors(nextErrors);
    if (Object.keys(nextErrors).length > 0) return;

    const payload: DeveloperFormSubmitValues = {
      name: values.name.trim(),
      email: values.email.trim() ? values.email.trim() : undefined,
      hourlyRate: values.hourlyRate.trim() ? Number(values.hourlyRate.trim()) : undefined,
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
            placeholder="e.g. John Zervos"
          />
          {fieldErrors.name ? <div className="text-sm text-destructive">{fieldErrors.name}</div> : null}
        </div>

        <div className="space-y-2">
          <label className="text-sm font-medium">Email (optional)</label>
          <input
            className="w-full rounded-md border bg-background px-3 py-2 text-sm"
            value={values.email}
            onChange={(e) => setValues((s) => ({ ...s, email: e.target.value }))}
            placeholder="e.g. john@example.com"
            inputMode="email"
          />
          {fieldErrors.email ? <div className="text-sm text-destructive">{fieldErrors.email}</div> : null}
        </div>

        <div className="space-y-2">
          <label className="text-sm font-medium">Hourly Rate (optional)</label>
          <input
            className="w-full rounded-md border bg-background px-3 py-2 text-sm"
            value={values.hourlyRate}
            onChange={(e) => setValues((s) => ({ ...s, hourlyRate: e.target.value }))}
            inputMode="decimal"
            placeholder="e.g. 85"
          />
          {fieldErrors.hourlyRate ? (
            <div className="text-sm text-destructive">{fieldErrors.hourlyRate}</div>
          ) : null}
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

