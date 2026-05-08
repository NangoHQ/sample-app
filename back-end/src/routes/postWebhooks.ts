import type { RouteHandler } from 'fastify';
import { randomUUID } from 'crypto';

import type { NangoAuthWebhookBody, NangoSyncWebhookBody, NangoSyncWebhookBodySuccess, NangoWebhookBody } from '@nangohq/node';
import { nango } from '../nango.js';
import { db } from '../db.js';
import type { SlackUser } from '../schema.js';
import { broadcast } from '../webhookBroadcast.js';

/**
 * Receive webhooks from Nango every time a records has been added, updated or deleted
 */
export const postWebhooks: RouteHandler = async (req, reply) => {
    const body = req.body as NangoWebhookBody;
    const sig = req.headers['x-nango-signature'] as string;

    console.log('Webhook: received', body);

    // Verify the signature to be sure it's Nango that sent us this payload
    if (!nango.verifyWebhookSignature(sig, req.body)) {
        console.error('Failed to validate Webhook signature');
        await reply.status(400).send({ error: 'invalid_signature' });
        return;
    }

    // Handle each webhook
    const bodyAny = body as any;
    try {
        switch (bodyAny.type) {
            case 'auth':
                await handleNewConnectionWebhook(body as NangoAuthWebhookBody);
                break;
            case 'sync':
                await handleSyncWebhook(body as NangoSyncWebhookBody);
                break;
            case 'forward':
                console.log('Webhook: forward from', bodyAny.providerConfigKey);
                break;
            default:
                console.warn('unsupported webhook type', bodyAny.type);
                break;
        }
    } catch (err) {
        console.error('Webhook handler error:', err);
        await reply.status(200).send({ ack: true });
        return;
    }

    // Only store/broadcast events for connections we recognise.
    // Auth webhooks are allowed through even before the upsert above has run
    // (they created the record in handleNewConnectionWebhook), so the lookup
    // will succeed. Forward webhooks from stale/unknown connections are dropped.
    const incomingConnectionId: string | undefined = (body as any).connectionId;
    if (incomingConnectionId) {
        const known = await db.userConnections.findFirst({
            where: { connectionId: incomingConnectionId }
        });
        if (!known) {
            console.log(`Webhook: ignoring event for unknown connectionId ${incomingConnectionId}`);
            await reply.status(200).send({ ack: true });
            return;
        }
    }

    const event = {
        id: randomUUID(),
        timestamp: new Date().toISOString(),
        type: ((body as any).type ?? 'forward') as 'auth' | 'sync' | 'forward',
        provider: (body as any).providerConfigKey ?? (body as any).from ?? 'unknown',
        ...(incomingConnectionId ? { connectionId: incomingConnectionId } : {}),
        operation: (body as any).operation,
        model: (body as any).model,
        payload: body
    };

    // Persist for history (best-effort)
    db.webhookEvents.create({
        data: {
            id: event.id,
            type: event.type,
            provider: event.provider,
            connectionId: event.connectionId ?? null,
            operation: event.operation,
            model: event.model,
            payload: event.payload as any,
            receivedAt: new Date(event.timestamp)
        }
    }).catch(() => {});

    const ownerConn = await db.userConnections.findFirst({ where: { connectionId: event.connectionId } });
    if (!ownerConn) {
        await reply.status(200).send({ ack: true });
        return;
    }
    broadcast(event, ownerConn.userId);

    // Always return 200 to avoid re-delivery
    await reply.status(200).send({ ack: true });
};

/**
 * Handle webhook when a new connection is created
 */
async function handleNewConnectionWebhook(body: NangoAuthWebhookBody) {
    if (!body.success) {
        // Token refresh failed — mark the connection as broken so the UI can prompt re-auth
        if (body.operation === 'refresh') {
            console.warn('Token refresh failed for', body.providerConfigKey, body.connectionId);
            await db.userConnections.setBroken(body.connectionId, true);
            const owner = await db.userConnections.findFirst({ where: { connectionId: body.connectionId } });
            if (owner) {
                broadcast({
                    id: randomUUID(),
                    timestamp: new Date().toISOString(),
                    type: 'auth_broken',
                    provider: body.providerConfigKey,
                    connectionId: body.connectionId,
                    operation: 'refresh',
                    payload: body
                }, owner.userId);
            }
        } else {
            console.error('Failed to auth', body);
        }
        return;
    }

    // Successful auth — clear any previous broken state
    await db.userConnections.setBroken(body.connectionId, false);

    if (body.operation === 'creation') {
        console.log('Webhook: New connection');
        // Create or update the user connection in the UserConnections table
        await db.userConnections.upsert({
            where: {
                userId_providerConfigKey: {
                    userId: body.endUser!.endUserId,
                    providerConfigKey: body.providerConfigKey
                }
            },
            create: {
                userId: body.endUser!.endUserId,
                connectionId: body.connectionId,
                providerConfigKey: body.providerConfigKey
            },
            update: {
                connectionId: body.connectionId,
                updatedAt: new Date()
            }
        });

        // Trigger an immediate sync for integrations that have syncs
        const SYNC_MAP: Record<string, string[]> = {
            'google-drive': ['documents'],
            'slack': ['users']
        };
        const syncsToTrigger = SYNC_MAP[body.providerConfigKey];

        if (body.providerConfigKey === 'google-drive') {
            await db.files.deleteMany({ where: { connectionId: body.connectionId } });
        }

        if (syncsToTrigger) {
            try {
                await nango.startSync(body.providerConfigKey, syncsToTrigger, body.connectionId);
                console.log(`Triggered sync for new ${body.providerConfigKey} connection`);
            } catch (error) {
                console.error('Failed to trigger sync:', error);
            }
        }
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

    const { added = 0, updated = 0, deleted = 0 } = body.responseResults ?? {};
    const hasChanges = added > 0 || updated > 0 || deleted > 0;

    // If nothing changed AND we already have a stored bookmark (i.e. we have a clean baseline),
    // skip the listRecords call entirely.
    // If there is NO bookmark it means we never successfully stored a batch for this
    // connection+model (e.g. a previous attempt failed). In that case we always fetch
    // all records — ignoring responseResults — so we catch up from scratch.
    if (!hasChanges) {
        const existingBookmark = await db.syncBookmarks.findUnique({
            where: { connectionId_model: { connectionId: body.connectionId, model: body.model } }
        }).catch(() => null);

        if (existingBookmark) {
            console.log(`Sync [${body.model}]: empty run — no records changed, skipping fetch`);
            return;
        }
        console.log(`Sync [${body.model}]: no bookmark found — fetching all records to establish baseline`);
    } else {
        console.log(`Webhook: Sync [${body.model}] — added:${added} updated:${updated} deleted:${deleted}`);
    }

    // Route to the appropriate sync handler based on the model
    const fileModels = ['Document', 'OneDriveFileSelection'];
    const genericModels = [
        'GithubIssue', 'LinearIssue', 'JiraIssue', 'AsanaTask', 'NotionPage',
        'HubspotContact', 'SalesforceContact', 'AttioContact', 'TeamsUser',
        'GoogleCalendarEvent'
    ];

    if (fileModels.includes(body.model)) {
        await handleFilesSync(body);
    } else if (body.model === 'SlackUser') {
        await handleSlackSync(body);
    } else if (genericModels.includes(body.model)) {
        await handleGenericSync(body);
    } else {
        console.warn('Unsupported sync model:', body.model);
    }
}

/**
 * Read the stored modifiedAfter bookmark for this (connectionId, model) pair,
 * falling back to the value Nango sent on the current webhook.
 * After a successful fetch the caller must write the new bookmark via writeBookmark().
 */
async function readBookmark(connectionId: string, model: string, fallback: string): Promise<string | undefined> {
    try {
        const stored = await db.syncBookmarks.findUnique({
            where: { connectionId_model: { connectionId, model } }
        });
        // No stored bookmark → return undefined so listRecords fetches all records (full baseline)
        return stored?.modifiedAfter ?? undefined;
    } catch {
        // Table may not exist yet (migration pending) — fall back to provided value
        return fallback;
    }
}

async function writeBookmark(connectionId: string, model: string, modifiedAfter: string): Promise<void> {
    try {
        await db.syncBookmarks.upsert({
            where: { connectionId_model: { connectionId, model } },
            create: { connectionId, model, modifiedAfter },
            update: { modifiedAfter }
        });
    } catch {
        console.warn(`Failed to write sync bookmark for ${model}/${connectionId} — migration may be pending`);
    }
}

/**
 * Handle webhook when Slack sync has finished
 */
async function handleSlackSync(body: NangoSyncWebhookBodySuccess) {
    const modifiedAfter = await readBookmark(body.connectionId, body.model, body.modifiedAfter);

    // Fetch the actual records that were added/updated/deleted
    const records = await nango.listRecords<SlackUser>({
        connectionId: body.connectionId,
        model: body.model,
        providerConfigKey: body.providerConfigKey,
        ...(modifiedAfter !== undefined ? { modifiedAfter } : {}),
        limit: 1000
    });

    console.log('Slack Records:', records.records.length);

    // Save the updates in our backend
    for (const record of records.records) {
        if (record._nango_metadata.deleted_at) {
            // When a record is deleted in the integration you can replicate this in your own system
            await db.contacts.update({
                where: { id: record.id },
                data: { deletedAt: new Date() }
            });
            continue;
        }

        const fullName = record.profile.display_name ?? record.name;
        const avatar = record.profile.image_original ?? 'https://placehold.co/32x32/lightgrey/white';

        // Create or Update the others records
        await db.contacts.upsert({
            where: { id: record.id },
            create: {
                id: record.id,
                fullName: fullName,
                avatar,
                integrationId: body.providerConfigKey,
                connectionId: body.connectionId,
                createdAt: new Date()
            },
            update: { fullName, avatar, connectionId: body.connectionId, integrationId: body.providerConfigKey, updatedAt: new Date() }
        });
    }

    await writeBookmark(body.connectionId, body.model, body.modifiedAfter);
    console.log('Slack results processed');
}

/**
 * Handle webhook when Google Drive sync has finished
 */
async function handleFilesSync(body: NangoSyncWebhookBodySuccess) {
    console.log('Sync:', body);
    try {
        const modifiedAfter = await readBookmark(body.connectionId, body.model, body.modifiedAfter);

        const records = await nango.listRecords<Record<string, any>>({
            connectionId: body.connectionId,
            model: body.model,
            providerConfigKey: body.providerConfigKey,
            ...(modifiedAfter !== undefined ? { modifiedAfter } : {}),
            limit: 1000
        });
        console.log('Documents Records:', records.records);

        console.log('Documents Files:', records.records.length);

        // Save the updates in our backend
        for (const record of records.records) {
            try {
                if (record._nango_metadata.deleted_at) {
                    console.log('File Deleted:', record.id);
                    await db.files.update({
                        where: { id: String(record.id) },
                        data: { deletedAt: new Date() }
                    });
                    continue;
                }

                // Validate and parse createdTime

                // Create or Update the file records
                console.log('File Created:', record.id);
                await db.files.upsert({
                    where: { id: String(record.id) },
                    create: {
                        id: String(record['id']),
                        title: record['title'] || record['name'],
                        mimeType: record['mimeType'] || record['mime_type'],
                        url: record['url'] ?? record['raw_source']?.webUrl ?? null,
                        size: record['size'] ?? record['raw_source']?.size ?? null,
                        driveId: record['drive_id'] ?? null,
                        createdTime: new Date(record._nango_metadata.first_seen_at),
                        integrationId: body.providerConfigKey,
                        connectionId: body.connectionId,
                        createdAt: new Date()
                    },
                    update: {
                        title: record['title'] || record['name'],
                        mimeType: record['mimeType'] || record['mime_type'],
                        url: record['url'] ?? record['raw_source']?.webUrl ?? null,
                        size: record['size'] ?? record['raw_source']?.size ?? null,
                        driveId: record['drive_id'] ?? null,
                        createdTime: new Date(record._nango_metadata.first_seen_at),
                        updatedAt: new Date(),
                        integrationId: body.providerConfigKey,
                        connectionId: body.connectionId
                    }
                });
            } catch (error) {
                console.error('Failed to process record:', error);
            }
        }

        await writeBookmark(body.connectionId, body.model, body.modifiedAfter);
    } catch (error) {
        console.error('Failed to list records:', error);
    }
}

/**
 * Generic handler for project management, CRM, and other structured records.
 * Stores records in the generic Records table so the frontend can fetch them.
 */
async function handleGenericSync(body: NangoSyncWebhookBodySuccess) {
    try {
        const modifiedAfter = await readBookmark(body.connectionId, body.model, body.modifiedAfter);

        const records = await nango.listRecords<Record<string, unknown>>({
            connectionId: body.connectionId,
            model: body.model,
            providerConfigKey: body.providerConfigKey,
            ...(modifiedAfter !== undefined ? { modifiedAfter } : {}),
            limit: 1000
        });

        console.log(`Generic Sync [${body.model}]: ${records.records.length} records`);

        for (const record of records.records) {
            const compositeId = `${body.providerConfigKey}_${body.connectionId}_${body.model}_${record.id}`;

            if (record._nango_metadata.deleted_at) {
                await db.records.updateMany({
                    where: {
                        integrationId: body.providerConfigKey,
                        connectionId: body.connectionId,
                        model: body.model,
                        id: compositeId
                    },
                    data: { deletedAt: new Date() }
                });
                continue;
            }

            const { _nango_metadata, ...rawData } = record;
            await db.records.upsert({
                where: {
                    integrationId_connectionId_model_id: {
                        integrationId: body.providerConfigKey,
                        connectionId: body.connectionId,
                        model: body.model,
                        id: compositeId
                    }
                },
                create: {
                    id: compositeId,
                    integrationId: body.providerConfigKey,
                    connectionId: body.connectionId,
                    model: body.model,
                    data: rawData as any
                },
                update: {
                    data: rawData as any,
                    updatedAt: new Date(),
                    deletedAt: null
                }
            });
        }

        await writeBookmark(body.connectionId, body.model, body.modifiedAfter);
    } catch (error) {
        console.error(`Failed to handle generic sync for ${body.model}:`, error);
    }
}
