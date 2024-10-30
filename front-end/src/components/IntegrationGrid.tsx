import { PlusIcon } from '@heroicons/react/20/solid';
import {
  InformationCircleIcon,
  BoltSlashIcon,
  CheckCircleIcon,
} from '@heroicons/react/24/outline';
import type { ConnectUI } from '@nangohq/frontend';
import Nango from '@nangohq/frontend';
import { useRef, useState } from 'react';
import type { Integration } from '../types';
import { baseUrl, cn, queryClient } from '../utils';
import { postConnectSession, postSaveConnectionId } from '../api';
import Spinner from './Spinner';
import InfoModal from './modals/Info';
import { Logo } from './logo';
const apiURL = process.env.NEXT_PUBLIC_NANGO_HOST ?? 'https://api.nango.dev';
const nango = process.env.NEXT_PUBLIC_NANGO_PUBLIC_KEY
  ? new Nango({
      host: apiURL,
      publicKey: process.env.NEXT_PUBLIC_NANGO_PUBLIC_KEY,
    })
  : null;

export const IntegrationBloc: React.FC<{
  integration: Integration;
}> = ({ integration }) => {
  const connectUI = useRef<ConnectUI>();
  const [infoModalOpen, setInfoModalOpen] = useState(false);

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  function connect() {
    setLoading(true);
    if (!nango) {
      throw new Error('Nango not initialized');
    }

    connectUI.current = nango.openConnectUI({
      baseURL: 'https://connect.nango.dev',
      onEvent: (event) => {
        if (event.type === 'close') {
          // we refresh on close so user can see the diff
          void queryClient.refetchQueries({ queryKey: ['connections'] });
          setLoading(false);
        } else if (event.type === 'connect') {
          void postSaveConnectionId(event.payload.connectionId);
        }
      },
    });

    // We defer the token creation so the iframe can open and display a loading screen
    setTimeout(async () => {
      const res = await postConnectSession();
      connectUI.current!.setSessionToken(res.connectSession);
    }, 10);

    setError(null);
  }

  async function disconnect() {
    try {
      setLoading(true);
      await fetch(
        `${baseUrl}/connections?integration=${integration.integrationId}`,
        { method: 'DELETE' }
      );

      // Reload the connections to update the state
      // Ideally you can setup a Websocket between your frontend and your backend to update everything in realtime
      setTimeout(async () => {
        await queryClient.refetchQueries({ queryKey: ['connections'] });
        await queryClient.refetchQueries({ queryKey: ['contacts'] });
        setLoading(false);
      }, 10);
    } catch (err) {
      console.error(err);
    }
  }

  return (
    <>
      <InfoModal open={infoModalOpen} setOpen={setInfoModalOpen} />
      <li className="col-span-1  bg-white ">
        {error && (
          <div className="text-xs text-red-400 space-x-6 p-6">{error}</div>
        )}
        <div className="flex ">
          {integration.connected ? (
            <button
              onClick={() => disconnect()}
              className={cn(
                'relative transition-colors inline-flex w-0 flex-1 items-center justify-center gap-x-3 py-4 text-sm font-semibold rounded-md',
                'bg-gray-200 hover:bg-gray-300 text-gray-800'
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
              onClick={() => {
                connect();
              }}
              className={cn(
                'relative transition-colors inline-flex w-0 flex-1 items-center justify-center gap-x-3 py-4 text-sm font-semibold rounded-md',
                integration.deployed
                  ? 'bg-gray-200 hover:bg-gray-300 text-gray-800'
                  : 'bg-gray-100 text-gray-300'
              )}
              disabled={!integration.deployed || loading}
            >
              Invite from {integration.name}
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
      className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-2 m-auto align-middle justify-center max-w-[50%] m-auto"
    >
      {integrations.map((integration: Integration) => (
        <IntegrationBloc key={integration.name} integration={integration} />
      ))}
    </ul>
  );
};
