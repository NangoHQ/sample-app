import type { RouteHandler } from 'fastify';
import type { GetPublicConnections } from '@nangohq/types';
import { nango } from '../nango.js';
import { getUserFromDatabase } from '../db.js';

export type GetConnectionsSuccess = {
  connections: GetPublicConnections['Success']['connections'];
};
export type GetConnections = GetConnectionsSuccess | { error: string };

/**
 * List available connection for one user.
 * A connection is a link between an integration and a user (e.g: oauth token)
 */
export const getConnections: RouteHandler<{
  Reply: GetConnections;
}> = async (_, reply) => {
  const user = await getUserFromDatabase();
  console.log('User:', user);
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
