/* eslint-disable @typescript-eslint/require-await */
import type { RouteHandler } from 'fastify';

import type {
  NangoAuthWebhookBody,
  NangoSyncWebhookBody,
  NangoWebhookBody,
} from '@nangohq/node';
import { nango } from '../nango.js';
import { db } from '../db.js';

/**
 * Receive webhooks from Nango every time a records has been added, updated or deleted
 */
export const postWebhooks: RouteHandler = async (req, reply) => {
  const body = req.body as NangoWebhookBody;
  const sig = req.headers['x-nango-signature'] as string;

  console.log('Webhook: received');

  // Verify the signature to be sure it's Nango that sent us this payload
  if (!nango.verifyWebhookSignature(sig, req.body)) {
    console.error('Failed to validate Webhook signature');
    await reply.status(400).send({ error: 'invalid_signature' });
    return;
  }

  // Handle each webhook
  switch (body.type) {
    case 'auth':
      // New connection
      await handleNewConnectionWebhook(body);
      break;

    case 'sync':
      // After a sync is finished
      await handleSyncWebhook(body);
      break;

    default:
      console.warn('unsupported webhook', body);
      break;
  }

  // Always return 200 to avoid re-delivery
  await reply.status(200).send({ ack: true });
};

// ------------------------

/**
 * Handle webhook when a new connection is created
 */
async function handleNewConnectionWebhook(body: NangoAuthWebhookBody) {
  if (!body.success) {
    console.error('Failed to auth', body);
    return;
  }

  if (body.operation === 'creation') {
    console.log('Webhook: New connection');
    // Do something here
  } else {
    console.log('Webhook: connection', body.operation);
  }
}

/**
 * Handle webhook when a sync has finished fetching data
 */
async function handleSyncWebhook(body: NangoSyncWebhookBody) {
  if (!body.success) {
    console.error('Sync failed', body);
    return;
  }

  console.log('Webhook: Sync results');

  // Now we need to fetch the actual records that were added/updated/deleted
  // The payload does not contains the records but a cursor "modifiedAfter"
  const records = await nango.listRecords<{ id: string; fullName: string }>({
    connectionId: body.connectionId,
    model: body.model,
    providerConfigKey: body.providerConfigKey,
    modifiedAfter: body.modifiedAfter,
    limit: 1000,
  });

  console.log('Records', records.records.length);

  // Save the updates in our backend
  for (const record of records.records) {
    if (record._nango_metadata.deleted_at) {
      // When a record is deleted in the integration you can replicate this in your own system
      await db.contacts.update({
        where: { id: record.id },
        data: { deletedAt: new Date() },
      });
      continue;
    }

    // Create or Update the others records
    await db.contacts.upsert({
      where: { id: record.id },
      create: {
        id: record.id,
        fullName: record.fullName,
        integrationId: body.providerConfigKey,
        connectionId: body.connectionId,
        createdAt: new Date(),
      },
      update: { fullName: record.fullName, updatedAt: new Date() },
    });
  }

  console.log('Results processed');
}
