import { useQuery } from '@tanstack/react-query';
import { useMemo } from 'react';
import { IntegrationsGrid } from '../components/IntegrationGrid';
import Spinner from '../components/Spinner';
import { listConnections, listIntegrations } from '../api';
import { ContactsTable } from '../components/ContactsTable';
import type { Integration } from '../types';
import { cn } from '../utils';

export default function IndexPage() {
  const { data: resIntegrations } = useQuery({
    queryKey: ['integrations'],
    queryFn: listIntegrations,
  });
  const { data: resConnections } = useQuery({
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

  const connectedTo = useMemo(() => {
    return integrations?.find((value) => value.connected);
  }, [integrations]);

  if (!integrations) {
    return (
      <main className="p-4 md:p-10 mx-auto max-w-7xl">
        <Spinner size={2} />
      </main>
    );
  }

  return (
    <div className="w-full h-screen grid grid-rows-[auto_1fr]">
      <header className="px-10 py-5 border-b">
        <h1 className="text-2xl font-bold">Team Settings</h1>
      </header>
      <div className="overflow-y-scroll px-10 py-10">
        <div
          className={cn(
            'flex justify-center',
            !connectedTo && 'items-center h-full'
          )}
        >
          <div className="flex flex-col gap-16">
            <div className="w-[540px] rounded shadow-2xl px-16 py-10 pb-16 h-auto">
              <h2 className="text-center text-2xl mb-10 font-semibold">
                Invite team members
              </h2>
              {connectedTo && <ContactsTable />}
              {!connectedTo && <IntegrationsGrid integrations={integrations} />}
            </div>
            {connectedTo && <IntegrationsGrid integrations={[connectedTo]} />}
          </div>
        </div>
      </div>
    </div>
  );
}
