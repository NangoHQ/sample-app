import type { RouteHandler } from 'fastify';
import { nango } from '../nango.js';
import { getUserById, getUserFromDatabase, getUserConnection } from '../db.js';
import type { ActionInput_slack_sendmessage } from '../schema.js';

/**
 * Send a Slack message to a specific Slack user.
 */
export const sendSlackMessage: RouteHandler<{
    Body: { slackUserId: string; message: string; appUserId?: string };
}> = async (req, reply) => {
    const { slackUserId, message, appUserId } = req.body;
    const user = appUserId ? await getUserById(appUserId) : await getUserFromDatabase();
    if (!user) {
        await reply.status(400).send({ error: 'invalid_user' });
        return;
    }

    const userConnection = await getUserConnection(user.id, 'slack');
    if (!userConnection) {
        await reply.status(400).send({ error: 'no_connection_found_for_integration' });
        return;
    }

    try {
        const input: ActionInput_slack_sendmessage = {
            channel: slackUserId,
            text: message
        };
        await nango.triggerAction('slack', userConnection.connectionId, 'send-message', input);
    } catch (err) {
        console.error(JSON.stringify(err, ['error', 'message', 'code']));
        await reply.status(500).send({ error: 'Failed to send message' });
        return;
    }

    await reply.status(200).send({ success: true });
};
