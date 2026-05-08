import type { RouteHandler } from 'fastify';
import { addSSEClient, removeSSEClient } from '../webhookBroadcast.js';

/**
 * Server-Sent Events endpoint.
 * The frontend connects here to receive live webhook events.
 */
export const getSSEWebhooks: RouteHandler = async (req, reply) => {
    const raw = reply.raw;

    raw.setHeader('Content-Type', 'text/event-stream');
    raw.setHeader('Cache-Control', 'no-cache');
    raw.setHeader('Connection', 'keep-alive');
    raw.setHeader('X-Accel-Buffering', 'no');
    raw.flushHeaders();

    // Send a heartbeat immediately
    raw.write('data: {"type":"connected"}\n\n');

    addSSEClient(reply, req.user.userId);

    // Heartbeat every 20s to keep connection alive
    const heartbeat = setInterval(() => {
        try {
            raw.write(':heartbeat\n\n');
        } catch {
            clearInterval(heartbeat);
        }
    }, 20_000);

    req.raw.on('close', () => {
        clearInterval(heartbeat);
        removeSSEClient(reply);
    });

    // Keep the handler alive — Fastify will not auto-close SSE streams
    await new Promise(() => {});
};
