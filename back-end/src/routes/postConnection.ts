import type { RouteHandler } from 'fastify';
import { db } from '../db.js';

/**
 * Called immediately from the frontend when Nango Connect UI fires the 'connect' event.
 * Saves the connection to UserConnections before the auth webhook arrives.
 */
export const postConnection: RouteHandler<{
    Body: { providerConfigKey: string; connectionId: string };
}> = async (req, reply) => {
    const { providerConfigKey, connectionId } = req.body;

    if (!providerConfigKey || !connectionId) {
        return reply.status(400).send({ error: 'providerConfigKey and connectionId are required' });
    }

    await db.userConnections.upsert({
        where: { userId_providerConfigKey: { userId: req.user.userId, providerConfigKey } },
        create: { userId: req.user.userId, providerConfigKey, connectionId },
        update: { connectionId }
    });

    return reply.status(200).send({ ok: true });
};
