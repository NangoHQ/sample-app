import type { RouteHandler } from 'fastify';
import type { GetPublicListIntegrationsLegacy } from '@nangohq/node';
import { nango } from '../nango.js';

export type GetIntegrations = {
    integrations: GetPublicListIntegrationsLegacy['Success']['configs'];
};

/**
 * List activated integrations
 */
export const getIntegrations: RouteHandler<{ Reply: GetIntegrations }> = async (_, reply) => {
    const list = await nango.listIntegrations();

    await reply.status(200).send({ integrations: list.configs });
};
