import type { RouteHandler } from 'fastify';
import { nango } from '../nango.js';
import { getUserFromDatabase } from '../db.js';
import { mimeTypeMapping } from '../utils.js';
import type { GoogleDriveFile } from '../schema.js';

const MAX_FILE_SIZE = 10 * 1024 * 1024; // 10MB in bytes

export const downloadFile: RouteHandler = async (req, reply) => {
  const { fileId } = req.params as { fileId: string };

  try {
    const user = await getUserFromDatabase();
    if (!user) {
      await reply.status(400).send({ error: 'invalid_user' });
      return;
    }
    if (!user.connectionId) {
      await reply.status(400).send({ error: 'No connection found' });
      return;
    }

    const metadataConfig = {
      // https://developers.google.com/drive/api/reference/rest/v3/files/get
      providerConfigKey: 'google-drive',
      connectionId: user.connectionId,
      endpoint: `drive/v3/files/${fileId}`,
      params: {
        fields: 'id, name, mimeType, size',
        supportsAllDrives: 'true'
      },
      retries: 3
    };
    const fileMetadataResponse = await nango.get<GoogleDriveFile>(metadataConfig);

    if (fileMetadataResponse.status !== 200 || !fileMetadataResponse.data) {
      throw new Error(`Failed to retrieve file metadata: Status Code ${fileMetadataResponse.status}`);
    }

    const file = fileMetadataResponse.data;
    const mimeTypeDetails = mimeTypeMapping[file.mimeType];

    if (file.size && file.size > MAX_FILE_SIZE) {
      await reply.status(400).send({ error: 'File too large' });
      return;
    }

    if (!mimeTypeDetails) {
      throw new Error(`Unsupported MIME type: ${file.mimeType}`);
    }

    const { mimeType: exportMimeType, responseType } = mimeTypeDetails;

    console.log('Fetching document of ', { exportMimeType });
    console.log('Fetching document of ', { responseType });

    // Use a different variable name to avoid redeclaration
    const downloadResponseType: 'text' | 'arraybuffer' = mimeTypeDetails.responseType === 'text' ? 'text' : 'arraybuffer';

    const downloadConfig = {
      // https://developers.google.com/drive/api/reference/rest/v3/files/get
      // https://developers.google.com/drive/api/reference/rest/v3/files/export
      providerConfigKey: 'google-drive',
      connectionId: user.connectionId,
      endpoint: downloadResponseType === 'text' ? `drive/v3/files/${file.id}/export` : `drive/v3/files/${file.id}`,
      params: downloadResponseType === 'text' ? { mimeType: exportMimeType } : { alt: 'media' },
      responseType: downloadResponseType, // Use the new variable
      retries: 3
    };
    const response = await nango.get(downloadConfig);

    if (response.status !== 200) {
      throw new Error(`Failed to retrieve file content: Status Code ${response.status}`);
    }

    if (downloadResponseType === 'text') {
      await reply.send(response.data ?? '');
    } else {
      const chunks: Uint8Array[] = [];
      for await (const chunk of response.data) {
        chunks.push(chunk);
      }
      const buffer = Buffer.concat(chunks);

      console.log('MIME Type:', file.mimeType);
      console.log('File Name:', file.name);

      const finalMimeType = downloadResponseType === 'arraybuffer'
        ? exportMimeType
        : file.mimeType;

      // Set headers for file download
      reply.header('Content-Type', finalMimeType);
      reply.header('Content-Disposition', `attachment; filename="${file.name}"`);

      // Send the buffer directly
      await reply.send(buffer);
    }
  } catch (error) {
    console.error('Failed to download file:', error);
    await reply.status(500).send({ error: 'Failed to download file' });
  }
}; 