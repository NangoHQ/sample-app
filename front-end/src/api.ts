import type { GetConnections, GetIntegrations } from 'back-end';
import { baseUrl } from './utils';

export async function listIntegrations(): Promise<GetIntegrations> {
  const res = await fetch(`${baseUrl}/integrations`);
  if (res.status !== 200) {
    throw new Error();
  }

  const json = (await res.json()) as GetIntegrations;
  return json;
}

export async function listConnections(): Promise<GetConnections> {
  const res = await fetch(`${baseUrl}/connections`);
  if (res.status !== 200) {
    throw new Error();
  }

  const json = (await res.json()) as GetConnections;
  return json;
}
