import Fastify from 'fastify';
import z from 'zod';
import { db } from './db.js';
import { nango } from './nango.js';

const fastify = Fastify({
  logger: true,
});

fastify.get('/', async function handler(_, reply) {
  await reply.status(200).send({ root: true });
});

/**
 * Receive webhooks from Nango everytime a records has been added or deleted
 */
fastify.post('/webhooks-from-nango', async function handler(req, reply) {
  const res = z
    .object({
      connectionId: z.string(),
      providerConfigKey: z.string(),
      syncName: z.string(),
      model: z.string(),
      responseResults: z.map(
        z.string(),
        z.object({
          added: z.number(),
          updated: z.number(),
          deleted: z.number(),
        })
      ),
      syncType: z.enum(['WEBHOOK']),
      modifiedAfter: z.string(),
    })
    .strict()
    .safeParse(req.body);
  if (!res.success) {
    await reply.status(400).send({ error: true, msg: res.error });
    return;
  }

  // We have validated the payload Nango sent us
  // Now we need to fetch the actual records that were added/updated/deleted...
  const webhook = res.data;
  const records = await nango.listRecords<{ id: string }>({
    connectionId: webhook.connectionId,
    model: webhook.model,
    providerConfigKey: webhook.providerConfigKey,
    modifiedAfter: webhook.modifiedAfter,
  });

  // ... and save the updates in our backend
  for (const record of records.records) {
    // When a record is deleted in the integration you can replicate this in your own system
    if (record._nango_metadata.deleted_at) {
      await db.contacts.update({
        where: { id: record.id },
        data: { deletedAt: new Date() },
      });
      return;
    }

    // And create / update the others records
    await db.contacts.upsert({
      where: { id: record.id },
      create: { id: record.id },
      update: { id: record.id },
    });
  }

  await reply.status(200).send({ ack: true });
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
