import type { RouteHandler } from 'fastify';
import { nango } from '../nango.js';
import type { GoogleDriveMetadata } from '../schema.js';

export const setGoogleDriveMetadata: RouteHandler = async (req, reply) => {
  const { connectionId } = req.params as { connectionId: string };
  const metadata = req.body as GoogleDriveMetadata;

  try {
    await nango.setMetadata({
      connectionId,
      providerConfigKey: 'google-drive',
      metadata,
    });

    // Trigger the documents sync
    await nango.triggerSync({
      connectionId,
      providerConfigKey: 'google-drive',
      syncName: 'documents',
    });

    await reply.status(200).send({ success: true });
  } catch (error) {
    console.error('Failed to set metadata:', error);
    await reply.status(500).send({ error: 'Failed to set metadata' });
  }
}; 