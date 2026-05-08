import type { RouteHandler } from 'fastify';
import { nango } from '../nango.js';
import { db } from '../db.js';

const NANGO_MCP_URL = 'https://api.nango.dev/mcp';
const MCP_ACCEPT = 'application/json, text/event-stream';
export const postMCPTool: RouteHandler<{
    Body: {
        providerConfigKey: string;
        tool: string;
        input?: Record<string, string>;
    };
}> = async (req, reply) => {
    const { providerConfigKey, tool, input = {} } = req.body;

    if (!providerConfigKey || !tool) {
        await reply.status(400).send({ error: 'providerConfigKey and tool are required' });
        return;
    }

    const userConnection = await db.userConnections.findFirst({
        where: { userId: req.user.userId, providerConfigKey }
    });

    if (!userConnection) {
        await reply.status(404).send({ error: 'No connection found. Connect first.' });
        return;
    }

    try {
        if (providerConfigKey === 'notion-mcp') {
            const result = await callNotionMCPViaProxy(
                userConnection.connectionId,
                input['query'] ?? ''
            );
            await reply.status(200).send({ result });
            return;
        }

        const secretKey = process.env['NANGO_SECRET_KEY']!;

        const result = await callMCPServer(
            NANGO_MCP_URL,
            {
                'Authorization': `Bearer ${secretKey}`,
                'connection-id': userConnection.connectionId,
                'provider-config-key': providerConfigKey
            },
            tool,
            input
        );

        await reply.status(200).send({ result });

    } catch (err: any) {
        console.error('MCP tool error:', err?.message);
        await reply.status(502).send({ error: 'MCP tool call failed' });
    }
};


async function callNotionMCPViaProxy(connectionId: string, query: string): Promise<any> {
    const base = {
        providerConfigKey: 'notion-mcp',
        connectionId,
        baseUrlOverride: 'https://mcp.notion.com',
        endpoint: '/mcp'
    };

    const initRes = await nango.post({
        ...base,
        headers: { 'Accept': MCP_ACCEPT },
        data: {
            jsonrpc: '2.0',
            id: 1,
            method: 'initialize',
            params: {
                protocolVersion: '2024-11-05',
                capabilities: {},
                clientInfo: { name: 'nango-client', version: '1.0.0' }
            }
        }
    });

    const sessionId: string | undefined = (initRes.headers as any)?.['mcp-session-id'];
    const sessionHeaders: Record<string, string> = sessionId ? { 'mcp-session-id': sessionId } : {};

    await nango.post({
        ...base,
        headers: { 'Accept': MCP_ACCEPT, ...sessionHeaders },
        data: { jsonrpc: '2.0', method: 'notifications/initialized' }
    });

    const toolRes = await nango.post({
        ...base,
        headers: { 'Accept': MCP_ACCEPT, ...sessionHeaders },
        data: {
            jsonrpc: '2.0',
            id: 2,
            method: 'tools/call',
            params: {
                name: 'notion-search',
                arguments: { query, query_type: 'internal' }
            }
        }
    });

    const rawData = toolRes.data;

    if (typeof rawData === 'string') {
        return parseSSEResult(rawData);
    }

    if (rawData?.error) throw new Error(rawData.error.message ?? JSON.stringify(rawData.error));
    return rawData?.result;
}


async function callMCPServer(
    serverUrl: string,
    authHeaders: Record<string, string>,
    toolName: string,
    toolArguments: Record<string, unknown>
): Promise<any> {
    const base: Record<string, string> = {
        'Content-Type': 'application/json',
        ...authHeaders
    };

    const initRes = await fetch(serverUrl, {
        method: 'POST',
        headers: { ...base, 'Accept': MCP_ACCEPT },
        body: JSON.stringify({
            jsonrpc: '2.0',
            id: 1,
            method: 'initialize',
            params: {
                protocolVersion: '2024-11-05',
                capabilities: {},
                clientInfo: { name: 'nango-client', version: '1.0.0' }
            }
        })
    });

    if (!initRes.ok) {
        const errText = await initRes.text();
        throw new Error(`MCP initialize failed (${initRes.status}): ${errText}`);
    }

    const sessionId = initRes.headers.get('mcp-session-id');
    await consumeResponse(initRes);

    const sessionHeaders: Record<string, string> = sessionId ? { 'mcp-session-id': sessionId } : {};

    await fetch(serverUrl, {
        method: 'POST',
        headers: { ...base, 'Accept': MCP_ACCEPT, ...sessionHeaders },
        body: JSON.stringify({ jsonrpc: '2.0', method: 'notifications/initialized' })
    });

    const toolRes = await fetch(serverUrl, {
        method: 'POST',
        headers: { ...base, 'Accept': MCP_ACCEPT, ...sessionHeaders },
        body: JSON.stringify({
            jsonrpc: '2.0',
            id: 2,
            method: 'tools/call',
            params: { name: toolName, arguments: toolArguments }
        })
    });

    if (!toolRes.ok) {
        const errText = await toolRes.text();
        throw new Error(`MCP tools/call failed (${toolRes.status}): ${errText}`);
    }

    const contentType = toolRes.headers.get('content-type') ?? '';

    if (contentType.includes('text/event-stream')) {
        return parseSSEResult(await toolRes.text());
    }

    const data = await toolRes.json() as any;
    if (data.error) throw new Error(data.error.message ?? JSON.stringify(data.error));
    return data.result;
}

/** Parse an SSE body and return the first JSON-RPC result payload. */
function parseSSEResult(text: string): any {
    let lastError: Error | null = null;

    for (const line of text.split('\n')) {
        if (!line.startsWith('data: ')) continue;
        const raw = line.slice(6).trim();
        if (!raw || raw === '[DONE]') continue;

        let data: any;
        try {
            data = JSON.parse(raw);
        } catch {
            continue;
        }

        if (data.error) {
            lastError = new Error(data.error.message ?? JSON.stringify(data.error));
        }
        if (data.result !== undefined) return data.result;
    }

    if (lastError) throw lastError;
    throw new Error(`MCP SSE stream contained no result.\nRaw:\n${text.slice(0, 800)}`);
}

/** Drain a Response body so the underlying connection can be reused. */
async function consumeResponse(res: Response): Promise<void> {
    try { await res.text(); } catch { /* ignore */ }
}
