import { useEffect, useRef, useState, useCallback } from 'react';
import { baseUrl } from '../utils';

const AUTH_KEY = 'nango_auth_v1';
function getSseToken(): string | null {
    try {
        const raw = localStorage.getItem(AUTH_KEY);
        return raw ? (JSON.parse(raw) as { token: string }).token : null;
    } catch {
        return null;
    }
}

export interface WebhookEvent {
    id: string;
    timestamp: string;
    type: 'auth' | 'sync' | 'forward' | 'connected' | 'connection_deleted' | 'auth_broken';
    provider?: string;
    connectionId?: string;
    operation?: string;
    model?: string;
    payload?: unknown;
}

interface UseSSEOptions {
    maxEvents?: number;
    onEvent?: (event: WebhookEvent) => void;
}

export function useSSE({ maxEvents = 100, onEvent }: UseSSEOptions = {}) {
    const [events, setEvents] = useState<WebhookEvent[]>([]);
    const [connected, setConnected] = useState(false);
    const esRef = useRef<EventSource | null>(null);
    // Always hold the latest onEvent callback without restarting the SSE connection
    const onEventRef = useRef(onEvent);
    useEffect(() => { onEventRef.current = onEvent; });

    const clear = useCallback(() => setEvents([]), []);

    useEffect(() => {
        const token = getSseToken();
        const sseUrl = token
            ? `${baseUrl}/stream/webhooks?token=${encodeURIComponent(token)}`
            : `${baseUrl}/stream/webhooks`;
        const es = new EventSource(sseUrl);
        esRef.current = es;

        es.onopen = () => setConnected(true);
        es.onerror = () => setConnected(false);

        es.onmessage = (e) => {
            try {
                const event: WebhookEvent = JSON.parse(e.data);
                if (event.type === 'connected') {
                    setConnected(true);
                    return;
                }
                if (event.type === 'connection_deleted') {
                    setEvents((prev) => prev.filter((ev) => ev.connectionId !== event.connectionId));
                    return;
                }
                onEventRef.current?.(event);
                setEvents((prev) => [event, ...prev].slice(0, maxEvents));
            } catch {}
        };

        return () => {
            es.close();
            setConnected(false);
        };
    }, [maxEvents]);

    return { events, connected, clear };
}
