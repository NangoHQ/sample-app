import type { RouteHandler } from 'fastify';

const NANGO_SECRET_KEY = process.env['NANGO_SECRET_KEY'] ?? '';
const cache = new Map<string, string>();

/**
 * Fetches the logo URL for an integration from Nango's API.
 * Demonstrates using: GET https://api.nango.dev/integrations/{uniqueKey}
 */
export const getIntegrationLogo: RouteHandler<{
    Params: { integrationId: string };
}> = async (req, reply) => {
    const { integrationId } = req.params;

    if (cache.has(integrationId)) {
        return reply.send({ logo: cache.get(integrationId) });
    }

    const res = await fetch(`https://api.nango.dev/integrations/${integrationId}`, {
        headers: { Authorization: `Bearer ${NANGO_SECRET_KEY}` }
    });

    if (!res.ok) {
        return reply.status(res.status).send({ error: 'Integration not found' });
    }

    const json = (await res.json()) as { data: { logo: string } };
    const logo = json.data?.logo ?? '';
    cache.set(integrationId, logo);

    return reply.send({ logo });
};
