import type { RouteHandler } from 'fastify';
import type { Integration } from '@nangohq/node';
import { nango } from '../nango.js';

export type GetIntegrations = {
  integrations: Array<Pick<Integration, 'unique_key' | 'provider'>>;
};

/**
 * List activated integrations
 */
export const getIntegrations: RouteHandler<{ Reply: GetIntegrations }> = async (
  _,
  reply
) => {
  const list = await nango.listIntegrations();

  await reply.status(200).send({ integrations: list.configs });
};
