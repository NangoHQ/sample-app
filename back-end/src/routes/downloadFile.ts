import type { RouteHandler } from 'fastify';
import { nango } from '../nango.js';
import { db } from '../db.js';

export const downloadFile: RouteHandler = async (req, reply) => {
  const { connectionId, fileId } = req.params as { connectionId: string; fileId: string };

  try {
    // Get the file from our database
    const file = await db.files.findUnique({
      where: {
        id: fileId,
        connectionId,
      },
    });

    if (!file) {
      await reply.status(404).send({ error: 'File not found' });
      return;
    }

    // Use Nango proxy to download the file
    const response = await nango.proxy({
      connectionId,
      providerConfigKey: 'google-drive',
      endpoint: `/files/${fileId}`,
      params: {
        alt: 'media',
      },
    });

    // Set appropriate headers for file download
    reply.header('Content-Type', file.mimeType);
    reply.header('Content-Disposition', `attachment; filename="${file.name}"`);
    
    await reply.send(response.data);
  } catch (error) {
    console.error('Failed to download file:', error);
    await reply.status(500).send({ error: 'Failed to download file' });
  }
}; 