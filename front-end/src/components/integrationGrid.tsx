import { PlusIcon } from '@heroicons/react/20/solid';
import {
  BoltSlashIcon,
  CheckCircleIcon,
  ExclamationCircleIcon,
} from '@heroicons/react/24/outline';
import Nango from '@nangohq/frontend';
import { useState } from 'react';
import type { Integration } from '../types';
import { cn, queryClient } from '../utils';
import Spinner from './Spinner';

const nango = process.env.NEXT_PUBLIC_NANGO_PUBLIC_KEY
  ? new Nango({ publicKey: process.env.NEXT_PUBLIC_NANGO_PUBLIC_KEY })
  : null;

export const IntegrationBloc: React.FC<{
  integration: Integration;
}> = ({ integration }) => {
  const [loading, setLoading] = useState(false);

  async function connect() {
    try {
      setLoading(true);
      if (!nango) {
        throw new Error('Nango not initialized');
      }

      // "user-1" is your connectionId
      // This ID allows you to identify an user connection, even across integrations
      await nango.auth(integration.integrationId, 'user-1', {
        detectClosedAuthWindow: true,
      });

      setTimeout(async () => {
        await queryClient.refetchQueries({ queryKey: ['connections'] });
        setLoading(false);
      }, 10);
    } catch (error) {
      console.error(error);
    }
  }

  async function disconnect() {
    try {
      setLoading(true);
      await fetch(
        `http://localhost:3003/connections?integration=${integration.integrationId}`,
        {
          method: 'DELETE',
        }
      );
      setTimeout(async () => {
        await queryClient.refetchQueries({ queryKey: ['connections'] });
        setLoading(false);
      }, 10);
    } catch (error) {
      console.error(error);
    }
  }

  return (
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
          <div className="pt-4">
            {integration.deployed ? (
              <div className="flex items-center gap-1 text-gray-500 font-normal text-xs line-clamp-2">
                <CheckCircleIcon className="h-5 w-5 text-gray-800" /> Deployed
                to Nango
              </div>
            ) : (
              <div className="flex items-center gap-1 text-red-500 font-normal text-xs line-clamp-2">
                <ExclamationCircleIcon className="h-5 w-5 text-red-800" /> Not
                deployed
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
      <div className="-mt-px flex divide-x divide-gray-200 ">
        {!integration.connected && (
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
        {integration.connected && (
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
        )}
      </div>
    </li>
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
