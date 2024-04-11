import { twMerge } from 'tailwind-merge';
import { clsx, type ClassValue } from 'clsx';
import { QueryClient } from '@tanstack/react-query';

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export const queryClient = new QueryClient();
