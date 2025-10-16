import { twMerge } from 'tailwind-merge';
import { clsx, type ClassValue } from 'clsx';
import { QueryClient } from '@tanstack/react-query';

export const baseUrl = 'http://localhost:3010';
export const apiUrl = process.env.NEXT_PUBLIC_NANGO_HOST ?? 'https://api.nango.dev';

export function cn(...inputs: ClassValue[]) {
    return twMerge(clsx(inputs));
}

export const queryClient = new QueryClient();

// Supported cloud storage providers configuration
export const SUPPORTED_PROVIDERS = ['google-drive', 'one-drive', 'one-drive-personal'];
