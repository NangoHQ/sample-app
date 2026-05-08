import type { RouteHandler } from 'fastify';
import { nango } from '../nango.js';
import { getUserConnection } from '../db.js';

export const getNangoCredentials: RouteHandler<{
    Querystring: { integrationId: string };
}> = async (req, reply) => {
    const { integrationId } = req.query;

    // Get the user connection for the specific integration
    const userConnection = await getUserConnection(req.user.userId, integrationId);
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

            // Fallback: derive SharePoint base URL from the sharepointAccessToken scope
            if (!response.sharepointBaseUrl) {
                const scope: string | undefined = credentials.connection_config?.['sharepointAccessToken']?.scope;
                const match = scope?.match(/(https:\/\/[^/\s]+\.sharepoint\.com)/);
                if (match) {
                    response.sharepointBaseUrl = match[1];
                }
            }
        }

        await reply.status(200).send(response);
    } catch (error) {
        await reply.status(500).send({ error: 'Failed to get Nango credentials' });
    }
};
