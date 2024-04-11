import type { RouteHandler } from 'fastify';
import { nango } from '../nango.js';
import { db } from '../db.js';

/**
 * Deleting a connection means destroying a link between a user and an integration.
 * It's useful when you delete a user from your backend or a user choose to disconnect.
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
  await nango.deleteConnection(query.integration, 'my-first-user');

  // Delete associated records on your side
  await db.contacts.deleteMany({
    where: { connectionId: 'my-first-user' },
  });

  await reply.status(200).send({ success: true });
};
