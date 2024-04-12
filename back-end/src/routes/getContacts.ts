import type { RouteHandler } from 'fastify';
import type { Prisma } from '@prisma/client';
import { db } from '../db.js';

export type GetContacts = {
  contacts: Prisma.ContactsMaxAggregateOutputType[];
};

/**
 * Get contacts that were replicated from the integrations to your database
 */
export const getContacts: RouteHandler<{
  Querystring: { integration: 'slack' };
  Reply: GetContacts;
}> = async (req, reply) => {
  // Get the contacts we saved in our own database
  const contacts = await db.contacts.findMany({
    where: { integrationId: req.query.integration },
    orderBy: { fullName: 'asc' },
    take: 100,
  });

  await reply.status(200).send({ contacts });
};
