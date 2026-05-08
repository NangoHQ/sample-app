import { createSync } from 'nango';
import type { ProxyConfiguration } from 'nango';
import { randomUUID } from 'crypto';
import z from 'zod';

const WatchRenewal = z.object({ id: z.string() });

/**
 * Runs daily to renew the Google Calendar notification channel before it expires.
 * Google does not renew channels automatically — they must be recreated every ~7 days.
 * Strategy: create a new channel first, then stop the old one to avoid a gap in coverage.
 */
export default createSync({
    description: 'Renew the Google Calendar events watch channel before it expires',
    models: { WatchRenewal },
    metadata: z.object({
        googleCalendarChannelId: z.string().optional(),
        googleCalendarResourceId: z.string().optional()
    }),
    endpoints: [{ method: 'GET', path: '/watch-renewal' }],
    syncType: 'full',
    frequency: '1d',
    autoStart: true,
    exec: async (nango) => {
        const metadata = await nango.getMetadata();
        const oldChannelId = metadata['googleCalendarChannelId'] as string | undefined;
        const oldResourceId = metadata['googleCalendarResourceId'] as string | undefined;

        // Fetch primary calendar email
        const calResponse = await nango.get({
            baseUrlOverride: 'https://www.googleapis.com/calendar',
            endpoint: '/v3/users/me/calendarList/primary'
        });

        const calendarEmail: string = calResponse.data.id;
        const channelId = randomUUID();
        const expiration = Date.now() + 7 * 24 * 60 * 60 * 1000; // 7 days
        const webhookUrl = await nango.getWebhookURL();

        const watchConfig: ProxyConfiguration = {
            baseUrlOverride: 'https://www.googleapis.com/calendar',
            endpoint: `/v3/calendars/${encodeURIComponent(calendarEmail)}/events/watch`,
            data: {
                id: channelId,
                type: 'webhook',
                address: webhookUrl,
                expiration
            }
        };

        const response = await nango.post(watchConfig);

        // Only stop the old channel after the new one is confirmed active
        if (response.status === 200 && oldChannelId && oldResourceId) {
            try {
                await nango.post({
                    baseUrlOverride: 'https://www.googleapis.com/calendar',
                    endpoint: '/v3/channels/stop',
                    data: { id: oldChannelId, resourceId: oldResourceId }
                });
                await nango.log(`Stopped old channel: ${oldChannelId}`);
            } catch (err) {
                await nango.log(`Failed to stop previous channel: ${String(err)}`, { level: 'error' });
            }
        }

        await nango.updateMetadata({
            googleCalendarChannelId: channelId,
            googleCalendarResourceId: response.data.resourceId
        });

        await nango.batchSave([{ id: channelId }], 'WatchRenewal');
        await nango.log(`Watch channel renewed: ${channelId} (expires in 7 days)`);
    }
});
