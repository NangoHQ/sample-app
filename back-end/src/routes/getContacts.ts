import type { RouteHandler } from 'fastify';
import type { Contact } from '../db.js';
import { db } from '../db.js';

export type GetContactsSuccess = {
    contacts: Contact[];
};
export type GetContacts = GetContactsSuccess | { error: string };

/**
 * Get contacts that were replicated from the integrations to your database
 */
export const getContacts: RouteHandler<{
    Querystring: { integration: string };
    Reply: GetContacts;
}> = async (req, reply) => {
    const { integration } = req.query;

    const userConnection = await db.userConnections.findFirst({
        where: {
            userId: req.user.userId,
            providerConfigKey: integration
        }
    });

    if (!userConnection) {
        await reply.status(200).send({ contacts: [] });
        return;
    }

    // Get the contacts we saved in our own database
    const contacts = await db.contacts.findMany({
        where: {
            integrationId: integration,
            connectionId: userConnection.connectionId
        },
        orderBy: { fullName: 'asc' },
        take: 100
    });

    await reply.status(200).send({ contacts });
};
