import type { RouteHandler } from 'fastify';
import { db } from '../db.js';

export const deleteWebhookEvents: RouteHandler = async (_req, reply) => {
    await db.webhookEvents.truncate();
    await reply.status(200).send({ ok: true });
};
