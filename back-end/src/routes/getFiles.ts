import type { RouteHandler } from 'fastify';
import { db } from '../db.js';

export const getFiles: RouteHandler = async (req, reply) => {
    try {
        const userConnections = await db.userConnections.findMany({
            where: {
                userId: req.user.userId
            }
        });

        if (userConnections.length === 0) {
            await reply.status(200).send({ files: [] });
            return;
        }

        const connectionIds = userConnections.map((conn) => conn.connectionId);

        const files = await db.files.findMany({
            where: {
                connectionId: {
                    in: connectionIds
                },
                deletedAt: null
            },
            orderBy: {
                updatedAt: 'desc'
            }
        });

        await reply.status(200).send({ files });
    } catch (error) {
        console.error('Failed to get files:', error);
        await reply.status(500).send({ error: 'Failed to get files' });
    }
};
