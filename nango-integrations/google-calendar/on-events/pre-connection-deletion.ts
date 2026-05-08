import { createOnEvent } from 'nango';
import type { ProxyConfiguration } from 'nango';

/**
 * Runs automatically before a Google Calendar connection is deleted.
 * Stops the active notification channel so Google stops sending webhooks.
 * Without this, Google would keep delivering notifications until the channel expires.
 */
export default createOnEvent({
    event: 'pre-connection-deletion',
    description: 'Stop Google Calendar notification channel before connection deletion',
    exec: async (nango) => {
        const metadata = await nango.getMetadata<{
            googleCalendarChannelId?: string;
            googleCalendarResourceId?: string;
        }>();

        const channelId = metadata['googleCalendarChannelId'];
        const resourceId = metadata['googleCalendarResourceId'];

        if (!channelId || !resourceId) {
            await nango.log('No active channel found in metadata, skipping stop.');
            return;
        }

        const config: ProxyConfiguration = {
            baseUrlOverride: 'https://www.googleapis.com/calendar',
            endpoint: '/v3/channels/stop',
            data: { id: channelId, resourceId }
        };

        try {
            await nango.post(config);
            await nango.log(`Calendar watch channel stopped: ${channelId}`);
        } catch (err) {
            // Log but don't throw — a failed stop must not block connection deletion
            await nango.log(`Failed to stop Calendar channel: ${String(err)}`, { level: 'error' });
        }
    }
});
