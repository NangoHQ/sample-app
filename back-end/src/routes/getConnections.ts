import type { RouteHandler } from 'fastify';
import type { GetPublicConnections } from '@nangohq/types';
import { nango } from '../nango.js';
import { getUserFromDatabase } from '../db.js';

/**
 * List available connection for one user.
 * A connection is a link between an integration and a user (e.g: oauth token)
 */
export const getConnections: RouteHandler<{
  Reply: GetPublicConnections['Success'] | { error: string };
}> = async (_, reply) => {
  const user = await getUserFromDatabase();
  if (!user) {
    await reply.status(400).send({ error: 'invalid_user' });
    return;
  }
  if (!user.connectionId) {
    await reply.status(200).send({ connections: [] });
    return;
  }

  // We list all the connections for our user
  const list = await nango.listConnections(user.connectionId);

  await reply.status(200).send({ connections: list.connections });
};
