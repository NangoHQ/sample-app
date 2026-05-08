import type { RouteHandler } from 'fastify';
import { nango } from '../nango.js';
import { db } from '../db.js';

export const postCalendarStopWatch: RouteHandler = async (req, reply) => {
    const userConnection = await db.userConnections.findFirst({
        where: { userId: req.user.userId, providerConfigKey: 'google-calendar' }
    });

    if (!userConnection) {
        await reply.status(404).send({ error: 'No Google Calendar connection found' });
        return;
    }

    const metadata = await nango.getMetadata<{
        googleCalendarChannelId?: string;
        googleCalendarResourceId?: string;
    }>('google-calendar', userConnection.connectionId);

    const channelId = metadata?.googleCalendarChannelId;
    const resourceId = metadata?.googleCalendarResourceId;

    if (!channelId || !resourceId) {
        await reply.status(400).send({ error: 'No active watch channel found' });
        return;
    }

    try {
        await nango.proxy({
            method: 'POST',
            providerConfigKey: 'google-calendar',
            connectionId: userConnection.connectionId,
            endpoint: '/calendar/v3/channels/stop',
            data: { id: channelId, resourceId }
        });

        await nango.updateMetadata('google-calendar', userConnection.connectionId, {
            ...metadata,
            googleCalendarChannelId: undefined,
            googleCalendarResourceId: undefined
        });

        await reply.status(200).send({ success: true });
    } catch (err: any) {
        await reply.status(500).send({ error: err?.message ?? 'Failed to stop watch channel' });
    }
};
