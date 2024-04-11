import Fastify from 'fastify';
import { postWebhooks } from './routes/postWebhooks.js';
import { getContacts } from './routes/getContacts.js';
import { getIntegrations } from './routes/getIntegrations.js';

const fastify = Fastify({ logger: false });
fastify.addHook('onRequest', (req, _res, done) => {
  console.log(`#${req.id} <- ${req.method} ${req.url}`);
  done();
});

fastify.get('/', async function handler(_, reply) {
  await reply.status(200).send({ root: true });
});

/**
 * List available integrations
 */
fastify.get('/integrations', getIntegrations);

/**
 * Receive webhooks from Nango every time a records has been added or deleted
 */
fastify.post('/webhooks-from-nango', postWebhooks);

/**
 * List contacts to display in the UI
 */
fastify.get('/contacts', getContacts);

try {
  await fastify.listen({ port: 3003 });
} catch (err) {
  fastify.log.error(err);
  process.exit(1);
}
