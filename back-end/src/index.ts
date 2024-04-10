import Fastify from 'fastify';
import { postWebhooks } from './routes/postWebhooks.js';
import { getContacts } from './routes/getContacts.js';

const fastify = Fastify({
  logger: true,
});

fastify.get('/', async function handler(_, reply) {
  await reply.status(200).send({ root: true });
});

/**
 * Receive webhooks from Nango every time a records has been added or deleted
 */
fastify.post('/webhooks-from-nango', postWebhooks);

/**
 * List contacts to display in the UI
 */
fastify.get('/contacts', getContacts);

try {
  await fastify.listen({ port: 3000 });
} catch (err) {
  fastify.log.error(err);
  process.exit(1);
}
