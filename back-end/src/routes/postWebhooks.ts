import crypto from 'node:crypto';
import type { RouteHandler } from 'fastify';
import { nango } from '../nango.js';
import { db } from '../db.js';

type WebhookNewConnection = {
  from: 'nango';
  type: 'auth';
  operation: 'creation' | 'override';
  connectionId: string;
  providerConfigKey: string;
  authMode: string;
  provider: string;
  environment: string;
  success: boolean;
};
type WebhookSync = {
  connectionId: string;
  providerConfigKey: string;
  syncName: string;
  model: string;
  responseResults: Record<
    string,
    { added: number; updated: number; deleted: number }
  >;
  syncType: string;
  modifiedAfter: string;
};
type Webhooks = WebhookNewConnection | WebhookSync;

/**
 * Receive webhooks from Nango every time a records has been added, updated or deleted
 */
export const postWebhooks: RouteHandler = async (req, reply) => {
  const body = req.body as Webhooks;

  if ('type' in body) {
    handleNewConnectionWebhook(body);
    console.log({ body, headers: req.headers });
    const t = crypto
      .createHash('sha256')
      .update(`${process.env['NANGO_SECRET_KEY']}${JSON.stringify(body)}`)
      .digest('hex');

    console.log('sig', t, 'isEq', t === req.headers['x-nango-signature']);
  } else {
    await handleSyncWebhook(body);
  }

  await reply.status(200).send({ ack: true });
};

function handleNewConnectionWebhook(body: WebhookNewConnection) {
  if (body.operation === 'creation') {
    console.log('New connection');
    // Do something here
  }
}

async function handleSyncWebhook(body: WebhookSync) {
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
