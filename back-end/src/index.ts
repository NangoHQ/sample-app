import Fastify from 'fastify';
import z from 'zod';
import { db } from './db.js';

const fastify = Fastify({
  logger: true,
});

fastify.get('/', async function handler(_, reply) {
  await reply.status(200).send({ root: true });
});

/**
 * Receive webhooks from Nango everytime a records has been added or deleted
 */
fastify.post('/webhooks-from-nango', async function handler(_, reply) {
  await reply.status(200).send({ root: true });
});

/**
 * List contacts to display in the UI
 */
fastify.get('/contacts', async function handler(req, reply) {
  const res = z
    .object({
      integration: z.enum(['linkedin', 'hubspot', 'slack']),
    })
    .strict()
    .safeParse(req.query);
  if (!res.success) {
    await reply.status(400).send({ error: true, msg: res.error });
    return;
  }

  // Get the contacts we saved in our own database
  const contacts = await db.contacts.findMany({
    orderBy: { updatedAt: 'desc' },
    take: 100,
  });

  await reply.status(200).send({ contacts });
});

try {
  await fastify.listen({ port: 3000 });
} catch (err) {
  fastify.log.error(err);
  process.exit(1);
}
