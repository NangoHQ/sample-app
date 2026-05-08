import type { GetIntegrations, PostConnectSessionSuccess, GetContactsSuccess, GetConnectionsSuccess } from 'back-end';
import { apiFetch } from './utils';
import type { File } from './types';

export async function postConnectSession(integration: string): Promise<PostConnectSessionSuccess> {
    const res = await apiFetch(`/connect-session`, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json'
        },
        body: JSON.stringify({ integration })
    });
    if (res.status !== 200) {
        throw new Error();
    }

    const json = (await res.json()) as PostConnectSessionSuccess;
    return json;
}

export async function listIntegrations(): Promise<GetIntegrations> {
    const res = await apiFetch(`/integrations`);
    if (res.status !== 200) {
        throw new Error();
    }

    const json = (await res.json()) as GetIntegrations;
    return json;
}

export async function listConnections(): Promise<GetConnectionsSuccess> {
    const res = await apiFetch(`/connections`);
    if (res.status !== 200) {
        throw new Error();
    }

    const json = (await res.json()) as GetConnectionsSuccess;
    return json;
}

export async function listContacts(): Promise<GetContactsSuccess> {
    const res = await apiFetch(`/contacts?integration=slack`);
    if (res.status !== 200) {
        throw new Error();
    }

    const json = (await res.json()) as GetContactsSuccess;
    return json;
}

export async function getNangoCredentials(integrationId: string): Promise<any> {
    const res = await apiFetch(`/nango-credentials?integrationId=${integrationId}`);
    if (res.status !== 200) {
        throw new Error('Failed to get Nango credentials');
    }
    return res.json();
}

export async function getSharepointBaseUrl(): Promise<any> {
    const res = await apiFetch(`/sharepoint-baseurl`);
    if (res.status !== 200) {
        throw new Error('Failed to get Nango credentials');
    }
    return res.json();
}

export async function setConnectionMetadata(integrationId: string, metadata: Record<string, any>): Promise<void> {
    const res = await apiFetch(`/set-connection-metadata`, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json'
        },
        body: JSON.stringify({ integrationId, metadata })
    });
    if (res.status !== 200) {
        throw new Error('Failed to set connection metadata');
    }
}

export async function getFiles(): Promise<File[]> {
    const res = await apiFetch(`/get-files`);
    if (res.status !== 200) {
        throw new Error('Failed to get files');
    }
    const json: { files: File[] } = await res.json();
    return json.files;
}

export async function downloadFile(fileId: string): Promise<Blob> {
    const res = await apiFetch(`/download/${fileId}`, {
        method: 'GET'
    });

    if (!res.ok) {
        throw new Error('Failed to download file');
    }

    return res.blob();
}

export async function deleteConnection(integration: string): Promise<void> {
    const res = await apiFetch(`/connections?integration=${integration}`, {
        method: 'DELETE'
    });
    if (res.status !== 200) {
        throw new Error('Failed to delete connection');
    }
}

export async function runAgent(
    providerConfigKey: string,
    messages: { role: string; content: string }[]
): Promise<{ steps: AgentStep[]; messages: { role: string; content: string }[] }> {
    const res = await apiFetch('/agent/run', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ providerConfigKey, messages })
    });
    if (!res.ok) {
        const err = await res.json().catch(() => ({})) as { error?: string };
        throw new Error(err.error ?? 'Agent run failed');
    }
    return res.json();
}

export type AgentStep =
    | { type: 'connection_check'; status: string; connectionId: string; message: string }
    | { type: 'llm_request'; model: string; prompt: string; tools: string[] }
    | { type: 'llm_text'; text: string }
    | { type: 'tool_call'; tool: string; nangoAction: string; arguments: Record<string, unknown> }
    | { type: 'tool_result'; tool: string; result: unknown }
    | { type: 'tool_error'; tool: string; error: string }
    | { type: 'final_response'; text: string };
