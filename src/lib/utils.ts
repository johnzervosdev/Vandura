import { type ClassValue, clsx } from 'clsx';
import { twMerge } from 'tailwind-merge';

/**
 * Utility function for merging Tailwind CSS classes
 * Used throughout the component library
 */
export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}
