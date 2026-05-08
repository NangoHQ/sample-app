export interface Contact {
    id: string;
    integrationId: string;
    connectionId: string;
    fullName: string;
    avatar: string;
    createdAt: Date | null;
    updatedAt: Date;
    deletedAt: Date | null;
}

export interface GetContactsSuccess {
    contacts: Contact[];
}

export interface GetIntegrations {
    integrations: { provider: string; unique_key: string; display_name: string; logo: string }[];
}

export interface GetConnectionsSuccess {
    connections: { providerConfigKey: string; connectionId: string; createdAt: string; broken: boolean }[];
}

export interface PostConnectSessionSuccess {
    token: string;
    connectSession: string;
}
