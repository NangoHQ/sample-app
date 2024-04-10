import { Card, Title, Text } from '@tremor/react';
import Search from './search';
import IntegrationTable from './table';

interface Integration {
  name: string;
  description?: string;
  image: string;
}

export default async function IndexPage({
  searchParams
}: {
  searchParams: { q: string };
}) {
  const integrations: Integration[] = [
    {
      name: 'Slack',
      image: './public/integration-logos/slack.svg'
    }
  ];

  return (
    <main className="p-4 md:p-10 mx-auto max-w-7xl">
      <Title>Users</Title>
      <Text>A list of users retrieved from a Postgres database.</Text>
      <Search />
      <Card className="mt-6">
        <IntegrationTable integrations={integrations} />
      </Card>
    </main>
  );
}
