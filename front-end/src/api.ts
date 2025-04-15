import type {
  GetIntegrations,
  PostConnectSessionSuccess,
  GetContactsSuccess,
  GetConnectionsSuccess,
} from 'back-end';
import { baseUrl } from './utils';
import type { File } from './types';

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
  const res = await fetch('http://localhost:3010/contacts?integration=slack');
  if (res.status !== 200) {
    throw new Error();
  }

  const json = (await res.json()) as GetContactsSuccess;
  return json;
}

export async function getNangoCredentials(integrationId: string): Promise<any> {
  const res = await fetch(`${baseUrl}/nango-credentials?integrationId=${integrationId}`);
  if (res.status !== 200) {
    throw new Error('Failed to get Nango credentials');
  }
  return res.json();
}

export async function setConnectionMetadata(integrationId: string, metadata: Record<string, any>): Promise<void> {
  const res = await fetch(`${baseUrl}/set-connection-metadata`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ integrationId, metadata }),
  });
  if (res.status !== 200) {
    throw new Error('Failed to set connection metadata');
  }
}

export async function getFiles(): Promise<File[]> {
  const res = await fetch(`${baseUrl}/get-files`);
  if (res.status !== 200) {
    throw new Error('Failed to get files');
  }
  const json: { files: File[] } = await res.json();
  return json.files;
}

export async function downloadFile(fileId: string): Promise<Blob> {
  const res = await fetch(`${baseUrl}/download/${fileId}`, {
    method: 'GET',
  });

  if (!res.ok) {
    throw new Error('Failed to download file');
  }

  return res.blob();
}

export async function resetGoogleDriveState(): Promise<void> {
  const res = await fetch(`${baseUrl}/reset-google-drive-state`, {
    method: 'POST',
  });
  if (res.status !== 200) {
    throw new Error('Failed to reset Google Drive state');
  }
}
