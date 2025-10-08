import type { RouteHandler } from 'fastify';
import type { Prisma } from '@prisma/client';
import { db, getUserFromDatabase } from '../db.js';

export type GetContactsSuccess = {
    contacts: Array<Prisma.$ContactsPayload['scalars']>;
};
export type GetContacts = GetContactsSuccess | { error: string };

/**
 * Get contacts that were replicated from the integrations to your database
 */
export const getContacts: RouteHandler<{
    Querystring: { integration: 'slack' };
    Reply: GetContacts;
}> = async (req, reply) => {
    const user = await getUserFromDatabase();
    if (!user) {
        await reply.status(400).send({ error: 'invalid_user' });
        return;
    }

    const userConnection = await db.userConnections.findFirst({
        where: {
            userId: user.id,
            providerConfigKey: req.query.integration
        }
    });

    if (!userConnection) {
        await reply.status(200).send({ contacts: [] });
        return;
    }

    // Get the contacts we saved in our own database
    const contacts = await db.contacts.findMany({
        where: {
            integrationId: req.query.integration,
            connectionId: userConnection.connectionId
        },
        orderBy: { fullName: 'asc' },
        take: 100
    });

    await reply.status(200).send({ contacts });
};
