import type { RouteHandler } from 'fastify';
import { nango } from '../nango.js';
import { db } from '../db.js';

const OPENCODE_API_URL = 'https://opencode.ai/zen/v1/chat/completions';


const SSRF_BLOCKLIST = [
    /^localhost/i, /^127\./, /^0\.0\.0\.0/, /^::1$/,
    /^10\./, /^172\.(1[6-9]|2\d|3[01])\./, /^192\.168\./,
    /^169\.254\./, /^metadata\.google/i, /^fd[0-9a-f]{2}:/i,
    /^::ffff:/i, /^\[::ffff:/i,
];

function isSsrf(endpoint: string): boolean {
    try {
        const url = new URL(endpoint, 'https://placeholder.invalid');
        return SSRF_BLOCKLIST.some((re) => re.test(url.hostname));
    } catch {
        return false;
    }
}


export const postAgentRun: RouteHandler<{
    Body: {
        prompt?: string;
        messages?: { role: string; content: string }[];
    };
}> = async (req, reply) => {
    const { prompt, messages: incomingMessages } = req.body;

    if (!prompt && !incomingMessages?.length) {
        await reply.status(400).send({ error: 'prompt or messages are required' });
        return;
    }

    const apiKey = process.env['OPENCODE_API_KEY'];
    const model = process.env['OPENCODE_MODEL'] ?? 'opencode/kimi-k2.5';
    if (!apiKey) {
        await reply.status(500).send({ error: 'OPENCODE_API_KEY is not configured.' });
        return;
    }

    const userConnections = await db.userConnections.findMany({
        where: { userId: req.user.userId }
    });

    if (!userConnections.length) {
        await reply.status(400).send({ error: 'No connected integrations. Connect one first.' });
        return;
    }

    type ConnEntry = { providerConfigKey: string; connectionId: string };
    const connectionMap = new Map<string, ConnEntry>();
    for (const conn of userConnections) {
        connectionMap.set(conn.providerConfigKey, {
            providerConfigKey: conn.providerConfigKey,
            connectionId: conn.connectionId
        });
    }

    const connectedList = [...connectionMap.keys()];
    const apiHints = connectedList
        .map((key) => INTEGRATION_API_HINTS[key])
        .filter(Boolean)
        .join('\n');

    const systemPrompt = `You are a helpful assistant that can take actions across the user's connected integrations by making live API calls.

Connected integrations: ${connectedList.join(', ')}

You have ONE tool: api_call — it proxies any HTTP request to a connected integration. Nango handles authentication automatically.

API reference for the user's integrations:
${apiHints}

Guidelines:
- Use api_call freely to answer questions and perform actions. Chain multiple calls if needed.
- When listing data, summarise it clearly (don't dump raw JSON at the user).
- If an API call fails, explain why and suggest alternatives.
- Today's date: ${new Date().toISOString().slice(0, 10)}`;

    const tools = [
        {
            type: 'function' as const,
            function: {
                name: 'api_call',
                description: 'Make an authenticated API call to any connected integration. Nango injects the auth token automatically.',
                parameters: {
                    type: 'object',
                    properties: {
                        integration: {
                            type: 'string',
                            description: `Which integration to call. One of: ${connectedList.join(', ')}`,
                            enum: connectedList
                        },
                        method: {
                            type: 'string',
                            enum: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE'],
                            description: 'HTTP method'
                        },
                        endpoint: {
                            type: 'string',
                            description: 'API endpoint path or full URL (e.g. /calendar/v3/calendars/primary/events or users.list for Slack)'
                        },
                        params: {
                            type: 'object',
                            description: 'Query string parameters',
                            additionalProperties: true
                        },
                        data: {
                            type: 'object',
                            description: 'Request body for POST / PUT / PATCH',
                            additionalProperties: true
                        }
                    },
                    required: ['integration', 'method', 'endpoint']
                }
            }
        }
    ];

    const steps: AgentStep[] = [];

    try {
        const messages: any[] = [
            { role: 'system', content: systemPrompt },
            ...(incomingMessages?.length
                ? incomingMessages
                : [{ role: 'user', content: prompt! }])
        ];

        const userPrompt = prompt ?? (incomingMessages?.findLast((m) => m.role === 'user')?.content ?? '');
        steps.push({ type: 'llm_request', model, prompt: userPrompt });

        for (let round = 0; round < 10; round++) {
            const response = await callLLM(apiKey, { model, tools, messages });
            const choice = response.choices[0];
            const msg = choice.message;

            messages.push(msg);

            if (msg.content) {
                steps.push({ type: 'llm_text', text: msg.content });
            }

            if (choice.finish_reason !== 'tool_calls' || !msg.tool_calls?.length) {
                steps.push({ type: 'final_response', text: msg.content ?? '' });
                await reply.status(200).send({ steps, messages });
                return;
            }

            for (const toolCall of msg.tool_calls) {
                if (toolCall.function.name !== 'api_call') {
                    messages.push({ role: 'tool', tool_call_id: toolCall.id, content: 'Unknown tool' });
                    continue;
                }

                let args: { integration: string; method: string; endpoint: string; params?: any; data?: any };
                try {
                    args = JSON.parse(toolCall.function.arguments ?? '{}');
                } catch {
                    messages.push({ role: 'tool', tool_call_id: toolCall.id, content: 'Invalid tool arguments (not valid JSON)' });
                    continue;
                }

                const { integration, method, endpoint, params, data } = args;

                if (isSsrf(endpoint)) {
                    messages.push({ role: 'tool', tool_call_id: toolCall.id, content: 'Blocked: invalid endpoint' });
                    continue;
                }

                const conn = connectionMap.get(integration);
                if (!conn) {
                    messages.push({ role: 'tool', tool_call_id: toolCall.id, content: `No connection found for integration: ${integration}` });
                    continue;
                }

                steps.push({ type: 'tool_call', integration, method, endpoint, params, data });

                try {
                    const proxyConfig: any = {
                        method: method ?? 'GET',
                        providerConfigKey: conn.providerConfigKey,
                        connectionId: conn.connectionId,
                        endpoint
                    };
                    if (params && Object.keys(params).length) proxyConfig.params = params;
                    if (data !== undefined) proxyConfig.data = data;

                    const proxyRes = await nango.proxy(proxyConfig);
                    const result = proxyRes.data;

                    steps.push({ type: 'tool_result', integration, endpoint, result });
                    const resultStr = JSON.stringify(result);
                    const truncated = resultStr.length > 8000 ? resultStr.slice(0, 8000) + '…[truncated]' : resultStr;
                    messages.push({ role: 'tool', tool_call_id: toolCall.id, content: truncated });
                } catch (err: any) {
                    const errMsg = err?.message ?? 'API call failed';
                    steps.push({ type: 'tool_error', integration, endpoint, error: errMsg });
                    messages.push({ role: 'tool', tool_call_id: toolCall.id, content: `Error: ${errMsg}` });
                }
            }
        }

        steps.push({ type: 'final_response', text: 'The request took too many steps and was stopped.' });
        await reply.status(200).send({ steps, messages });

    } catch (err: any) {
        console.error('Agent run error:', err?.message);
        await reply.status(502).send({ error: 'Agent run failed' });
    }
};


async function callLLM(apiKey: string, body: object): Promise<any> {
    const res = await fetch(OPENCODE_API_URL, {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${apiKey}`, 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
        signal: AbortSignal.timeout(60_000)
    });
    const text = await res.text();
    if (!res.ok) throw new Error(`LLM API error (${res.status}): ${text}`);
    try { return JSON.parse(text); }
    catch { throw new Error(`LLM returned non-JSON (${res.status}): ${text.slice(0, 300)}`); }
}


const INTEGRATION_API_HINTS: Record<string, string> = {
    slack: `
### Slack (base: https://slack.com/api)
- GET  users.list                    → list workspace members (members[].id/name/profile.email/profile.real_name)
- GET  conversations.list            → list channels (params: types=public_channel,private_channel) → channels[].id/name
- GET  conversations.info            → get channel info (params: channel=ID)
- GET  conversations.history         → get messages in a channel (params: channel=ID, limit=50)
- GET  users.info                    → get user details (params: user=ID)
- POST chat.postMessage              → send message (body: { channel, text })
- GET  team.info                     → workspace info (name, domain, member count)
`,
    'google-calendar': `
### Google Calendar (base: https://www.googleapis.com)
- GET  /calendar/v3/calendars/primary/events          → list events (params: timeMin, timeMax, maxResults, orderBy=startTime, singleEvents=true)
- POST /calendar/v3/calendars/primary/events          → create event (body: { summary, start:{dateTime,timeZone}, end:{dateTime,timeZone}, description, location, attendees:[{email}] })
- GET  /calendar/v3/calendars/primary/events/{id}     → get single event
- DELETE /calendar/v3/calendars/primary/events/{id}   → delete event
- GET  /calendar/v3/calendarList                      → list all calendars the user has
`,
    'google-drive': `
### Google Drive (base: https://www.googleapis.com)
- GET  /drive/v3/files                → list/search files (params: q='name contains "x"', fields='files(id,name,mimeType,webViewLink,modifiedTime)', pageSize=50)
- GET  /drive/v3/files/{id}           → get file metadata (params: fields=id,name,webViewLink,mimeType,size)
- GET  /drive/v3/files/{id}/export   → export Google Doc as plain text (params: mimeType=text/plain)
- POST /drive/v3/files                → create file
- GET  /drive/v3/about                → quota and user info (params: fields=storageQuota,user)
`,
    linear: `
### Linear (base: https://api.linear.app)
All operations use GraphQL: POST /graphql with body { query: "...", variables: {} }
- List issues:  { issues(first:20) { nodes { id title state{name} team{name} priority assignee{name} } } }
- List teams:   { teams { nodes { id name key } } }
- List projects: { projects(first:10) { nodes { id name state } } }
- Create issue: mutation { issueCreate(input:{ title:"...", teamId:"..." }) { issue { id url } } }
- Get viewer:   { viewer { id name email } }
`,
    github: `
### GitHub (base: https://api.github.com)
- GET  /user                          → authenticated user info
- GET  /user/repos                    → list repos (params: per_page=30, sort=updated)
- GET  /repos/{owner}/{repo}/issues   → list issues (params: state=open, per_page=20)
- POST /repos/{owner}/{repo}/issues   → create issue (body: { title, body, labels })
- GET  /repos/{owner}/{repo}/pulls    → list PRs (params: state=open)
- GET  /notifications                 → unread notifications
- GET  /user/starred                  → starred repos
- GET  /search/repositories           → search (params: q=..., sort=stars, per_page=10)
`,
    hubspot: `
### HubSpot (base: https://api.hubapi.com)
- GET  /crm/v3/objects/contacts       → list contacts (params: limit=20, properties=firstname,lastname,email,company)
- POST /crm/v3/objects/contacts       → create contact (body: { properties:{ email, firstname, lastname } })
- GET  /crm/v3/objects/contacts/{id}  → get contact
- GET  /crm/v3/objects/companies      → list companies (params: limit=20, properties=name,domain,phone)
- GET  /crm/v3/objects/deals          → list deals (params: limit=20, properties=dealname,amount,closedate,dealstage)
- POST /crm/v3/objects/deals          → create deal
`,
    'one-drive': `
### OneDrive (base: https://graph.microsoft.com)
- GET  /v1.0/me/drive/root/children   → list root files & folders
- GET  /v1.0/me/drive/items/{id}/children → list folder contents
- GET  /v1.0/me/drive/recent          → recently accessed files
- GET  "/v1.0/me/drive/root/search(q='query')" → search files
- GET  /v1.0/me/drive/quota           → storage quota
- GET  /v1.0/me/drive/items/{id}      → get item metadata
`,
    'one-drive-personal': `
### OneDrive Personal (base: https://graph.microsoft.com)
Same endpoints as OneDrive above.
`,
};


type AgentStep =
    | { type: 'llm_request'; model: string; prompt: string }
    | { type: 'llm_text'; text: string }
    | { type: 'tool_call'; integration: string; method: string; endpoint: string; params?: any; data?: any }
    | { type: 'tool_result'; integration: string; endpoint: string; result: any }
    | { type: 'tool_error'; integration: string; endpoint: string; error: string }
    | { type: 'final_response'; text: string };
