import type { RouteHandler } from 'fastify';
import { nango } from '../nango.js';
import { db } from '../db.js';
import { broadcast } from '../webhookBroadcast.js';

/**
 * Deleting a connection means destroying a link between a user and an integration.
 */
export const deleteConnection: RouteHandler<{
    Querystring: { integration?: string };
}> = async (req, reply) => {
    const { integration } = req.query;
    if (!integration) {
        await reply.status(400).send({ error: 'integration_required' });
        return;
    }

    const userConnection = await db.userConnections.findFirst({
        where: { userId: req.user.userId, providerConfigKey: integration }
    });

    if (!userConnection) {
        await reply.status(400).send({ error: 'connection_not_found' });
        return;
    }

    await nango.deleteConnection(integration, userConnection.connectionId);

    // Clean up associated synced data and webhook history
    await Promise.allSettled([
        db.contacts.deleteMany({ where: { connectionId: userConnection.connectionId } }),
        db.files.deleteMany({ where: { connectionId: userConnection.connectionId } }),
        db.records.deleteMany({ where: { connectionId: userConnection.connectionId } }),
        db.webhookEvents.deleteMany({ where: { connectionId: userConnection.connectionId } })
    ]);

    await db.userConnections.delete({ where: { id: userConnection.id } });

    // Delete ALL webhook events for this provider whose connectionId no longer
    // has an active connection — cleans up orphaned events from past connections.
    const activeConnections = await db.userConnections.findMany({
        where: { providerConfigKey: integration },
        select: { connectionId: true }
    });
    const activeIds = activeConnections.map((c) => c.connectionId);
    await db.webhookEvents.deleteMany({
        where: {
            provider: integration,
            ...(activeIds.length > 0 ? { NOT: { connectionId: { in: activeIds } } } : {})
        }
    });

    // Notify all SSE clients so they can clear events for this connection live
    broadcast({
        id: `deleted-${userConnection.connectionId}`,
        timestamp: new Date().toISOString(),
        type: 'connection_deleted',
        provider: integration,
        connectionId: userConnection.connectionId,
        payload: null
    });

    await reply.status(200).send({ success: true });
};
