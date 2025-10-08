import type { RouteHandler } from 'fastify';
import { nango } from '../nango.js';
import { getUserFromDatabase, getUserConnection, db } from '../db.js';
import { mimeTypeMapping } from '../utils.js';

export const downloadFile: RouteHandler = async (req, reply) => {
    const { fileId } = req.params as { fileId: string };

    try {
        const user = await getUserFromDatabase();
        if (!user) {
            return reply.status(400).send({ error: 'invalid_user' });
        }

        const fileRecord = await db.files.findFirst({
            where: {
                id: fileId,
                deletedAt: null
            }
        });

        if (!fileRecord) {
            return reply.status(404).send({ error: 'file_not_found' });
        }

        const provider = fileRecord.integrationId;

        const userConnection = await getUserConnection(user.id, provider);
        if (!userConnection) {
            return reply.status(400).send({ error: 'connection_not_found_for_provider' });
        }

        if (fileRecord.connectionId !== userConnection.connectionId) {
            return reply.status(403).send({ error: 'file_not_accessible' });
        }

        if (provider === 'google-drive') {
            return await downloadGoogleDriveFile(fileId, userConnection.connectionId, reply);
        } else if (provider === 'one-drive') {
            return await downloadOneDriveFile(fileId, userConnection.connectionId, reply, fileRecord);
        } else {
            return reply.status(400).send({ error: 'unsupported_provider' });
        }
    } catch (err) {
        console.error('Download error:', err);
        return reply.status(500).send({ error: 'Failed to download file' });
    }
};

async function downloadGoogleDriveFile(fileId: string, connectionId: string, reply: any) {
    const metadataRes = await nango.get({
        providerConfigKey: 'google-drive',
        connectionId: connectionId,
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

    const isGoogleNative = file.mimeType.startsWith('application/vnd.google-apps.');
    const exportMimeType = mimeDetails.mimeType;
    const responseType = mimeDetails.responseType === 'text' ? 'text' : 'arraybuffer';

    const endpoint = isGoogleNative ? `drive/v3/files/${file.id}/export` : `drive/v3/files/${file.id}`;
    const params = isGoogleNative ? { mimeType: exportMimeType } : { alt: 'media' };

    const downloadRes = await nango.get({
        providerConfigKey: 'google-drive',
        connectionId: connectionId,
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
}

async function downloadOneDriveFile(fileId: string, connectionId: string, reply: any, fileRecord: any) {
    const driveId = fileRecord.driveId || 'me';

    const fetchFileRes = await nango.get({
        providerConfigKey: 'one-drive',
        connectionId: connectionId,
        endpoint: `/v1.0/drives/${driveId}/items/${fileId}`,
        params: {
            select: 'id, name, @microsoft.graph.downloadUrl'
        },
        retries: 3
    });

    if (fetchFileRes.status !== 200 || !fetchFileRes.data) {
        throw new Error(`Failed to fetch download URL: ${fetchFileRes.status}`);
    }

    const file = fetchFileRes.data;
    const downloadUrl = file['@microsoft.graph.downloadUrl'];

    if (!downloadUrl) {
        throw new Error('No download URL available for this file');
    }

    const downloadRes = await nango.get({
        providerConfigKey: 'one-drive',
        connectionId: connectionId,
        endpoint: '',
        baseUrlOverride: downloadUrl,
        responseType: 'arraybuffer',
        retries: 3
    });

    if (downloadRes.status !== 200 || !downloadRes.data) {
        throw new Error(`Failed to download file: ${downloadRes.status}`);
    }

    const contentType = downloadRes.headers?.['content-type'] || 'application/octet-stream';

    reply.header('Content-Type', contentType);
    reply.header('Content-Disposition', `attachment; filename="${file.name}"`);
    return reply.send(downloadRes.data);
}
