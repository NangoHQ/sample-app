import type { RouteHandler } from 'fastify';
import { nango } from '../nango.js';
import { getUserFromDatabase } from '../db.js';

export const setConnectionMetadata: RouteHandler<{
    Body: { integrationId: string; metadata: Record<string, any> };
}> = async (req, reply) => {
    const { integrationId, metadata } = req.body;
    const user = await getUserFromDatabase();
    if (!user) {
        await reply.status(400).send({ error: 'invalid_user' });
        return;
    }

    try {
        const allConnections = await nango.listConnections();
        const targetConnection = allConnections.connections.find((conn) => conn.provider_config_key === integrationId);

        if (!targetConnection) {
            await reply.status(404).send({ error: 'connection_not_found' });
            return;
        }

        await nango.setMetadata(integrationId, targetConnection.connection_id, metadata);

        if (integrationId === 'google-drive') {
            await nango.triggerSync(integrationId, ['documents'], targetConnection.connection_id);
        } else if (integrationId === 'one-drive') {
            await nango.triggerSync(integrationId, ['user-files-selection'], targetConnection.connection_id);
        }

        await reply.status(200).send({ success: true });
    } catch (error) {
        console.error('Failed to set metadata:', error);
        await reply.status(500).send({ error: 'Failed to set metadata' });
    }
};
