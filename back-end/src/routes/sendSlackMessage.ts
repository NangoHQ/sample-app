import type { RouteHandler } from 'fastify';
import { nango } from '../nango.js';
import { getUserFromDatabase } from '../db.js';

/**
 * Send a Slack message to a specific Slack user.
 */
export const sendSlackMessage: RouteHandler<{
  Body: { integration: string; slackUserId: string };
}> = async (req, reply) => {
  const { integration, slackUserId } = req.body;
  const user = await getUserFromDatabase();
  if (!user || !user.connectionId) {
    await reply.status(400).send({ error: 'invalid_user' });
    return;
  }

  // Trigger the action to send a Slack message.
  try {
    await nango.triggerAction(integration, user.connectionId, 'send-message', {
      userSlackId: slackUserId,
    });
  } catch (err) {
    console.error(JSON.stringify(err, ['error', 'message', 'code']));
    await reply.status(500).send({ success: true });
    return;
  }

  await reply.status(200).send({ success: true });
};
