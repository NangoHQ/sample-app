import type { RouteHandler } from 'fastify';
import { nango } from '../nango.js';
import { getUserFromDatabase, getUserConnection } from '../db.js';

export const getNangoCredentials: RouteHandler<{
    Querystring: { integrationId: string };
}> = async (req, reply) => {
    const { integrationId } = req.query;
    const user = await getUserFromDatabase();
    if (!user) {
        await reply.status(400).send({ error: 'invalid_user' });
        return;
    }

    // Get the user connection for the specific integration
    const userConnection = await getUserConnection(user.id, integrationId);
    if (!userConnection) {
        await reply.status(400).send({ error: 'no_connection_found_for_integration' });
        return;
    }

    try {
        const credentials = await nango.getConnection(integrationId, userConnection.connectionId);

        let response: any = { ...credentials };

        if (integrationId === 'one-drive') {
            try {
                const sharepointRes = await nango.get({
                    providerConfigKey: 'one-drive',
                    connectionId: userConnection.connectionId,
                    endpoint: '/v1.0/sites/root',
                    retries: 3
                });

                if (sharepointRes.status === 200 && sharepointRes.data) {
                    response.sharepointBaseUrl = sharepointRes.data.webUrl;
                }
            } catch (error) {
                console.error('Failed to fetch SharePoint base URL:', error);
            }
        }

        await reply.status(200).send(response);
    } catch (error) {
        await reply.status(500).send({ error: 'Failed to get Nango credentials' });
    }
};
