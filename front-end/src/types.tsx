export interface Integration {
  name: string;
  integrationId: string;
  description?: string;
  image: string;
  deployed: boolean;
  connected: boolean;
}
