import type { RouteHandler } from 'fastify';
import { nango } from '../nango.js';
import { getUserFromDatabase } from '../db.js';

export const getNangoCredentials: RouteHandler<{
  Querystring: { integrationId: string };
}> = async (req, reply) => {
  const { integrationId } = req.query;
  const user = await getUserFromDatabase();
  if (!user) {
    await reply.status(400).send({ error: 'invalid_user' });
    return;
  }

  const connectionId = user.connectionId;
  if (!connectionId) {
    await reply.status(400).send({ error: 'no_connection_id' });
    return;
  }

  try {
    const credentials = await nango.getConnection(integrationId, connectionId);
    await reply.status(200).send({ credentials });
  } catch (error) {
    console.error('Failed to get Nango credentials:', error);
    await reply.status(500).send({ error: 'Failed to get Nango credentials' });
  }
}; 