import type { RouteHandler } from 'fastify';
import { nango } from '../nango.js';
import { db } from '../db.js';

// Block requests to localhost, loopback, link-local, and private IP ranges (SSRF prevention)
const SSRF_BLOCKLIST = [
    /^localhost/i,
    /^127\./,
    /^0\.0\.0\.0/,
    /^::1$/,
    /^10\./,
    /^172\.(1[6-9]|2\d|3[01])\./,
    /^192\.168\./,
    /^169\.254\./,
    /^metadata\.google/i,
    /^fd[0-9a-f]{2}:/i,
    /^::ffff:/i,
    /^\[::ffff:/i,
];

function isSsrfTarget(endpoint: string): boolean {
    try {
        const url = new URL(endpoint, 'https://placeholder.invalid');
        return SSRF_BLOCKLIST.some((re) => re.test(url.hostname));
    } catch {
        // relative paths (no hostname) are fine — Nango resolves them against the integration base URL
        return false;
    }
}

/**
 * Generic proxy endpoint — forwards requests through Nango's proxy.
 * Powers the Developer Console proxy builder.
 */
export const postProxy: RouteHandler<{
    Body: {
        providerConfigKey: string;
        method: 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE';
        endpoint: string;
        data?: unknown;
        headers?: Record<string, string>;
    };
}> = async (req, reply) => {
    const { providerConfigKey, method, endpoint, data, headers } = req.body;

    if (!providerConfigKey || !endpoint) {
        await reply.status(400).send({ error: 'providerConfigKey and endpoint are required' });
        return;
    }

    if (isSsrfTarget(endpoint)) {
        await reply.status(400).send({ error: 'Invalid endpoint' });
        return;
    }

    const userConnection = await db.userConnections.findFirst({
        where: { userId: req.user.userId, providerConfigKey }
    });

    if (!userConnection) {
        await reply.status(404).send({ error: 'No connection found for this provider. Connect first.' });
        return;
    }

    try {
        const proxyConfig: Parameters<typeof nango.proxy>[0] = {
            method: method ?? 'GET',
            providerConfigKey,
            connectionId: userConnection.connectionId,
            endpoint
        };
        if (data !== undefined) (proxyConfig as any).data = data;
        if (headers !== undefined) proxyConfig.headers = headers;

        const response = await nango.proxy(proxyConfig);

        await reply.status(200).send({
            status: response.status,
            data: response.data
        });
    } catch (err: any) {
        console.error('Proxy error:', err?.message);
        await reply.status(502).send({ error: 'Proxy request failed' });
    }
};
