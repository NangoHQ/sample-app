import type { RouteHandler } from 'fastify';
import { nango } from '../nango.js';
import { getUserConnection, db } from '../db.js';
import { mimeTypeMapping } from '../utils.js';

export const downloadFile: RouteHandler = async (req, reply) => {
    const { fileId } = req.params as { fileId: string };

    try {
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

        const userConnection = await getUserConnection(req.user.userId, provider);
        if (!userConnection) {
            return reply.status(400).send({ error: 'connection_not_found_for_provider' });
        }

        if (fileRecord.connectionId !== userConnection.connectionId) {
            return reply.status(403).send({ error: 'file_not_accessible' });
        }

        if (provider === 'google-drive') {
            return await downloadGoogleDriveFile(fileId, userConnection.connectionId, reply);
        } else if (provider === 'one-drive' || provider === 'one-drive-personal') {
            return await downloadOneDriveFile(fileId, provider, userConnection.connectionId, reply, fileRecord);
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

async function downloadOneDriveFile(fileId: string, provider: string, connectionId: string, reply: any, fileRecord: any) {
    // For OneDrive personal, driveId may be stored as 'root' — extract from file ID (format: {driveId}!{itemId})
    let driveId = fileRecord.driveId;
    if (!driveId || driveId === 'root' || driveId === 'me') {
        const exclamationIdx = fileId.indexOf('!');
        driveId = exclamationIdx > -1 ? fileId.substring(0, exclamationIdx) : null;
    }
    const itemEndpoint = driveId
        ? `/v1.0/drives/${driveId}/items/${fileId}`
        : `/v1.0/me/drive/items/${fileId}`;

    // Fetch metadata without $select so the @microsoft.graph.downloadUrl annotation is returned
    const fetchFileRes = await nango.get({
        providerConfigKey: provider,
        connectionId: connectionId,
        endpoint: itemEndpoint,
        retries: 3
    });

    if (fetchFileRes.status !== 200 || !fetchFileRes.data) {
        throw new Error(`Failed to fetch file metadata: ${fetchFileRes.status}`);
    }

    const file = fetchFileRes.data;
    const downloadUrl = file['@microsoft.graph.downloadUrl'];

    // Fall back to /content endpoint if the pre-signed URL is missing
    if (!downloadUrl) {
        const downloadRes = await nango.get({
            providerConfigKey: provider,
            connectionId: connectionId,
            endpoint: `${itemEndpoint}/content`,
            responseType: 'arraybuffer',
            retries: 3
        });

        if (downloadRes.status !== 200 || !downloadRes.data) {
            throw new Error(`Failed to download file: ${downloadRes.status}`);
        }

        const contentType = downloadRes.headers?.['content-type'] || 'application/octet-stream';
        reply.header('Content-Type', contentType);
        reply.header('Content-Disposition', `attachment; filename="${file.name || fileRecord.title}"`);
        return reply.send(downloadRes.data);
    }

    const downloadRes = await nango.get({
        providerConfigKey: provider,
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
    reply.header('Content-Disposition', `attachment; filename="${file.name || fileRecord.title}"`);
    return reply.send(downloadRes.data);
}
