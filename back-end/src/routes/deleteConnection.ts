import type { RouteHandler } from 'fastify';
import { nango } from '../nango.js';

/**
 * Deleting a connection means destroying a link between an user and an integration.
 * It's useful when you delete an user from your backend or an user choose to disconnect.
 */
export const deleteConnection: RouteHandler<{
  Querystring: { integration?: string };
}> = async (req, reply) => {
  const query = req.query;
  if (!query.integration || query.integration !== 'slack') {
    await reply.status(400).send({ error: 'invalid_query' });
    return;
  }

  // We unlink a user from an integration
  await nango.deleteConnection(query.integration, 'user-1');

  await reply.status(200).send({ success: true });
};
