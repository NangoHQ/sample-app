import type { GetIntegrations } from 'back-end';

export type Integration = GetIntegrations['integrations'][0] & {
    connected: boolean;
    logo: string;
};

export type ProviderConfig = {
    unique_key: string;
    display_name: string;
    logo: string;
    supported: boolean;
};

export interface File {
    id: string;
    title: string; // Corresponds to 'name' in the database
    mimeType: string;
    url: string; // Corresponds to 'webViewLink' in the database
    iconLink: string;
    size?: number;
    updatedAt: string; // Corresponds to 'modifiedTime' in the database
    createdTime: string; // Corresponds to 'createdTime' in the database
    integrationId: string;
    connectionId: string;
    createdAt: string; // Corresponds to 'createdAt' in the database
    deletedAt?: string; // Corresponds to 'deletedAt' in the database
}
