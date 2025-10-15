import { useEffect } from 'react';
import { useQuery } from '@tanstack/react-query';
import Head from 'next/head';
import { listConnections } from '../api';
import { GoogleDrivePicker } from '../components/pickers/GoogleDrivePicker';
import { OneDrivePicker } from '../components/pickers/OneDrivePicker';
import { UnifiedFileManager } from '../components/FileManager';
import { ProviderCard } from '../components/ProviderCard';
import { useProviderConnections } from '../hooks/useProviderConnections';
import { useSupportedProviders } from '../hooks/useSupportedProviders';
import Spinner from '../components/Spinner';

export default function FilesPage() {
    const { data: resConnections, error: connectionsError } = useQuery({
        queryKey: ['connections'],
        queryFn: listConnections
    });

    const { supportedProviders, isLoading: providersLoading, error: providersError } = useSupportedProviders();
    const { 
        googleDriveConnection, 
        connectGoogleDrive, 
        disconnectGoogleDrive, 
        oneDriveConnection, 
        connectOneDrive, 
        disconnectOneDrive,
        oneDrivePersonalConnection,
        connectOneDrivePersonal,
        disconnectOneDrivePersonal
    } = useProviderConnections(resConnections?.connections);

    useEffect(() => {
        if (connectionsError) {
            console.error('Error fetching connections:', connectionsError);
        }
        if (providersError) {
            console.error('Error fetching providers:', providersError);
        }
    }, [connectionsError, providersError]);

    if (providersLoading) {
        return (
            <main className="p-4 md:p-10 mx-auto max-w-7xl">
                <div className="text-center">
                    <Spinner size={2} />
                    <p className="mt-4 text-gray-600">Loading providers...</p>
                </div>
            </main>
        );
    }

    if (providersError) {
        return (
            <main className="p-4 md:p-10 mx-auto max-w-7xl">
                <div className="text-center">
                    <p className="text-red-600">Failed to load providers. Please check your NANGO_SECRET_KEY configuration.</p>
                </div>
            </main>
        );
    }

    return (
        <div className="min-h-screen bg-gray-50 w-full">
            <Head>
                <title>File Storage Integrations</title>
            </Head>

            <header className="bg-white border-b border-gray-200 w-full">
                <div className="w-full px-4 sm:px-6 lg:px-8">
                    <div className="py-6">
                        <h1 className="text-3xl font-bold text-gray-900">File Storage Integrations</h1>
                        <p className="mt-2 text-gray-600">Connect and manage your cloud storage providers</p>
                    </div>
                </div>
            </header>

            <div className="w-full px-4 sm:px-6 lg:px-8 py-8">
                <div className="mb-12">
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                        {supportedProviders.map((provider) => {
                            const isConnected =
                                resConnections?.connections.some((connection) => connection.provider_config_key === provider.unique_key) || false;

                            const isGoogleDrive = provider.unique_key === 'google-drive';
                            const isOneDrive = provider.unique_key === 'one-drive';
                            const isOneDrivePersonal = provider.unique_key === 'one-drive-personal';

                            const getConnectHandler = () => {
                                if (isGoogleDrive) return connectGoogleDrive;
                                if (isOneDrive) return connectOneDrive;
                                if (isOneDrivePersonal) return connectOneDrivePersonal;
                                return undefined;
                            };

                            const getDisconnectHandler = () => {
                                if (isGoogleDrive) return disconnectGoogleDrive;
                                if (isOneDrive) return disconnectOneDrive;
                                if (isOneDrivePersonal) return disconnectOneDrivePersonal;
                                return undefined;
                            };

                            return (
                                <ProviderCard
                                    key={provider.unique_key}
                                    provider={provider}
                                    connected={isConnected}
                                    onConnect={getConnectHandler()}
                                    onDisconnect={getDisconnectHandler()}
                                >
                                    {isGoogleDrive && isConnected && googleDriveConnection && (
                                        <GoogleDrivePicker
                                            connectionId={String(googleDriveConnection.connection_id)}
                                            onFilesSelected={() => {
                                                window.location.reload();
                                            }}
                                        />
                                    )}
                                    {isOneDrive && isConnected && oneDriveConnection && (
                                        <OneDrivePicker
                                            provider="one-drive"
                                            onFilesSelected={() => {
                                                window.location.reload();
                                            }}
                                        />
                                    )}
                                    {isOneDrivePersonal && isConnected && oneDrivePersonalConnection && (
                                        <OneDrivePicker
                                            provider="one-drive-personal"
                                            onFilesSelected={() => {
                                                window.location.reload();
                                            }}
                                        />
                                    )}
                                </ProviderCard>
                            );
                        })}
                    </div>
                </div>

                {resConnections?.connections && resConnections.connections.length > 0 && <UnifiedFileManager connections={resConnections.connections} />}
            </div>
        </div>
    );
}
