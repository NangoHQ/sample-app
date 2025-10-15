import { useCallback } from 'react';
import Nango from '@nangohq/frontend';
import { deleteConnection, postConnectSession } from '../api';
import { queryClient } from '../utils';

const nango = new Nango({
    host: process.env.NEXT_PUBLIC_NANGO_HOST ?? 'https://api.nango.dev',
    publicKey: 'empty'
});

type ProviderType = 'google-drive' | 'one-drive' | 'one-drive-personal';

export function useProviderConnections(connections?: any[]) {
    const googleDriveConnection = connections?.find((conn) => conn.provider_config_key === 'google-drive');
    const oneDriveConnection = connections?.find((conn) => conn.provider_config_key === 'one-drive');
    const oneDrivePersonalConnection = connections?.find((conn) => conn.provider_config_key === 'one-drive-personal');

    const connectProvider = useCallback(async (provider: ProviderType) => {
        try {
            console.log(`Starting ${provider} connection...`);
            const connectUI = nango.openConnectUI({
                apiURL: process.env.NEXT_PUBLIC_NANGO_HOST ?? 'https://api.nango.dev',
                baseURL: process.env.NEXT_PUBLIC_NANGO_CONNECT_URL ?? 'https://connect.nango.dev',
                onEvent: (event: any) => {
                    console.log(`${provider} connection event:`, event);
                    if (event.type === 'close') {
                        console.log(`${provider} connection closed, refreshing queries...`);
                        void queryClient.refetchQueries({ queryKey: ['connections'] });
                    } else if (event.type === 'connect') {
                        console.log(`${provider} connection successful, refreshing queries...`);
                        void queryClient.refetchQueries({ queryKey: ['connections'] });
                        setTimeout(() => {
                            console.log('Delayed refresh...');
                            void queryClient.refetchQueries({ queryKey: ['connections'] });
                        }, 2000);
                    }
                }
            });

            setTimeout(async () => {
                try {
                    const res = await postConnectSession(provider);
                    connectUI.setSessionToken(res.connectSession);
                } catch (error) {
                    console.error(`Error creating ${provider} session token:`, error);
                }
            }, 10);
        } catch (error) {
            console.error(`Error starting ${provider} connection:`, error);
        }
    }, []);

    const disconnectProvider = useCallback(
        async (provider: ProviderType) => {
            const connection = connections?.find((conn) => conn.provider_config_key === provider);
            if (!connection) return;

            try {
                await deleteConnection(provider);
                setTimeout(async () => {
                    await queryClient.refetchQueries({ queryKey: ['connections'] });
                }, 10);
            } catch (error) {
                console.error(`Error disconnecting ${provider}:`, error);
            }
        },
        [connections]
    );

    return {
        googleDriveConnection,
        isGoogleDriveConnected: !!googleDriveConnection,
        connectGoogleDrive: () => connectProvider('google-drive'),
        disconnectGoogleDrive: () => disconnectProvider('google-drive'),
        oneDriveConnection,
        isOneDriveConnected: !!oneDriveConnection,
        connectOneDrive: () => connectProvider('one-drive'),
        disconnectOneDrive: () => disconnectProvider('one-drive'),
        oneDrivePersonalConnection,
        isOneDrivePersonalConnected: !!oneDrivePersonalConnection,
        connectOneDrivePersonal: () => connectProvider('one-drive-personal'),
        disconnectOneDrivePersonal: () => disconnectProvider('one-drive-personal')
    };
}
