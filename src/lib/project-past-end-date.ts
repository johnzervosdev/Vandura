import { startOfDay } from '@/lib/date-utils';

export type ProjectPastEndCueLevel = 'active' | 'on-hold';

/**
 * True when the project's planning end day is strictly before the local calendar day of `now`
 * (the end day itself is still "in plan" for the full local day — Story 6.5).
 */
export function isProjectPastEndDate(input: {
  endDate: Date | null | undefined;
  status: string;
  now: Date;
}): boolean {
  return getProjectPastEndCueLevel(input) !== null;
}

/** Hannibal 6.5: cue only for active (strong) and on-hold (light); never completed/cancelled. */
export function getProjectPastEndCueLevel(input: {
  endDate: Date | null | undefined;
  status: string;
  now: Date;
}): ProjectPastEndCueLevel | null {
  const { endDate, status, now } = input;
  if (endDate == null) return null;
  if (status === 'completed' || status === 'cancelled') return null;

  const endDay = startOfDay(endDate).getTime();
  const today = startOfDay(now).getTime();
  if (endDay >= today) return null;

  if (status === 'active') return 'active';
  if (status === 'on-hold') return 'on-hold';
  return null;
}

export function formatProjectEndDateLocal(endDate: Date): string {
  return endDate.toLocaleDateString(undefined, {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  });
}
