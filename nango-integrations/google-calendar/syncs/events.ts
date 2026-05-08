import { createSync } from 'nango';
import * as z from 'zod';
import { GoogleCalendarEvent } from '../../models.js';

const sync = createSync({
    description: 'Syncs upcoming Google Calendar events from the primary calendar',
    version: '0.0.1',
    frequency: 'every 15 minutes',
    autoStart: true,
    syncType: 'full',
    trackDeletes: true,

    endpoints: [{ method: 'GET', path: '/events' }],
    scopes: ['https://www.googleapis.com/auth/calendar.readonly'],
    models: { GoogleCalendarEvent },
    metadata: z.object({}),

    exec: async (nango) => {
        const now = new Date().toISOString();
        const threeMonthsLater = new Date(Date.now() + 90 * 24 * 60 * 60 * 1000).toISOString();

        const response = await nango.get({
            endpoint: '/calendar/v3/calendars/primary/events',
            params: {
                maxResults: '250',
                timeMin: now,
                timeMax: threeMonthsLater,
                orderBy: 'startTime',
                singleEvents: 'true'
            }
        });

        const items: any[] = response.data.items ?? [];
        const events: GoogleCalendarEvent[] = items.map((item) => ({
            id: item.id,
            summary: item.summary,
            description: item.description,
            status: item.status,
            htmlLink: item.htmlLink,
            start: { dateTime: item.start?.dateTime, date: item.start?.date, timeZone: item.start?.timeZone },
            end:   { dateTime: item.end?.dateTime,   date: item.end?.date,   timeZone: item.end?.timeZone   },
            attendees: item.attendees?.map((a: any) => ({
                email: a.email, displayName: a.displayName, responseStatus: a.responseStatus
            })),
            organizer: item.organizer ? { email: item.organizer.email, displayName: item.organizer.displayName } : undefined,
            location: item.location,
            hangoutLink: item.hangoutLink
        }));

        await nango.batchSave(events, 'GoogleCalendarEvent');
    },

    webhookSubscriptions: ['*'],

    onWebhook: async (nango) => {
        await nango.triggerSync(nango.providerConfigKey, nango.connectionId, 'events');
    }
});

export type NangoSyncLocal = Parameters<(typeof sync)['exec']>[0];
export default sync;
