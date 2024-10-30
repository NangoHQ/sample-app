import { useQuery } from '@tanstack/react-query';
import { useEffect, useMemo } from 'react';
import { IntegrationsGrid } from '../components/IntegrationGrid';
import type { Integration } from '../types';
import Spinner from '../components/Spinner';
import { listConnections, listIntegrations, listContacts } from '../api';
import { queryClient, requestedIntegrations } from '../utils';
import { ContactsTable } from '../components/ContactsTable';

export default function IndexPage() {
  const { data: resIntegrations } = useQuery({
    queryKey: ['integrations'],
    queryFn: listIntegrations,
  });
  const { data: resConnections } = useQuery({
    queryKey: ['connections'],
    queryFn: listConnections,
  });
  const { data: resContacts } = useQuery({
    queryKey: ['contacts'],
    queryFn: listContacts,
  });

  const integrations = useMemo<Integration[] | undefined>(() => {
    if (!resIntegrations || !resConnections) {
      return;
    }

    return requestedIntegrations.map((integration) => {
      return {
        ...integration,
        deployed:
          resIntegrations.integrations.find((available) => {
            return available.unique_key === integration.integrationId;
          }) !== undefined,
        connected:
          resConnections.connections.find((connection) => {
            return connection.provider_config_key === integration.integrationId;
          }) !== undefined,
      };
    });
  }, [resIntegrations, resConnections]);

  useEffect(() => {
    if (!integrations) {
      return;
    }

    const interval = setInterval(
      () => {
        void queryClient.refetchQueries({ queryKey: ['contacts'] });
      },
      (resContacts !== undefined && resContacts.contacts.length > 0) ||
        !integrations.find((i) => i.connected)
        ? 10000
        : 1000
    );

    return () => {
      // eslint-disable-next-line @typescript-eslint/no-unnecessary-condition
      if (interval) {
        clearInterval(interval);
      }
    };
  }, [integrations, resContacts]);

  if (!integrations) {
    return (
      <main className="p-4 md:p-10 mx-auto max-w-7xl">
        <Spinner size={2} />
      </main>
    );
  }

  return (
    <main className="p-4 md:p-10 mx-auto max-w-7xl">
      <h2 className="text-center text-xl mb-10">
        Onboarding: Invite team members
      </h2>
      <IntegrationsGrid integrations={integrations} />
      <ContactsTable contacts={resContacts?.contacts} />
    </main>
  );
}
