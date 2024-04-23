import Fastify from 'fastify';
import cors from '@fastify/cors';

import { postWebhooks } from './routes/postWebhooks.js';
import { getContacts } from './routes/getContacts.js';
import { getIntegrations } from './routes/getIntegrations.js';
import { getConnections } from './routes/getConnections.js';
import { deleteConnection } from './routes/deleteConnection.js';

export const fastify = Fastify({ logger: false });
fastify.addHook('onRequest', (req, _res, done) => {
  console.log(`#${req.id} <- ${req.method} ${req.url}`);
  done();
});

await fastify.register(cors, {
  origin: ['http://localhost:3000'],
  credentials: true,
});

fastify.get('/', async function handler(_, reply) {
  await reply.status(200).send({ root: true });
});

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
