import type { RouteHandler } from 'fastify';
import { db, getUserFromDatabase } from '../db.js';

export const getFiles: RouteHandler = async (_, reply) => {
  const user = await getUserFromDatabase();
  if (!user) {
    await reply.status(400).send({ error: 'invalid_user' });
    return;
  }
  if (!user.connectionId) {
    await reply.status(200).send({ files: [] });
    return;
  }

  try {
    const files = await db.files.findMany({
      where: {
        connectionId: user.connectionId,
        // deletedAt: null,
      },
      orderBy: {
        updatedAt: 'desc',
      },
    });
    console.log('Files:', files);

    await reply.status(200).send({ files });
  } catch (error) {
    console.error('Failed to get files:', error);
    await reply.status(500).send({ error: 'Failed to get files' });
  }
};