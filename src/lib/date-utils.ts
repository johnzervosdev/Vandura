/**
 * Date utilities for handling 15-minute increment logic
 */

/**
 * Rounds a date to the nearest 15-minute increment
 */
export function roundToNearestQuarter(date: Date): Date {
  const minutes = date.getMinutes();
  const roundedMinutes = Math.round(minutes / 15) * 15;
  const result = new Date(date);
  result.setMinutes(roundedMinutes, 0, 0);
  return result;
}

/**
 * Calculates duration in minutes between two dates
 */
export function calculateDuration(startTime: Date, endTime: Date): number {
  const diffMs = endTime.getTime() - startTime.getTime();
  const diffMinutes = Math.floor(diffMs / (1000 * 60));

  // Return raw minute difference; validation/rounding is handled by callers.
  return diffMinutes;
}

/**
 * Validates that duration is a multiple of 15 minutes
 */
export function isValidDuration(minutes: number): boolean {
  return minutes > 0 && minutes % 15 === 0;
}

/**
 * Formats minutes as hours (e.g., 90 -> "1.5 hours")
 */
export function formatMinutesAsHours(minutes: number): string {
  const hours = minutes / 60;
  return hours.toFixed(2);
}

/**
 * Formats minutes as human-readable string (e.g., 90 -> "1h 30m")
 */
export function formatMinutesHumanReadable(minutes: number): string {
  const hours = Math.floor(minutes / 60);
  const mins = minutes % 60;
  
  if (hours === 0) return `${mins}m`;
  if (mins === 0) return `${hours}h`;
  return `${hours}h ${mins}m`;
}

/**
 * Gets the start of day (00:00:00)
 */
export function startOfDay(date: Date): Date {
  const result = new Date(date);
  result.setHours(0, 0, 0, 0);
  return result;
}

/**
 * Gets the end of day (23:59:59)
 */
export function endOfDay(date: Date): Date {
  const result = new Date(date);
  result.setHours(23, 59, 59, 999);
  return result;
}

/**
 * Gets the start of week (Monday)
 */
export function startOfWeek(date: Date): Date {
  const result = new Date(date);
  const day = result.getDay();
  const diff = result.getDate() - day + (day === 0 ? -6 : 1);
  result.setDate(diff);
  result.setHours(0, 0, 0, 0);
  return result;
}

/**
 * Gets the end of week (Sunday)
 */
export function endOfWeek(date: Date): Date {
  const result = startOfWeek(date);
  result.setDate(result.getDate() + 6);
  result.setHours(23, 59, 59, 999);
  return result;
}
