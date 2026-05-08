import { twMerge } from 'tailwind-merge';
import { clsx, type ClassValue } from 'clsx';
import { QueryClient } from '@tanstack/react-query';

export const baseUrl = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:3010';
export const apiUrl = process.env.NEXT_PUBLIC_NANGO_HOST ?? 'https://api.nango.dev';

const AUTH_KEY = 'nango_auth_v1';

function getAuthToken(): string | null {
    if (typeof window === 'undefined') return null;
    try {
        const raw = localStorage.getItem(AUTH_KEY);
        return raw ? (JSON.parse(raw) as { token: string }).token : null;
    } catch {
        return null;
    }
}

/**
 * Drop-in replacement for fetch() that automatically adds the Authorization header
 * from the stored JWT. Path should start with "/" and be relative to the API base URL.
 */
export function apiFetch(path: string, init?: RequestInit): Promise<Response> {
    const token = getAuthToken();
    return fetch(`${baseUrl}${path}`, {
        ...init,
        headers: {
            ...init?.headers,
            ...(token ? { Authorization: `Bearer ${token}` } : {})
        }
    });
}

export function cn(...inputs: ClassValue[]) {
    return twMerge(clsx(inputs));
}

export const queryClient = new QueryClient();

// Supported cloud storage providers configuration
export const SUPPORTED_PROVIDERS = ['google-drive', 'one-drive', 'one-drive-personal'];
