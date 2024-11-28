import Fastify from 'fastify';
import cors from '@fastify/cors';

import { postWebhooks } from './routes/postWebhooks.js';
import { getContacts } from './routes/getContacts.js';
import { getIntegrations } from './routes/getIntegrations.js';
import { getConnections } from './routes/getConnections.js';
import { deleteConnection } from './routes/deleteConnection.js';
import { sendSlackMessage } from './routes/sendSlackMessage.js';
import { postConnectSession } from './routes/postConnectSession.js';
import { seedUser } from './db.js';

const fastify = Fastify({ logger: false });
fastify.addHook('onRequest', (req, _res, done) => {
  console.log(`#${req.id} <- ${req.method} ${req.url}`);
  done();
});

await fastify.register(cors, {
  origin: ['http://localhost:3011'],
  credentials: true,
});

fastify.get('/', async function handler(_, reply) {
  await reply.status(200).send({ root: true });
});

/**
 * Create a connect session
 */
fastify.post('/connect-session', postConnectSession);

/**
 * List available integrations
 * The one you deployed in nango-integrations/
 */
fastify.get('/integrations', getIntegrations);

/**
 * List available connection for one user
 */
fastify.get('/connections', getConnections);

/**
 * Delete a connection for one user
 */
fastify.delete('/connections', deleteConnection);

/**
 * Receive webhooks from Nango every time a records has been added, updated or deleted
 */
fastify.post('/webhooks-from-nango', postWebhooks);

/**
 * List contacts to display in the UI
 * Contacts are the records Nango fetched from the different integrations
 */
fastify.get('/contacts', getContacts);

/**
 * Send a Slack message to a given Slack user.
 */
fastify.post('/send-slack-message', sendSlackMessage);

try {
  await seedUser();

  const port = process.env['PORT'] ? parseInt(process.env['PORT'], 10) : 3010;
  await fastify.listen({ host: '0.0.0.0', port });
  console.log(`Listening on http://0.0.0.0:${port}`);
} catch (err) {
  console.error(err);
  process.exit(1);
}
