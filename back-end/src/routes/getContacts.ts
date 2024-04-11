import type { RouteHandler } from 'fastify';
import { db } from '../db.js';

<<<<<<< HEAD
const validation = z
  .object({
    integration: z.enum(['slack']),
  })
  .strict();
=======
export type GetContacts = {
  contacts: Contact[];
};
>>>>>>> eb30b75 (merge)

export const getContacts: RouteHandler = async (req, reply) => {
  const res = validation.safeParse(req.query);
  if (!res.success) {
    await reply.status(400).send({ error: true, msg: res.error });
    return;
  }

  // Get the contacts we saved in our own database
  const contacts = await db.contacts.findMany({
    where: { integrationId: res.data.integration },
    orderBy: { updatedAt: 'desc' },
    take: 100,
  });

  await reply.status(200).send({ contacts });
};
