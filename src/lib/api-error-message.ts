import { TRPCClientError } from '@trpc/client';

/**
 * User-facing message for global toasts (Story 5.1).
 * Never surfaces raw cause/stack here — server should sanitize in production.
 */
export function getApiErrorMessage(error: unknown): string {
  if (error instanceof TRPCClientError) {
    const m = error.message?.trim();
    if (m) return m;
  }
  if (error instanceof Error && error.message.trim()) {
    return error.message;
  }
  return 'Something went wrong. Please try again.';
}
