import type { RouteHandler } from 'fastify';
import { nango } from '../nango.js';
import { db } from '../db.js';

/**
 * Force-fetches all records for a given integration+model from Nango and
 * stores them locally. Useful when a previous sync failed to store records
 * (e.g. after a DB error) and subsequent syncs report 0 changes.
 *
 * POST /records/backfill
 * Body: { integrationId, model }
 */
export const postRecordsBackfill: RouteHandler<{
    Body: { integrationId: string; model: string };
}> = async (req, reply) => {
    const { integrationId, model } = req.body;

    if (!integrationId || !model) {
        await reply.status(400).send({ error: 'integrationId and model are required' });
        return;
    }

    const userConnection = await db.userConnections.findFirst({
        where: { userId: req.user.userId, providerConfigKey: integrationId }
    });

    if (!userConnection) {
        await reply.status(404).send({ error: 'no_connection', message: `No ${integrationId} connection found for this user` });
        return;
    }

    try {
        // Fetch ALL records (no modifiedAfter) to get a full baseline
        const result = await nango.listRecords<Record<string, unknown>>({
            connectionId: userConnection.connectionId,
            model,
            providerConfigKey: integrationId,
            limit: 1000
        });

        console.log(`Backfill [${model}]: fetched ${result.records.length} records`);

        let upserted = 0;
        let deleted = 0;

        for (const record of result.records) {
            const compositeId = `${integrationId}_${userConnection.connectionId}_${model}_${record.id}`;

            if (record._nango_metadata.deleted_at) {
                await db.records.updateMany({
                    where: { integrationId, connectionId: userConnection.connectionId, model, id: compositeId },
                    data: { deletedAt: new Date() }
                });
                deleted++;
                continue;
            }

            const { _nango_metadata, ...rawData } = record;
            await db.records.upsert({
                where: { integrationId_connectionId_model_id: { integrationId, connectionId: userConnection.connectionId, model, id: compositeId } },
                create: { id: compositeId, integrationId, connectionId: userConnection.connectionId, model, data: rawData as any },
                update: { data: rawData as any, updatedAt: new Date(), deletedAt: null }
            });
            upserted++;
        }

        // Write bookmark so future incremental syncs work correctly
        const now = new Date().toISOString();
        await db.syncBookmarks.upsert({
            where: { connectionId_model: { connectionId: userConnection.connectionId, model } },
            create: { connectionId: userConnection.connectionId, model, modifiedAfter: now },
            update: { modifiedAfter: now }
        }).catch(() => {});

        await reply.status(200).send({ upserted, deleted, total: result.records.length });
    } catch (err: any) {
        console.error(`Backfill failed for ${model}:`, err);
        await reply.status(500).send({ error: 'backfill_failed', message: err?.message });
    }
};
