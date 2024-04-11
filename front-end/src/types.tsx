export type { User } from '../../nango-integrations/models';

export interface Integration {
  name: string;
  integrationId: string;
  description?: string;
  image: string;
  deployed: boolean;
  connected: boolean;
}
