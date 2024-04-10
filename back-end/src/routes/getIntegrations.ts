import type { RouteHandler } from 'fastify';
import { nango } from '../nango.js';

/**
 * List activated integrations
 */
export const getIntegrations: RouteHandler = async (_, reply) => {
  const list = await nango.listIntegrations();

  await reply.status(200).send({ integrations: list.configs });
};
