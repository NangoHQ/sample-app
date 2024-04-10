import type { RouteHandler } from 'fastify';
import z from 'zod';
import { db } from '../db.js';

const validation = z
  .object({
    integration: z.enum(['linkedin', 'hubspot', 'slack']),
  })
  .strict();

export const getContacts: RouteHandler = async (req, reply) => {
  const res = validation.safeParse(req.query);
  if (!res.success) {
    await reply.status(400).send({ error: true, msg: res.error });
    return;
  }

  // Get the contacts we saved in our own database
  const contacts = await db.contacts.findMany({
    orderBy: { updatedAt: 'desc' },
    take: 100,
  });

  await reply.status(200).send({ contacts });
};
