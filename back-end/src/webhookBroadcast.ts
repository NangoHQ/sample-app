/**
 * Simple SSE broadcaster for live webhook events.
 * Any route can call `broadcast(event)` and all connected SSE clients receive it.
 */

import type { FastifyReply } from 'fastify';

export interface WebhookEvent {
    id: string;
    timestamp: string;
    type: 'auth' | 'sync' | 'forward' | 'connection_deleted' | 'auth_broken';
    provider: string;
    connectionId?: string;
    operation?: string;
    model?: string;
    payload: unknown;
}

const clients = new Map<FastifyReply, string>();

export function addSSEClient(reply: FastifyReply, userId: string) {
    clients.set(reply, userId);
}

export function removeSSEClient(reply: FastifyReply) {
    clients.delete(reply);
}

export function broadcast(event: WebhookEvent, userId: string) {
    const data = `data: ${JSON.stringify(event)}\n\n`;
    for (const [client, clientUserId] of clients) {
        if (clientUserId !== userId) continue;
        try {
            client.raw.write(data);
        } catch {
            clients.delete(client);
        }
    }
}
