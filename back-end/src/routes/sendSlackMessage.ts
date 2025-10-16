import type { RouteHandler } from 'fastify';
import { nango } from '../nango.js';
import { getUserFromDatabase, getUserConnection } from '../db.js';
import type { ActionInput_slack_sendmessage } from '../schema.js';

/**
 * Send a Slack message to a specific Slack user.
 */
export const sendSlackMessage: RouteHandler<{
    Body: { integration: string; slackUserId: string };
}> = async (req, reply) => {
    const { integration, slackUserId } = req.body;
    const user = await getUserFromDatabase();
    if (!user) {
        await reply.status(400).send({ error: 'invalid_user' });
        return;
    }

    const userConnection = await getUserConnection(user.id, integration);
    if (!userConnection) {
        await reply.status(400).send({ error: 'no_connection_found_for_integration' });
        return;
    }

    // Trigger the action to send a Slack message.
    try {
        const input: ActionInput_slack_sendmessage = {
            channel: slackUserId,
            text: 'Invitation to join <https://nango.dev?rel=sample_app_slack_message|MySaaS.com>'
        };
        await nango.triggerAction(integration, userConnection.connectionId, 'send-message', input);
    } catch (err) {
        console.error(JSON.stringify(err, ['error', 'message', 'code']));
        await reply.status(500).send({ success: true });
        return;
    }

    await reply.status(200).send({ success: true });
};
