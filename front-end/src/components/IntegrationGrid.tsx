import { PlusIcon } from '@heroicons/react/20/solid';
import {
  InformationCircleIcon,
  BoltSlashIcon,
  CheckCircleIcon,
} from '@heroicons/react/24/outline';
import Nango from '@nangohq/frontend';
import { useState } from 'react';
import type { Integration } from '../types';
import { baseUrl, cn, queryClient } from '../utils';
import Spinner from './Spinner';
import InfoModal from './modals/Info';
const nango = process.env.NEXT_PUBLIC_NANGO_PUBLIC_KEY
  ? new Nango({
      host: process.env.NEXT_PUBLIC_NANGO_HOST ?? 'https://api.nango.dev',
      publicKey: process.env.NEXT_PUBLIC_NANGO_PUBLIC_KEY,
    })
  : null;

export const IntegrationBloc: React.FC<{
  integration: Integration;
}> = ({ integration }) => {
  const [infoModalOpen, setInfoModalOpen] = useState(false);

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function connect() {
    try {
      setLoading(true);
      if (!nango) {
        throw new Error('Nango not initialized');
      }

      // Create a new connection
      // "my-first-user" is your connectionId, it shouldn't be random
      // This ID allows you to identify a user, even across integrations
      await nango.auth(integration.integrationId, 'my-first-user', {
        detectClosedAuthWindow: true,
      });

      setError(null);
      // Reload the connections to update the state
      // Ideally you can setup a Websocket between your frontend and your backend to update everything in realtime
      setTimeout(async () => {
        await queryClient.refetchQueries({ queryKey: ['connections'] });
        setLoading(false);
      }, 10);
    } catch (err) {
      console.error(err);
      setError(
        err instanceof Error ? err.message : 'An error happened during oauth'
      );
      setLoading(false);
    }
  }

  async function disconnect() {
    try {
      setLoading(true);
      await fetch(
        `${baseUrl}/connections?integration=${integration.integrationId}`,
        {
          method: 'DELETE',
        }
      );

      // Reload the connections to update the state
      // Ideally you can setup a Websocket between your frontend and your backend to update everything in realtime
      setTimeout(async () => {
        await queryClient.refetchQueries({ queryKey: ['connections'] });
        setLoading(false);
      }, 10);
    } catch (err) {
      console.error(err);
    }
  }

  return (
    <>
      <InfoModal open={infoModalOpen} setOpen={setInfoModalOpen} />
      <li className="col-span-1 divide-y divide-gray-200 rounded-xl bg-white shadow">
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

            <div className="py-2">
              {integration.deployed ? (
                <div className="flex items-center gap-1 text-green-500 font-normal text-xs line-clamp-2">
                  {`${integration.connected ? 'Connected' : 'Integration deployed and ready to connect'}`}
                  <CheckCircleIcon
                    onClick={() => {
                      setInfoModalOpen(true);
                    }}
                    className="h-5 w-5 text-green-500"
                  />
                </div>
              ) : (
                <div className="flex items-center gap-1 text-red-500 font-normal text-xs line-clamp-2">
                  Requires setup{' '}
                  <InformationCircleIcon
                    onClick={() => {
                      setInfoModalOpen(true);
                    }}
                    className="h-5 w-5 text-red-500 hover:text-red-300 cursor-pointer"
                  />
                </div>
              )}
            </div>
          </div>
          <img
            className="h-10 w-10 flex-shrink-0"
            src={integration.image}
            alt={integration.description}
          />
        </div>

        {error && (
          <div className="text-xs text-red-400 space-x-6 p-6">{error}</div>
        )}
        <div className="-mt-px  divide-x divide-gray-200 flex ">
          {integration.connected ? (
            <button
              onClick={() => disconnect()}
              className={cn(
                'relative -mr-px inline-flex w-0 flex-1 items-center rounded-b-xl justify-center gap-x-3 rounded-bl-lg border border-transparent py-4 text-sm font-semibold bg-gray-200 hover:bg-gray-300 text-gray-800'
              )}
              disabled={!integration.deployed || loading}
            >
              Disconnect from {integration.name}
              {loading ? (
                <Spinner size={1} className="text-gray-800" />
              ) : (
                <BoltSlashIcon
                  className={cn(
                    'h-5 w-5',
                    integration.deployed ? 'text-gray-800' : 'text-gray-400'
                  )}
                  aria-hidden="true"
                />
              )}
            </button>
          ) : (
            <button
              onClick={() => connect()}
              className={cn(
                'relative -mr-px inline-flex w-0 flex-1 items-center rounded-b-xl justify-center gap-x-3 rounded-bl-lg border border-transparent py-4 text-sm font-semibold ',
                integration.deployed
                  ? 'bg-gray-200 hover:bg-gray-300 text-gray-800'
                  : 'bg-gray-100 text-gray-300'
              )}
              disabled={!integration.deployed || loading}
            >
              Connect to {integration.name}
              {loading ? (
                <Spinner size={1} className="text-gray-800" />
              ) : (
                <PlusIcon
                  className={cn(
                    'h-5 w-5',
                    integration.deployed ? 'text-gray-800' : 'text-gray-400'
                  )}
                  aria-hidden="true"
                />
              )}
            </button>
          )}
        </div>
      </li>
    </>
  );
};

export const IntegrationsGrid: React.FC<{
  integrations: Integration[];
}> = ({ integrations }) => {
  return (
    <ul
      role="list"
      className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3"
    >
      {integrations.map((integration: Integration) => (
        <IntegrationBloc key={integration.name} integration={integration} />
      ))}
    </ul>
  );
};
