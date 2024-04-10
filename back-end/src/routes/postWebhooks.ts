import z from 'zod';
import type { RouteHandler } from 'fastify';
import { nango } from '../nango.js';
import { db } from '../db.js';

const validation = z
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
  .strict();

/**
 * Receive webhooks from Nango every time a records has been added, updated or deleted
 */
export const postWebhooks: RouteHandler = async (req, reply) => {
  const res = validation.safeParse(req.body);
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
      // @ts-expect-error
      create: { id: record.id },
      update: { id: record.id },
    });
  }

  await reply.status(200).send({ ack: true });
};
