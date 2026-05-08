import type { RouteHandler } from 'fastify';
import { nango } from '../nango.js';

export type PostConnectSessionSuccess = {
    token: string;
    connectSession: string; // legacy alias
};
export type PostConnectSession = PostConnectSessionSuccess | { error: string };

export const postConnectSession: RouteHandler<{
    Body: { integration: string };
    Reply: PostConnectSession;
}> = async (req, reply) => {
    const { integration } = req.body;

    if (!integration) {
        await reply.status(400).send({ error: 'integration_required' });
        return;
    }

    let res;
    try {
        res = await nango.createConnectSession({
            end_user: {
                id: req.user.userId,
                email: req.user.email,
                display_name: req.user.displayName
            },
            allowed_integrations: [integration]
        });
    } catch (err: any) {
        const nangoError = err?.response?.data ?? err?.message ?? 'nango_error';
        console.error('[connect-session] Nango error:', JSON.stringify(nangoError));
        await reply.status(400).send({ error: nangoError });
        return;
    }

    const token = res.data.token;
    await reply.status(200).send({ token, connectSession: token });
};
