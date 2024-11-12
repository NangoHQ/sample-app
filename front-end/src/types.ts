import type { GetIntegrations } from 'back-end';

export type Integration = GetIntegrations['integrations'][0] & {
  connected: boolean;
  logo: string;
};
