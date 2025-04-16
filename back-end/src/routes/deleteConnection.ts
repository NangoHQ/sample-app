import type { RouteHandler } from 'fastify';
import { nango } from '../nango.js';
import { db, getUserFromDatabase } from '../db.js';

/**
 * Deleting a connection means destroying a link between a user and an integration.
 * It's useful when you delete a user from your backend or a user choose to disconnect.
 */
export const deleteConnection: RouteHandler<{
  Querystring: { integration?: string };
}> = async (req, reply) => {
  const query = req.query;
  if (!query.integration || !['slack', 'google-drive'].includes(query.integration)) {
    await reply.status(400).send({ error: 'invalid_integration' });
    return;
  }

  const user = await getUserFromDatabase();
  if (!user || !user.connectionId) {
    await reply.status(400).send({ error: 'invalid_user' });
    return;
  }

  // We unlink a user from an integration
  await nango.deleteConnection(query.integration, user.connectionId);

  // Delete associated records based on integration type
  if (query.integration === 'slack') {
    await db.contacts.deleteMany({
      where: { connectionId: user.connectionId },
    });
  } else if (query.integration === 'google-drive') {
    await db.files.deleteMany({
      where: {
        integrationId: 'google-drive',
        connectionId: user.connectionId,
      }
    });
  }

  // Remove the connection ID from the user
  await db.users.update({
    data: { connectionId: null },
    where: {
      id: user.id,
    },
  });

  await reply.status(200).send({ success: true });
};
