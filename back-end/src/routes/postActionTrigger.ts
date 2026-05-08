import type { RouteHandler } from 'fastify';
import { nango } from '../nango.js';
import { db } from '../db.js';

/**
 * Generic action trigger endpoint.
 * Powers the "Actions" demo panels across all feature pages.
 */
export const postActionTrigger: RouteHandler<{
    Body: {
        providerConfigKey: string;
        actionName: string;
        input?: Record<string, unknown>;
    };
}> = async (req, reply) => {
    const { providerConfigKey, actionName, input } = req.body;

    if (!providerConfigKey || !actionName) {
        await reply.status(400).send({ error: 'providerConfigKey and actionName are required' });
        return;
    }

    const userConnection = await db.userConnections.findFirst({
        where: { userId: req.user.userId, providerConfigKey }
    });

    if (!userConnection) {
        await reply.status(404).send({ error: 'No connection found for this provider. Connect first.' });
        return;
    }

    try {
        const result = await nango.triggerAction(providerConfigKey, userConnection.connectionId, actionName, input ?? {});
        await reply.status(200).send({ result });
    } catch (err: any) {
        await reply.status(500).send({ error: err?.message ?? 'Action failed' });
    }
};
