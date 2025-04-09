import type { RouteHandler } from 'fastify';
import { nango } from '../nango.js';
import type { Metadata } from '@nangohq/types';
// import type { GoogleDriveMetadata } from '../schema.js';

export const setGoogleDriveMetadata: RouteHandler = async (req, reply) => {
  const { connectionId } = req.params as { connectionId: string };
  const metadata = req.body as Metadata;

  try {
    await nango.setMetadata('google-drive', connectionId, metadata);
    await nango.triggerSync('google-drive', ['documents'], connectionId);

    await reply.status(200).send({ success: true });
  } catch (error) {
    console.error('Failed to set metadata:', error);
    await reply.status(500).send({ error: 'Failed to set metadata' });
  }
}; 