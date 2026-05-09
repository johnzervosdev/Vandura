'use client';

import {
  formatProjectEndDateLocal,
  getProjectPastEndCueLevel,
} from '@/lib/project-past-end-date';

type Props = {
  endDate: Date | null | undefined;
  status: string;
  /** Defaults to `new Date()` — pass only in tests if needed */
  now?: Date;
  className?: string;
};

/**
 * Story 6.5 — visible text + title (not color-only). Strong cue for `active`, lighter for `on-hold`.
 */
export function ProjectPastEndCue({ endDate, status, now = new Date(), className = '' }: Props) {
  const level = getProjectPastEndCueLevel({ endDate, status, now });
  if (!level || endDate == null) return null;

  const endLabel = formatProjectEndDateLocal(endDate);

  if (level === 'active') {
    return (
      <span
        className={`inline-flex items-center rounded-md border border-amber-600/50 bg-amber-500/15 px-2 py-0.5 text-xs font-semibold text-amber-950 dark:text-amber-100 ${className}`}
        title={`Planning end date was ${endLabel}`}
      >
        Past end date
      </span>
    );
  }

  return (
    <span
      className={`inline-flex items-center rounded border border-border bg-muted/40 px-1.5 py-0.5 text-[11px] font-medium text-muted-foreground ${className}`}
      title={`Planning end date was ${endLabel}`}
    >
      End date passed
    </span>
  );
}
