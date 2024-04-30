import type { RouteHandler } from 'fastify';
import { nango } from '../nango.js';

/**
 * Send a Slack message to a specific Slack user.
 */
export const sendSlackMessage: RouteHandler<{
  Body: { integration: string; slackUserId: string };
}> = async (req, reply) => {
  const { integration, slackUserId } = req.body;

  // Trigger the action to send a Slack message.
  try {
    await nango.triggerAction(
      integration,
      'my-first-user',
      'send-message',
      { userSlackId: slackUserId }
    );
  } catch (err) {
    console.error(JSON.stringify(err, ['error', 'message', 'code']));
    await reply.status(500).send({ success: true });
    return;
  }

  await reply.status(200).send({ success: true });
};
