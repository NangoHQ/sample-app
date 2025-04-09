import type { RouteHandler } from 'fastify';
import { db } from '../db.js';

export const getFiles: RouteHandler = async (req, reply) => {
  const { connectionId } = req.params as { connectionId: string };

  try {
    const files = await db.files.findMany({
      where: {
        connectionId,
        deletedAt: null,
      },
      orderBy: {
        updatedAt: 'desc',
      },
    });

    await reply.status(200).send({ files });
  } catch (error) {
    console.error('Failed to get files:', error);
    await reply.status(500).send({ error: 'Failed to get files' });
  }
}; 