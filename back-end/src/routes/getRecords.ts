import type { RouteHandler } from 'fastify';
import { db } from '../db.js';

/**
 * Returns synced records for a given integration and user.
 * Used by Projects, CRM, and other data pages.
 */
export const getRecords: RouteHandler<{
    Querystring: { integrationId?: string; model?: string; limit?: string };
}> = async (req, reply) => {
    const { integrationId, model, limit = '50' } = req.query;

    if (!integrationId) {
        await reply.status(400).send({ error: 'integrationId is required' });
        return;
    }

    // Find this user's connection for the integration
    const userConnection = await db.userConnections.findFirst({
        where: { userId: req.user.userId, providerConfigKey: integrationId }
    });

    if (!userConnection) {
        await reply.status(200).send({ records: [] });
        return;
    }

    const records = await db.records.findMany({
        where: {
            integrationId,
            connectionId: userConnection.connectionId,
            ...(model ? { model } : {}),
            deletedAt: null
        },
        orderBy: { updatedAt: 'desc' },
        take: Math.min(parseInt(limit, 10), 200)
    });

    await reply.status(200).send({ records });
};
