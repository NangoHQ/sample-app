import IntegrationsGrid from './integrationGrid';
import type { Integration } from './types';

export default function IndexPage() {
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
