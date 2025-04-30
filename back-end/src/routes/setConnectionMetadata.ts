import type { RouteHandler } from 'fastify';
import { nango } from '../nango.js';
import { getUserFromDatabase } from '../db.js';

export const setConnectionMetadata: RouteHandler<{
  Body: { integrationId: string; metadata: Record<string, any> };
}> = async (req, reply) => {
  const { integrationId, metadata } = req.body;
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
    await nango.setMetadata(integrationId, connectionId, metadata);

    // also trigger the sync
    // fix this abstract it out
    await nango.triggerSync(integrationId, ['documents'], connectionId);
    await reply.status(200).send({ success: true });
  } catch (error) {
    console.error('Failed to set metadata:', error);
    await reply.status(500).send({ error: 'Failed to set metadata' });
  }
}; 
