import type { RouteHandler } from 'fastify';
import { nango } from '../nango.js';
import { getUserFromDatabase } from '../db.js';
import { mimeTypeMapping } from '../utils.js';
import type { GoogleDriveFile } from '../schema.js';

const MAX_FILE_SIZE = 10 * 1024 * 1024; // 10MB

export const downloadFile: RouteHandler = async (req, reply) => {
  const { fileId } = req.params as { fileId: string };

  try {
    const user = await getUserFromDatabase();
    if (!user?.connectionId) {
      return reply.status(400).send({ error: 'invalid_user_or_connection' });
    }

    const metadataRes = await nango.get<GoogleDriveFile>({
      providerConfigKey: 'google-drive',
      connectionId: user.connectionId,
      endpoint: `drive/v3/files/${fileId}`,
      params: {
        fields: 'id, name, mimeType, size',
        supportsAllDrives: 'true'
      },
      retries: 3
    });

    if (metadataRes.status !== 200 || !metadataRes.data) {
      throw new Error(`Failed to fetch metadata: ${metadataRes.status}`);
    }

    const file = metadataRes.data;
    const mimeDetails = mimeTypeMapping[file.mimeType];

    if (!mimeDetails) {
      throw new Error(`Unsupported MIME type: ${file.mimeType}`);
    }

    if (file.size && file.size > MAX_FILE_SIZE) {
      return reply.status(400).send({ error: 'File too large' });
    }

    const isGoogleNative = file.mimeType.startsWith('application/vnd.google-apps.');
    const exportMimeType = mimeDetails.mimeType;
    const responseType = mimeDetails.responseType === 'text' ? 'text' : 'arraybuffer';

    const endpoint = isGoogleNative
      ? `drive/v3/files/${file.id}/export`
      : `drive/v3/files/${file.id}`;
    const params = isGoogleNative
      ? { mimeType: exportMimeType }
      : { alt: 'media' };

    const downloadRes = await nango.get({
      providerConfigKey: 'google-drive',
      connectionId: user.connectionId,
      endpoint,
      params,
      responseType,
      retries: 3
    });

    if (downloadRes.status !== 200 || !downloadRes.data) {
      throw new Error(`Failed to download file: ${downloadRes.status}`);
    }

    reply.header('Content-Type', exportMimeType);
    reply.header('Content-Disposition', `attachment; filename="${file.name}"`);
    return reply.send(downloadRes.data);
  } catch (err) {
    console.error('Download error:', err);
    return reply.status(500).send({ error: 'Failed to download file' });
  }
};
