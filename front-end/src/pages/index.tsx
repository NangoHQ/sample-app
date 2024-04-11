/* eslint-disable @typescript-eslint/no-unsafe-call */
/* eslint-disable @typescript-eslint/no-unsafe-member-access */
/* eslint-disable @typescript-eslint/no-unsafe-return */
import { useQuery } from '@tanstack/react-query';
import type { GetConnections, GetIntegrations } from 'back-end';
import { useMemo } from 'react';
import { IntegrationsGrid } from '../components/integrationGrid';
import type { Integration } from '../types';
import Spinner from '../components/Spinner';

async function listIntegrations(): Promise<GetIntegrations> {
  const res = await fetch('http://localhost:3003/integrations');
  if (res.status !== 200) {
    throw new Error();
  }

  const json = (await res.json()) as GetIntegrations;
  return json;
}
async function listConnections(): Promise<GetConnections> {
  const res = await fetch('http://localhost:3003/connections');
  if (res.status !== 200) {
    throw new Error();
  }

  const json = (await res.json()) as GetConnections;
  return json;
}

const requestedIntegrations: Integration[] = [
  {
    name: 'Slack',
    image: '/integration-logos/slack.svg',
    integrationId: 'slack',
    description: 'Connect your Slack account to Wolf CRM.',
    deployed: false,
    connected: false,
  },
  {
    name: 'Discord',
    image: '/integration-logos/discord.svg',
    integrationId: 'discord',
    description: 'Connect your Discord account to Wolf CRM.',
    deployed: false,
    connected: false,
  },
];

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

  if (!integrations) {
    return (
      <main className="p-4 md:p-10 mx-auto max-w-7xl">
        <Spinner size={2} />
      </main>
    );
  }

  return (
    <main className="p-4 md:p-10 mx-auto max-w-7xl">
      <IntegrationsGrid integrations={integrations} />
    </main>
  );
}
