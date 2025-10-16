import type { RouteHandler } from 'fastify';
import type { GetPublicConnections } from '@nangohq/types';
import { nango } from '../nango.js';
import { getUserFromDatabase, db } from '../db.js';

export type GetConnectionsSuccess = {
    connections: GetPublicConnections['Success']['connections'];
};
export type GetConnections = GetConnectionsSuccess | { error: string };

/**
 * List available connection for one user.
 * A connection is a link between an integration and a user (e.g: oauth token)
 */
export const getConnections: RouteHandler<{
    Reply: GetConnections;
}> = async (_, reply) => {
    const user = await getUserFromDatabase();
    console.log('User:', user);
    if (!user) {
        await reply.status(400).send({ error: 'invalid_user' });
        return;
    }

    const userConnections = await db.userConnections.findMany({
        where: {
            userId: user.id
        }
    });

    if (userConnections.length === 0) {
        await reply.status(200).send({ connections: [] });
        return;
    }

    const connections = [];
    for (const userConnection of userConnections) {
        try {
            const connection = await nango.getConnection(userConnection.providerConfigKey, userConnection.connectionId);
            if (connection) {
                connections.push({
                    id: connection.id,
                    connection_id: userConnection.connectionId,
                    provider_config_key: userConnection.providerConfigKey,
                    provider: userConnection.providerConfigKey,
                    created: connection.created_at,
                    metadata: connection.metadata || {},
                    errors: connection.errors || [],
                    end_user: connection.end_user || null
                });
            }
        } catch (error) {
            console.error(`Failed to get connection ${userConnection.connectionId}:`, error);
        }
    }

    await reply.status(200).send({ connections });
};
