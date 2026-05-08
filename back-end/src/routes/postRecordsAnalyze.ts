import type { RouteHandler } from 'fastify';
import { db } from '../db.js';

const OPENCODE_API_URL = 'https://opencode.ai/zen/v1/chat/completions';

export const postRecordsAnalyze: RouteHandler<{
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
        await reply.status(500).send({ error: 'OPENCODE_API_KEY is not configured' });
        return;
    }

    const userConnection = await db.userConnections.findFirst({
        where: { userId: req.user.userId, providerConfigKey: 'google-calendar' }
    });

    if (!userConnection) {
        await reply.status(404).send({ error: 'No Google Calendar connection found. Connect first.' });
        return;
    }

    // Fetch synced records from the Nango records store
    const records = await db.records.findMany({
        where: {
            integrationId: 'google-calendar',
            connectionId: userConnection.connectionId,
            model: 'GoogleCalendarEvent',
            deletedAt: null
        },
        orderBy: { updatedAt: 'desc' },
        take: 100
    });

    const steps: any[] = [];

    steps.push({
        type: 'records_fetch',
        count: records.length,
        model: 'GoogleCalendarEvent',
        source: 'nango_records_store'
    });

    if (records.length === 0) {
        steps.push({ type: 'error', message: 'No synced calendar records found. Wait for the sync to complete.' });
        await reply.status(200).send({ steps });
        return;
    }

    // Trim records to relevant fields to keep token count reasonable
    const eventsForLLM = records.map((r) => {
        const d = r.data as any;
        return {
            id: d.id,
            summary: d.summary ?? '(No title)',
            description: d.description ?? null,
            start: d.start,
            end: d.end,
            attendees: d.attendees?.length ?? 0,
            location: d.location ?? null,
            hangoutLink: d.hangoutLink ?? null,
            status: d.status
        };
    });

    steps.push({
        type: 'llm_request',
        model,
        prompt,
        eventCount: eventsForLLM.length
    });

    const now = new Date().toISOString();

    try {
        const res = await fetch(OPENCODE_API_URL, {
            method: 'POST',
            headers: {
                Authorization: `Bearer ${apiKey}`,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                model,
                messages: [
                    {
                        role: 'system',
                        content: `You are a helpful calendar assistant. Today is ${now}. The user has ${eventsForLLM.length} upcoming calendar events synced via Nango. Analyse them and answer the user's question concisely. Be specific and refer to actual event titles when relevant. Format your response with clear bullet points or sections where appropriate.

Here are the events:
${JSON.stringify(eventsForLLM, null, 2)}`
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
            throw new Error(`LLM returned non-JSON: ${text.slice(0, 200)}`);
        }

        const answer = llmJson.choices[0].message.content ?? '';
        steps.push({ type: 'answer', text: answer });

        await reply.status(200).send({ steps, answer });
    } catch (err: any) {
        steps.push({ type: 'error', message: err?.message ?? 'Analysis failed' });
        await reply.status(200).send({ steps });
    }
};
