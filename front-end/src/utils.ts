import { twMerge } from 'tailwind-merge';
import { clsx, type ClassValue } from 'clsx';
import { QueryClient } from '@tanstack/react-query';

export const baseUrl = 'http://localhost:3010';
/**
 * Utility function for combining Tailwind CSS classes
 * @param inputs - Array of class values to be merged
 * @returns Merged class string
 */
export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export const queryClient = new QueryClient();
