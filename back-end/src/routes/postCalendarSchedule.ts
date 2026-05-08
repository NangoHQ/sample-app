import type { RouteHandler } from 'fastify';
import { nango } from '../nango.js';
import { db } from '../db.js';

const OPENCODE_API_URL = 'https://opencode.ai/zen/v1/chat/completions';

const CREATE_EVENT_TOOL = {
    type: 'function' as const,
    function: {
        name: 'create_calendar_event',
        description: 'Create a new event on the user\'s primary Google Calendar',
        parameters: {
            type: 'object',
            properties: {
                summary:     { type: 'string', description: 'The event title' },
                description: { type: 'string', description: 'Optional event description or notes' },
                startDateTime: { type: 'string', description: 'Start time in ISO 8601 format, e.g. 2024-01-15T10:00:00+00:00' },
                endDateTime:   { type: 'string', description: 'End time in ISO 8601 format' },
                timeZone:      { type: 'string', description: 'IANA timezone string, e.g. America/New_York' },
                attendees: {
                    type: 'array',
                    items: { type: 'object', properties: { email: { type: 'string' } }, required: ['email'] },
                    description: 'Optional list of attendee email addresses'
                }
            },
            required: ['summary', 'startDateTime', 'endDateTime']
        }
    }
};

export const postCalendarSchedule: RouteHandler<{
    Body: { prompt: string };
}> = async (req, reply) => {
    const { prompt } = req.body;

    if (!prompt) {
        await reply.status(400).send({ error: 'prompt is required' });
        return;
    }

    const apiKey = process.env['OPENCODE_API_KEY'];
    const model = process.env['OPENCODE_MODEL'] ?? 'opencode/kimi-k2.5';
    if (!apiKey) {
        await reply.status(500).send({ error: 'OPENCODE_API_KEY is not configured on the server.' });
        return;
    }

    const userConnection = await db.userConnections.findFirst({
        where: { userId: req.user.userId, providerConfigKey: 'google-calendar' }
    });
    if (!userConnection) {
        await reply.status(404).send({ error: 'No Google Calendar connection found. Connect first.' });
        return;
    }

    const steps: any[] = [];
    const now = new Date().toISOString();

    steps.push({ type: 'llm_request', model, prompt });

    try {
        const res = await fetch(OPENCODE_API_URL, {
            method: 'POST',
            headers: { Authorization: `Bearer ${apiKey}`, 'Content-Type': 'application/json' },
            body: JSON.stringify({
                model,
                tools: [CREATE_EVENT_TOOL],
                tool_choice: 'required',
                messages: [
                    {
                        role: 'system',
                        content: `You are a calendar scheduling assistant. Today is ${now}. Extract event details from the user's request and call create_calendar_event. Infer reasonable durations (default 1 hour) if not specified. Use UTC if no timezone is mentioned.`
                    },
                    { role: 'user', content: prompt }
                ]
            })
        });

        const text = await res.text();
        if (!res.ok) throw new Error(`LLM error (${res.status}): ${text.slice(0, 300)}`);
        let llmJson: any;
        try {
            llmJson = JSON.parse(text);
        } catch {
            throw new Error(`LLM returned non-JSON response (model="${model}"): ${text.slice(0, 200)}`);
        }
        const msg = llmJson.choices[0].message;

        const toolCall = msg.tool_calls?.[0];
        if (!toolCall) {
            steps.push({ type: 'error', message: 'LLM did not produce a tool call', detail: msg.content ?? '' });
            await reply.status(200).send({ steps });
            return;
        }

        const args = JSON.parse(toolCall.function.arguments ?? '{}');
        steps.push({ type: 'extracted', ...args });

        // Build Google Calendar event body
        const eventBody: any = {
            summary: args.summary,
            start: { dateTime: args.startDateTime, timeZone: args.timeZone ?? 'UTC' },
            end:   { dateTime: args.endDateTime,   timeZone: args.timeZone ?? 'UTC' }
        };
        if (args.description) eventBody.description = args.description;
        if (args.attendees?.length) eventBody.attendees = args.attendees;

        steps.push({ type: 'creating', summary: args.summary });

        const proxyRes = await nango.proxy({
            method: 'POST',
            providerConfigKey: 'google-calendar',
            connectionId: userConnection.connectionId,
            endpoint: '/calendar/v3/calendars/primary/events',
            data: eventBody
        });

        const createdEvent = proxyRes.data;
        steps.push({ type: 'created', event: createdEvent });

        await reply.status(200).send({ steps, event: createdEvent });
    } catch (err: any) {
        steps.push({ type: 'error', message: err?.message ?? 'Scheduling failed' });
        await reply.status(200).send({ steps });
    }
};
