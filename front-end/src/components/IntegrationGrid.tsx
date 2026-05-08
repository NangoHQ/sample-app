import type { ConnectUI } from '@nangohq/frontend';
import Nango from '@nangohq/frontend';
import { useRef, useState } from 'react';
import type { Integration } from '../types';
import { baseUrl, cn, queryClient } from '../utils';
import { postConnectSession, deleteConnection } from '../api';
import Spinner from './Spinner';
import InfoModal from './modals/Info';

const apiURL = process.env.NEXT_PUBLIC_NANGO_HOST ?? 'https://api.nango.dev';
const nango = new Nango({ host: apiURL, publicKey: 'empty' });
const connectUIBaseUrl = process.env.NEXT_PUBLIC_NANGO_CONNECT_URL ?? 'https://connect.nango.dev';

export const IntegrationBloc: React.FC<{
    integration: Integration;
}> = ({ integration }) => {
    const connectUI = useRef<ConnectUI>();
    const [infoModalOpen, setInfoModalOpen] = useState(false);

    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);

    function connect() {
        setLoading(true);

        connectUI.current = nango.openConnectUI({
            apiURL,
            baseURL: connectUIBaseUrl,
            onEvent: (event) => {
                if (event.type === 'close') {
                    // we refresh on close so user can see the diff
                    void queryClient.refetchQueries({ queryKey: ['connections'] });
                    setLoading(false);
                } else if (event.type === 'connect') {
                    // The backend will receive a webhook with the connection info
                    void queryClient.refetchQueries({ queryKey: ['connections'] });
                }
            }
        });

        // We defer the token creation so the iframe can open and display a loading screen
        setTimeout(async () => {
            const res = await postConnectSession(integration.unique_key);
            connectUI.current!.setSessionToken(res.connectSession);
        }, 10);

        setError(null);
    }

    async function disconnect() {
        try {
            setLoading(true);
            await deleteConnection(integration.unique_key);

            // Reload the connections to update the state
            // Ideally you can setup a Websocket between your frontend and your backend to update everything in realtime
            setTimeout(async () => {
                await queryClient.refetchQueries({ queryKey: ['connections'] });
                await queryClient.refetchQueries({ queryKey: ['contacts'] });
                setLoading(false);
            }, 10);
        } catch (err) {
            console.error(err);
            setError('Failed to disconnect');
            setLoading(false);
        }
    }

    return (
        <li className="w-full">
            <InfoModal open={infoModalOpen} setOpen={setInfoModalOpen} />
            {error && <div className="text-xs text-red-400 space-x-6 p-6">{error}</div>}
            <div className="flex">
                {integration.connected ? (
                    <button
                        onClick={() => disconnect()}
                        className={cn(
                            'relative transition-colors inline-flex w-0 flex-1 items-center justify-center gap-x-3 py-3 text-sm font-semibold rounded-md text-white',
                            'bg-red-900 hover:bg-red-800 opacity-80'
                        )}
                        disabled={loading}
                    >
                        {loading ? <Spinner size={1} className="text-gray-800" /> : <img src={integration.logo} alt="" className="w-5" />}
                        Disconnect from {integration.display_name}
                    </button>
                ) : (
                    <button
                        onClick={() => {
                            connect();
                        }}
                        className={cn(
                            'relative transition-colors inline-flex w-0 flex-1 items-center justify-center gap-x-3 py-3 text-sm font-semibold rounded-md bg-black text-white hover:bg-gray-900'
                        )}
                        disabled={loading}
                    >
                        {loading ? <Spinner size={1} className="text-gray-800" /> : <img src={integration.logo} alt="" className="w-5" />}
                        Import from {integration.display_name}
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
        <ul role="list" className="flex flex-col gap-2">
            {integrations.map((integration) => (
                <IntegrationBloc key={integration.unique_key} integration={integration} />
            ))}
        </ul>
    );
};
