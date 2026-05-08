import type { RouteHandler } from 'fastify';
import { nango } from '../nango.js';
import { db } from '../db.js';

const SYNC_NAMES: Record<string, string[]> = {
    'google-drive': ['documents'],
    'one-drive': ['user-files-selection'],
    'one-drive-personal': ['user-files-selection']
};

export const setConnectionMetadata: RouteHandler<{
    Body: { integrationId: string; metadata: Record<string, any> };
}> = async (req, reply) => {
    const { integrationId, metadata } = req.body;

    try {
        const userConnection = await db.userConnections.findFirst({
            where: { userId: req.user.userId, providerConfigKey: integrationId }
        });

        if (!userConnection) {
            await reply.status(404).send({ error: 'connection_not_found' });
            return;
        }

        await nango.setMetadata(integrationId, userConnection.connectionId, metadata);

        const syncNames = SYNC_NAMES[integrationId];
        if (syncNames) {
            await nango.triggerSync(integrationId, syncNames, userConnection.connectionId);
        }

        await reply.status(200).send({ success: true });
    } catch (error) {
        console.error('Failed to set metadata:', error);
        await reply.status(500).send({ error: 'Failed to set metadata' });
    }
};
