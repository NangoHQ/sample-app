import type { FastifyRequest, FastifyReply } from 'fastify';
import jwt from 'jsonwebtoken';

const JWT_SECRET = process.env['JWT_SECRET']!;

export interface JwtPayload {
    userId: string;
    email: string;
    displayName: string;
}

declare module 'fastify' {
    interface FastifyRequest {
        user: JwtPayload;
    }
}

/**
 * Fastify onRequest hook that enforces JWT auth.
 * Accepts the token via Authorization: Bearer <token> header,
 * or via ?token=<token> query param (for SSE, which can't set headers).
 */
export async function authenticate(req: FastifyRequest, reply: FastifyReply): Promise<void> {
    const queryToken = (req.query as Record<string, string | undefined>)['token'];
    const authHeader = req.headers['authorization'];
    const headerToken = authHeader?.startsWith('Bearer ') ? authHeader.slice(7) : undefined;
    const token = queryToken ?? headerToken;

    if (!token) {
        await reply.status(401).send({ error: 'unauthorized' });
        return;
    }

    try {
        req.user = jwt.verify(token, JWT_SECRET, { algorithms: ['HS256'] }) as JwtPayload;
    } catch {
        await reply.status(401).send({ error: 'unauthorized' });
    }
}
