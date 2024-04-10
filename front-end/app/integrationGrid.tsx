'use client';

import { PlusIcon } from '@heroicons/react/20/solid';
import Nango from '@nangohq/frontend';
import { nanoid } from 'nanoid';
import type { Integration } from './types';

const nango = process.env.NEXT_PUBLIC_NANGO_PUBLIC_KEY
  ? new Nango({ publicKey: process.env.NEXT_PUBLIC_NANGO_PUBLIC_KEY })
  : null;

export default function IntegrationsGrid({
  integrations,
}: {
  integrations: Integration[];
}) {
  9;
  async function addIntegration(integrationId: string) {
    try {
      const newConnectionId = nanoid();
      console.log(newConnectionId);
      if (!nango) throw new Error('Nango not initialized');
      const res = await nango.auth(integrationId, newConnectionId);
      console.log(res);
    } catch (error) {
      console.error(error);
    }
  }

  return (
    <ul
      role="list"
      className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3"
    >
      {integrations.map((integration: Integration) => (
        <li
          key={integration.name}
          className="col-span-1 divide-y divide-gray-200 rounded-xl bg-white shadow"
        >
          <div className="flex w-full items-center justify-between space-x-6 p-6">
            <div>
              <div className="flex items-center space-x-3">
                <h3 className="truncate text-lg font-medium text-gray-900">
                  {integration.name}
                </h3>
              </div>
              {integration.description && (
                <p className="text-gray-500 font-normal text-xs line-clamp-2">
                  {integration.description}
                </p>
              )}
            </div>
            <img
              className="h-10 w-10 flex-shrink-0"
              src={integration.image}
              alt={integration.description}
            />
          </div>
          <div className="-mt-px flex divide-x divide-gray-200 bg-gray-200 rounded-b-xl cursor-pointer hover:bg-gray-300">
            <div
              onClick={() => addIntegration(integration.integrationId)}
              className="relative -mr-px inline-flex w-0 flex-1 items-center justify-center gap-x-3 rounded-bl-lg border border-transparent py-4 text-sm font-semibold text-gray-800"
            >
              Add Integration
              <PlusIcon className="h-5 w-5 text-gray-800" aria-hidden="true" />
            </div>
          </div>
        </li>
      ))}
    </ul>
  );
}
