import { useMemo, useEffect } from 'react';
import { useQuery } from '@tanstack/react-query';
import { listConnections, listIntegrations, resetGoogleDriveState } from '../api';
import { GoogleDrivePicker } from '../components/GoogleDrivePicker';
import { GoogleDriveFiles } from '../components/GoogleDriveFiles';
import Spinner from '../components/Spinner';
import type { Integration } from '../types';
import { IntegrationsGrid } from '../components/IntegrationGrid';
import Head from 'next/head';''

export default function FilesPage() {
  const { data: resIntegrations } = useQuery({
    queryKey: ['integrations'],
    queryFn: listIntegrations,
  });
  const { data: resConnections, error: connectionsError } = useQuery({
    queryKey: ['connections'],
    queryFn: listConnections,
  });

  const integrations = useMemo<Integration[] | undefined>(() => {
    if (!resIntegrations || !resConnections) {
      return;
    }

    return resIntegrations.integrations.map((integration) => {
      return {
        ...integration,
        connected:
          resConnections.connections.find((connection) => {
            return connection.provider_config_key === integration.unique_key;
          }) !== undefined,
      };
    });
  }, [resIntegrations, resConnections]);

  const googleDriveConnection = useMemo(() => {
    return resConnections?.connections.find(
      (connection) => connection.provider_config_key === 'google-drive'
    );
  }, [resConnections]);

  console.log('Google Drive Connection:', googleDriveConnection);

  const connectedTo = useMemo(() => {
    return integrations?.find((value) => value.connected);
  }, [integrations]);

  useEffect(() => {
    console.log('Integrations:', integrations);
    console.log('Connections:', resConnections);
    console.log('Connected Integration:', connectedTo);
  }, [integrations, resConnections, connectedTo]);

  useEffect(() => {
    if (connectionsError) {
      console.error('Error fetching connections:', connectionsError);
    }
  }, [connectionsError]);

  const handleReset = async () => {
    try {
      await resetGoogleDriveState();
      window.location.reload();
    } catch (error) {
      console.error('Failed to reset state:', error);
    }
  };

  if (!integrations) {
    return (
      <main className="p-4 md:p-10 mx-auto max-w-7xl">
        <Spinner size={2} />
      </main>
    );
  }

  return (
    <div className="min-h-screen flex flex-col w-full">
      <Head>
        <title>Files</title>
      </Head>
      <header className="px-10 py-5 border-b">
        <h1 className="text-2xl font-bold">Files Settings</h1>
      </header>
      <div className="flex-1 px-10 py-10 overflow-auto justify-center items-center flex flex-col">
        <div className="flex justify-center">
          <div className="flex flex-col gap-16 w-[540px]">
            <div className="rounded shadow-2xl px-16 py-10 pb-16">
              <h2 className="text-center text-2xl mb-10 font-semibold">
                {!connectedTo ? 'Import Files' : 'Google Drive Files'}
              </h2>
              {!connectedTo && integrations && (
                <IntegrationsGrid
                  integrations={integrations.filter(integration => integration.unique_key === 'google-drive')}
                />
              )}
              {connectedTo && googleDriveConnection && (
                <div className="space-y-6">
                  <GoogleDrivePicker
                    connectionId={String(googleDriveConnection.connection_id)}
                    onFilesSelected={() => {
                      // Refetch files after selection
                      window.location.reload();
                    }}
                  />
                  <GoogleDriveFiles connectionId={String(googleDriveConnection.connection_id)} />
                </div>
              )}
            </div>
            {connectedTo && (
              <div className="flex justify-center">
                <button
                  onClick={handleReset}
                  className="px-4 py-2 bg-red-600 text-white rounded hover:bg-red-700 transition-colors"
                >
                  Reset Connection
                </button>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
} 
