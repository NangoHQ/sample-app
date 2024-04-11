/* eslint-disable @typescript-eslint/no-unsafe-return */
import { useQuery } from '@tanstack/react-query';
import type { GetIntegrations } from 'back-end';
import IntegrationsGrid from '../components/integrationGrid';
import type { Integration } from '../types';

async function listIntegrations(): Promise<GetIntegrations> {
  const res = await fetch('http://localhost:3003/integrations');
  if (res.status !== 200) {
    throw new Error();
  }

  const json = (await res.json()) as GetIntegrations;
  return json;
}

export default function IndexPage() {
  const list = useQuery({
    queryKey: ['integrations'],
    queryFn: listIntegrations,
  });

  console.log(list);

  const integrations: Integration[] = [
    {
      name: 'Slack',
      image: '/integration-logos/slack.svg',
      integrationId: 'slack',
      description: 'Connect your Slack account to Wolf CRM.',
    },
    {
      name: 'LinkedIn',
      image: '/integration-logos/linkedin.svg',
      integrationId: 'linkedin',
      description: 'Connect your LinkedIn account to Wolf CRM.',
    },
  ];

  return (
    <main className="p-4 md:p-10 mx-auto max-w-7xl">
      <IntegrationsGrid integrations={integrations} />
    </main>
  );
}
