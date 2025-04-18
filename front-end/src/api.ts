import type {
  GetIntegrations,
  PostConnectSessionSuccess,
  GetContactsSuccess,
  GetConnectionsSuccess,
} from 'back-end';
import { baseUrl } from './utils';

export async function postConnectSession(): Promise<PostConnectSessionSuccess> {
  const res = await fetch(`${baseUrl}/connect-session`, {
    method: 'POST',
  });
  if (res.status !== 200) {
    throw new Error();
  }

  const json = (await res.json()) as PostConnectSessionSuccess;
  return json;
}

export async function listIntegrations(): Promise<GetIntegrations> {
  const res = await fetch(`${baseUrl}/integrations`);
  if (res.status !== 200) {
    throw new Error();
  }

  const json = (await res.json()) as GetIntegrations;
  return json;
}

export async function listConnections(): Promise<GetConnectionsSuccess> {
  const res = await fetch(`${baseUrl}/connections`);
  if (res.status !== 200) {
    throw new Error();
  }

  const json = (await res.json()) as GetConnectionsSuccess;
  return json;
}

export async function listContacts(): Promise<GetContactsSuccess> {
  const res = await fetch(`${baseUrl}/contacts?integration=slack`);
  if (res.status !== 200) {
    throw new Error();
  }

  const json = (await res.json()) as GetContactsSuccess;
  return json;
}
