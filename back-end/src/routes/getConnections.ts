import type { RouteHandler } from 'fastify';
import type { ConnectionList } from '@nangohq/node';
import { nango } from '../nango.js';

export type GetConnections = {
  connections: ConnectionList[];
};

/**
 * List available connection for one user.
 * A connection is a link between an integration and an user (e.g: oauth token)
 */
export const getConnections: RouteHandler<{ Reply: GetConnections }> = async (
  _,
  reply
) => {
  // We list all the connections for our user #1
  const list = await nango.listConnections('user-1');

  await reply.status(200).send({ connections: list.connections });
};
