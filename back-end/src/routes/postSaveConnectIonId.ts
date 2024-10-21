import type { RouteHandler } from 'fastify';
import { db, getUserFromDatabase } from '../db.js';

/**
 * Link your user to a connectionId
 * A connectionId is representing a user + an integration
 */
export const postSaveConnectionId: RouteHandler<{
  Body: { connectionId: string };
}> = async (req, reply) => {
  if (!req.body.connectionId) {
    await reply.status(400).send({ error: 'invalid_body' });
    return;
  }

  const user = await getUserFromDatabase();
  if (!user) {
    await reply.status(400).send({ error: 'invalid_user' });
    return;
  }

  // Trigger the action to send a Slack message.
  await db.users.update({
    data: {
      connectionId: req.body.connectionId,
    },
    where: {
      id: user.id,
    },
  });

  await reply.status(200).send({ success: true });
};
