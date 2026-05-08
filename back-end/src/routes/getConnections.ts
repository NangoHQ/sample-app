import type { RouteHandler } from 'fastify';
import { db } from '../db.js';

export type GetConnectionsSuccess = {
    connections: { providerConfigKey: string; connectionId: string; createdAt: string; broken: boolean }[];
};
export type GetConnections = GetConnectionsSuccess | { error: string };

/**
 * List available connections for one user.
 */
export const getConnections: RouteHandler<{
    Querystring: Record<string, never>;
    Reply: GetConnections;
}> = async (req, reply) => {
    const userConnections = await db.userConnections.findMany({
        where: { userId: req.user.userId },
        orderBy: { createdAt: 'desc' }
    });

    const connections = userConnections.map((uc) => ({
        providerConfigKey: uc.providerConfigKey,
        connectionId: uc.connectionId,
        createdAt: uc.createdAt.toISOString(),
        broken: uc.broken
    }));

    await reply.status(200).send({ connections });
};
