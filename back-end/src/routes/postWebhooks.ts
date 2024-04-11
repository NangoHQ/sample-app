import type { RouteHandler } from 'fastify';
import { AuthOperation } from '@nangohq/node';
import type {
  NangoSyncWebhookBody,
  WebhookAuthBody,
  WebhooksBody,
} from '@nangohq/node';
import { nango } from '../nango.js';
import { db } from '../db.js';

/**
 * Receive webhooks from Nango every time a records has been added, updated or deleted
 */
export const postWebhooks: RouteHandler = async (req, reply) => {
  const body = req.body as WebhooksBody;
  const sig = req.headers['x-nango-signature'] as string;

  console.log('Webhook: received');

  // Verify the signature to be sure Nango sent us this payload
  if (!nango.verifyWebhookSignature(sig, req.body)) {
    console.error('Failed to validate Webhook signature');
    await reply.status(400).send({ error: 'invalid_signature' });
    return;
  }

  // Handle each webhook
  if ('type' in body) {
    handleNewConnectionWebhook(body);
  } else {
    await handleSyncWebhook(body);
  }

  // Always return 200 to avoid re-delivery
  await reply.status(200).send({ ack: true });
};

function handleNewConnectionWebhook(body: WebhookAuthBody) {
  if (body.operation === AuthOperation.CREATION) {
    console.log('Webhook: New connection');
    // Do something here
  }
}

async function handleSyncWebhook(body: NangoSyncWebhookBody) {
  console.log('Webhook: Sync results');

  // We have validated the payload Nango sent us
  // Now we need to fetch the actual records that were added/updated/deleted...
  const records = await nango.listRecords<{ id: string }>({
    connectionId: body.connectionId,
    model: body.model,
    providerConfigKey: body.providerConfigKey,
    modifiedAfter: body.modifiedAfter,
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
}
