/* eslint-disable @typescript-eslint/no-unsafe-call */
/* eslint-disable @typescript-eslint/no-unsafe-member-access */
/* eslint-disable @typescript-eslint/no-unsafe-return */
import { useQuery } from '@tanstack/react-query';
import type { GetIntegrations } from 'back-end';
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

const requestedIntegrations: Integration[] = [
  {
    name: 'Slack',
    image: '/integration-logos/slack.svg',
    integrationId: 'slack',
    description: 'Connect your Slack account to Wolf CRM.',
    deployed: false,
  },
  {
    name: 'Discord',
    image: '/integration-logos/discord.svg',
    integrationId: 'discord',
    description: 'Connect your Discord account to Wolf CRM.',
    deployed: false,
  },
];

export default function IndexPage() {
  const { data } = useQuery({
    queryKey: ['integrations'],
    queryFn: listIntegrations,
  });

  const integrations = useMemo<Integration[] | undefined>(() => {
    if (!data) {
      return;
    }

    return requestedIntegrations.map((int) => {
      return {
        ...int,
        deployed:
          data.integrations.find((available) => {
            return available.unique_key === int.integrationId;
          }) !== undefined,
      };
    });
  }, [data]);

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
