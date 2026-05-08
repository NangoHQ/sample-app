import { createOnEvent } from 'nango';
import type { ProxyConfiguration } from 'nango';
import { randomUUID } from 'crypto';
import z from 'zod';

/**
 * Runs automatically after a Google Calendar connection is created.
 * Registers a notification channel so Google pushes calendar changes to Nango as webhooks.
 * The channelId + resourceId are stored in metadata for renewal (watch-renewal sync)
 * and clean-up (pre-connection-deletion event).
 */
export default createOnEvent({
    event: 'post-connection-creation',
    description: 'Create a Google Calendar notification channel for events on the primary calendar',
    metadata: z.object({
        googleCalendarChannelId: z.string().optional(),
        googleCalendarResourceId: z.string().optional()
    }),
    exec: async (nango) => {
        // Fetch primary calendar to get the user's calendar email address
        const calResponse = await nango.get({
            endpoint: '/calendar/v3/users/me/calendarList/primary'
        });

        const calendarEmail: string = calResponse.data.id;
        const channelId = randomUUID();
        const expiration = Date.now() + 7 * 24 * 60 * 60 * 1000; // 7 days
        const integration = await nango.getIntegration({ include: ['webhook'] });
        const webhookUrl = integration.webhook_url;

        const config: ProxyConfiguration = {
            baseUrlOverride: 'https://www.googleapis.com/calendar',
            endpoint: `/v3/calendars/${encodeURIComponent(calendarEmail)}/events/watch`,
            data: {
                id: channelId,
                type: 'webhook',
                address: webhookUrl,
                expiration
            }
        };

        const response = await nango.post(config);

        await nango.updateMetadata({
            googleCalendarChannelId: channelId,
            googleCalendarResourceId: response.data.resourceId
        });

        await nango.log(`Calendar watch channel created: ${channelId} (expires in 7 days)`, {level: "error"});
    }
});
