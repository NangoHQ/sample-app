import Fastify from 'fastify';
import cors from '@fastify/cors';
import helmet from '@fastify/helmet';
import rateLimit from '@fastify/rate-limit';

// Fail fast rather than silently misbehave at request time.
const REQUIRED_ENV = ['NANGO_SECRET_KEY', 'JWT_SECRET'] as const;
for (const key of REQUIRED_ENV) {
    if (!process.env[key]) {
        console.error(`Missing required environment variable: ${key}`);
        process.exit(1);
    }
}

import { postWebhooks } from './routes/postWebhooks.js';
import { getContacts } from './routes/getContacts.js';
import { getIntegrations } from './routes/getIntegrations.js';
import { getConnections } from './routes/getConnections.js';
import { postConnection } from './routes/postConnection.js';
import { deleteConnection } from './routes/deleteConnection.js';
import { sendSlackMessage } from './routes/sendSlackMessage.js';
import { postConnectSession } from './routes/postConnectSession.js';
import { postReconnectSession } from './routes/postReconnectSession.js';
import { postAuthRegister } from './routes/postAuthRegister.js';
import { postAuthLogin } from './routes/postAuthLogin.js';
import { getFiles } from './routes/getFiles.js';
import { downloadFile } from './routes/downloadFile.js';
import { getNangoCredentials } from './routes/getNangoCredentials.js';
import { setConnectionMetadata } from './routes/setConnectionMetadata.js';
import { getSSEWebhooks } from './routes/getSSEWebhooks.js';
import { postActionTrigger } from './routes/postActionTrigger.js';
import { postMCPTool } from './routes/postMCPTool.js';
import { postAgentRun } from './routes/postAgentRun.js';
import { postProxy } from './routes/postProxy.js';
import { getWebhookEvents } from './routes/getWebhookEvents.js';
import { deleteWebhookEvents } from './routes/deleteWebhookEvents.js';
import { getRecords } from './routes/getRecords.js';
import { getIntegrationLogo } from './routes/getIntegrationLogo.js';
import { postCalendarSchedule } from './routes/postCalendarSchedule.js';
import { postCalendarStopWatch } from './routes/postCalendarStopWatch.js';
import { postRecordsAnalyze } from './routes/postRecordsAnalyze.js';
import { postRecordsBackfill } from './routes/postRecordsBackfill.js';
import { seedUser } from './db.js';
import { authenticate } from './middleware/auth.js';

const fastify = Fastify({ logger: false, bodyLimit: 1_048_576 /* 1 MB */ });

fastify.addHook('onRequest', (req, _res, done) => {
    console.log(`#${req.id} <- ${req.method} ${req.url}`);
    done();
});

await fastify.register(helmet, {
    contentSecurityPolicy: false
});

await fastify.register(cors, {
    origin: process.env['FRONTEND_URL'] ? [process.env['FRONTEND_URL'], 'http://localhost:3011'] : ['http://localhost:3011'],
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS']
});

await fastify.register(rateLimit, {
    global: true,
    max: 200,
    timeWindow: '1 minute',
    keyGenerator: (req) => req.ip,
    allowList: (_req, key) => key === '/webhooks-from-nango',
    errorResponseBuilder: (_req, ctx) => ({
        error: 'too_many_requests',
        message: `Rate limit exceeded. Retry in ${Math.ceil(ctx.ttl / 1000)}s.`
    })
});

fastify.get('/', async function handler(_, reply) {
    await reply.status(200).send({ root: true });
});

fastify.post('/auth/register', { config: { rateLimit: { max: 10, timeWindow: '1 minute' } } }, postAuthRegister);
fastify.post('/auth/login',    { config: { rateLimit: { max: 10, timeWindow: '1 minute' } } }, postAuthLogin);

fastify.post('/webhooks-from-nango', postWebhooks);

await fastify.register(async (app) => {
    app.addHook('onRequest', authenticate);

    app.post('/connect-session', postConnectSession);
    app.post('/reconnect-session', postReconnectSession);

    app.get('/integrations', getIntegrations);
    app.get('/connections', getConnections);
    app.post('/connections', postConnection);
    app.delete('/connections', deleteConnection);

    app.get('/stream/webhooks', getSSEWebhooks);

    app.get('/webhook-events', getWebhookEvents);
    app.delete('/webhook-events', deleteWebhookEvents);

    app.get('/contacts', getContacts);
    app.post('/send-slack-message', sendSlackMessage);

    app.get('/get-files', getFiles);
    app.get('/download/:fileId', downloadFile);

    app.get('/nango-credentials', getNangoCredentials);
    app.post('/set-connection-metadata', setConnectionMetadata);

    app.post('/actions/trigger', postActionTrigger);

    app.post('/mcp/tool',   { config: { rateLimit: { max: 60,  timeWindow: '1 minute' } } }, postMCPTool);

    app.post('/agent/run',  { config: { rateLimit: { max: 20,  timeWindow: '1 minute' } } }, postAgentRun);

    app.get('/records', getRecords);

    app.get('/integration-logo/:integrationId', getIntegrationLogo);

    app.post('/proxy',      { config: { rateLimit: { max: 60,  timeWindow: '1 minute' } } }, postProxy);

    app.post('/calendar/schedule',  { config: { rateLimit: { max: 20, timeWindow: '1 minute' } } }, postCalendarSchedule);
    app.post('/calendar/stop-watch', postCalendarStopWatch);
    app.post('/records/analyze',    { config: { rateLimit: { max: 20, timeWindow: '1 minute' } } }, postRecordsAnalyze);
    app.post('/records/backfill',   { config: { rateLimit: { max: 20, timeWindow: '1 minute' } } }, postRecordsBackfill);
});

try {
    await seedUser();

    const port = process.env['PORT'] ? parseInt(process.env['PORT'], 10) : 3010;
    await fastify.listen({ host: '0.0.0.0', port });
    console.log(`Listening on http://0.0.0.0:${port}`);
} catch (err) {
    console.error(err);
    process.exit(1);
}
