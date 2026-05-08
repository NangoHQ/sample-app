import type { RouteHandler } from 'fastify';
import { db } from '../db.js';

export const getWebhookEvents: RouteHandler<{
    Querystring: { limit?: string; type?: string; provider?: string };
}> = async (req, reply) => {
    const { limit = '50', type, provider } = req.query;

    const userConns = await db.userConnections.findMany({ where: { userId: req.user.userId } });
    const connectionIds = userConns.map((c) => c.connectionId);

    if (connectionIds.length === 0) {
        await reply.status(200).send({ events: [] });
        return;
    }

    const events = await db.webhookEvents.findMany({
        where: {
            connectionIds,
            ...(type ? { type } : {}),
            ...(provider ? { provider } : {})
        },
        orderBy: { receivedAt: 'desc' },
        take: Math.min(parseInt(limit, 10), 200)
    });

    const mapped = events.map((e) => ({
        id: e.id,
        timestamp: e.receivedAt.toISOString(), // use our received time, not any Nango payload date
        type: e.type,
        provider: e.provider,
        connectionId: e.connectionId,
        operation: e.operation,
        model: e.model,
        payload: e.payload
    }));

    await reply.status(200).send({ events: mapped });
};
