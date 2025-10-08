import type { RouteHandler } from 'fastify';
import { nango } from '../nango.js';
import { db, getUserFromDatabase } from '../db.js';

/**
 * Deleting a connection means destroying a link between a user and an integration.
 * It's useful when you delete a user from your backend or a user choose to disconnect.
 */
export const deleteConnection: RouteHandler<{
    Querystring: { integration?: string };
}> = async (req, reply) => {
    const query = req.query;
    if (!query.integration || !['slack', 'google-drive', 'one-drive'].includes(query.integration)) {
        await reply.status(400).send({ error: 'invalid_integration' });
        return;
    }

    const user = await getUserFromDatabase();
    if (!user) {
        await reply.status(400).send({ error: 'invalid_user' });
        return;
    }

    const userConnection = await db.userConnections.findFirst({
        where: {
            userId: user.id,
            providerConfigKey: query.integration
        }
    });

    if (!userConnection) {
        await reply.status(400).send({ error: 'connection_not_found' });
        return;
    }

    // We unlink a user from an integration
    await nango.deleteConnection(query.integration, userConnection.connectionId);

    // Delete associated records based on integration type
    if (query.integration === 'slack') {
        await db.contacts.deleteMany({
            where: { connectionId: userConnection.connectionId }
        });
    } else if (query.integration === 'google-drive') {
        await db.files.deleteMany({
            where: {
                integrationId: 'google-drive',
                connectionId: userConnection.connectionId
            }
        });
    } else if (query.integration === 'one-drive') {
        await db.files.deleteMany({
            where: {
                integrationId: 'one-drive',
                connectionId: userConnection.connectionId
            }
        });
    }

    await db.userConnections.delete({
        where: {
            id: userConnection.id
        }
    });

    await reply.status(200).send({ success: true });
};
