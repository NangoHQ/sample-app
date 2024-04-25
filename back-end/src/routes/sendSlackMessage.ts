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
        await nango.triggerAction(integration, 'my-first-user', 'slack-send-message', { userSlackId: slackUserId });
    } catch (err) {
        console.log(err);
    }

    await reply.status(200).send({ success: true });
};
