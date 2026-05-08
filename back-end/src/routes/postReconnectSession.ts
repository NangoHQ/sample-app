import type { RouteHandler } from 'fastify';
import { nango } from '../nango.js';
import { db } from '../db.js';

export const postReconnectSession: RouteHandler<{
    Body: { integration: string };
    Reply: { token: string } | { error: string };
}> = async (req, reply) => {
    const { integration } = req.body;

    if (!integration) {
        await reply.status(400).send({ error: 'integration_required' });
        return;
    }

    const userConnection = await db.userConnections.findFirst({
        where: { userId: req.user.userId, providerConfigKey: integration }
    });

    if (!userConnection) {
        await reply.status(404).send({ error: 'no_connection_found' });
        return;
    }

    try {
        const res = await nango.createReconnectSession({
            connection_id: userConnection.connectionId,
            integration_id: integration
        });
        await reply.status(200).send({ token: res.data.token });
    } catch (err: any) {
        const nangoError = err?.response?.data ?? err?.message ?? 'nango_error';
        console.error('[reconnect-session] Nango error:', JSON.stringify(nangoError));
        await reply.status(400).send({ error: nangoError });
    }
};
