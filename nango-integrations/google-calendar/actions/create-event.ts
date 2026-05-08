import { createAction } from 'nango';
import { CreateCalendarEventInput, CreateCalendarEventOutput } from '../../models.js';

const action = createAction({
    description: 'Creates a new event on the user\'s primary Google Calendar',
    version: '0.0.1',
    endpoint: { method: 'POST', path: '/create-event' },
    input: CreateCalendarEventInput,
    output: CreateCalendarEventOutput,
    scopes: ['https://www.googleapis.com/auth/calendar.events'],

    exec: async (nango, input) => {
        const eventBody: any = {
            summary: input.summary,
            start: { dateTime: input.startDateTime, timeZone: input.timeZone ?? 'UTC' },
            end:   { dateTime: input.endDateTime,   timeZone: input.timeZone ?? 'UTC' }
        };
        if (input.description) eventBody.description = input.description;
        if (input.attendees?.length) eventBody.attendees = input.attendees;

        const response = await nango.post({
            endpoint: '/calendar/v3/calendars/primary/events',
            data: eventBody
        });

        return {
            id: response.data.id,
            summary: response.data.summary,
            htmlLink: response.data.htmlLink,
            status: response.data.status
        };
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
