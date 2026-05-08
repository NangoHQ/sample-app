export type ProviderGroup = 'messaging' | 'files' | 'mcp' | 'productivity';
export type AuthType = 'oauth2' | 'api_key' | 'basic';
export type FeatureType = 'syncs' | 'actions' | 'webhooks' | 'mcp' | 'bot';

export interface DemoAction {
    id: string;
    label: string;
    description: string;
    inputSchema?: Record<string, { type: string; placeholder?: string; label: string }>;
}

export interface Provider {
    id: string; // nango providerConfigKey
    name: string;
    description: string;
    group: ProviderGroup;
    authType: AuthType;
    color: string; // brand color for glow
    bgColor: string; // card accent bg
    features: FeatureType[];
    syncModels?: string[];
    demoActions?: DemoAction[];
    mcpType?: 'dedicated' | 'generic' | 'nango-server'; // for mcp group
    mcpServerUrl?: string; // for third-party MCP servers
    tags?: string[];
}

export type ProviderGroupMeta = {
    id: ProviderGroup;
    label: string;
    description: string;
    icon: string; // lucide icon name
    color: string;
};

export const PROVIDER_GROUPS: ProviderGroupMeta[] = [
    {
        id: 'messaging',
        label: 'Messaging & Bots',
        description: 'Chat platforms, bot integrations, and real-time messaging',
        icon: 'MessageSquare',
        color: '#6366f1'
    },
    {
        id: 'files',
        label: 'Files & Documents',
        description: 'Cloud storage and document management platforms',
        icon: 'FolderOpen',
        color: '#0ea5e9'
    },
    {
        id: 'mcp',
        label: 'MCP Connections',
        description: 'Model Context Protocol integrations for AI agents',
        icon: 'Cpu',
        color: '#a855f7'
    },
    {
        id: 'productivity',
        label: 'Productivity',
        description: 'Calendar, tasks, and scheduling integrations',
        icon: 'Calendar',
        color: '#1a73e8'
    }
];

export const PROVIDERS: Provider[] = [
    // MESSAGING
    {
        id: 'slack',
        name: 'Slack',
        description: 'Sync workspace users, send messages, and receive real-time events',
        group: 'messaging',
        authType: 'oauth2',
        color: '#4A154B',
        bgColor: 'rgba(74,21,75,0.15)',

        features: ['syncs', 'actions', 'webhooks'],
        syncModels: ['SlackUser'],
        tags: ['OAuth', 'Syncs', 'Actions', 'Forward Webhooks'],
        demoActions: [
            {
                id: 'send-message',
                label: 'Send Message',
                description: 'Send a message to a Slack user',
                inputSchema: {
                    userId: { type: 'string', placeholder: 'U012AB3CD', label: 'User ID' },
                    message: { type: 'string', placeholder: 'Hello from Nango!', label: 'Message' }
                }
            }
        ]
    },

    // FILES
    {
        id: 'google-drive',
        name: 'Google Drive',
        description: 'Sync files and folders, pick specific paths, download documents',
        group: 'files',
        authType: 'oauth2',
        color: '#1FA463',
        bgColor: 'rgba(31,164,99,0.15)',
        features: ['syncs', 'actions'],
        syncModels: ['Document'],
        tags: ['OAuth', 'Syncs', 'Metadata-driven'],
        demoActions: [
            {
                id: 'fetch-document',
                label: 'Fetch Document',
                description: 'Fetch metadata for a specific document',
                inputSchema: {
                    fileId: { type: 'string', placeholder: '1BxiMVs0XRA5nFMdKvBdBZjgmUUqptlbs74OgVE2upms', label: 'File ID' }
                }
            }
        ]
    },
    {
        id: 'one-drive',
        name: 'OneDrive',
        description: 'Sync OneDrive Business files with metadata-driven folder selection',
        group: 'files',
        authType: 'oauth2',
        color: '#0078D4',
        bgColor: 'rgba(0,120,212,0.15)',
        features: ['syncs', 'actions'],
        syncModels: ['Document'],
        tags: ['OAuth', 'Syncs', 'Business']
    },
    {
        id: 'one-drive-personal',
        name: 'OneDrive Personal',
        description: 'Sync personal OneDrive files and folders',
        group: 'files',
        authType: 'oauth2',
        color: '#0078D4',
        bgColor: 'rgba(0,120,212,0.12)',
        features: ['syncs', 'actions'],
        syncModels: ['Document'],
        tags: ['OAuth', 'Syncs', 'Personal']
    },

    // MCP
    {
        id: 'notion-mcp',
        name: 'Notion',
        description: "Connect to Notion's MCP server — PKCE + dynamic OAuth, no client secret",
        group: 'mcp',
        authType: 'oauth2',
        color: '#000000',
        bgColor: 'rgba(255,255,255,0.08)',
        features: ['mcp'],
        mcpType: 'dedicated',
        tags: ['PKCE', 'Dynamic Discovery', 'No Secrets'],
        demoActions: [
            {
                id: 'search-pages',
                label: 'Search Pages',
                description: 'Search Notion pages via MCP',
                inputSchema: {
                    query: { type: 'string', placeholder: 'meeting notes', label: 'Search Query' }
                }
            }
        ]
    },

    // PRODUCTIVITY
    {
        id: 'google-calendar',
        name: 'Google Calendar',
        description: 'Sync events, create meetings with AI scheduling, and react to calendar changes',
        group: 'productivity',
        authType: 'oauth2',
        color: '#1a73e8',
        bgColor: 'rgba(26,115,232,0.15)',
        features: ['syncs', 'actions', 'webhooks'],
        syncModels: ['GoogleCalendarEvent'],
        tags: ['OAuth', 'Syncs', 'Actions', 'AI Scheduling', 'Forward Webhooks'],
        demoActions: [
            {
                id: 'create-event',
                label: 'Create Event',
                description: 'Create a new calendar event',
                inputSchema: {
                    summary: { type: 'string', placeholder: 'Team standup', label: 'Title' },
                    startDateTime: { type: 'string', placeholder: '2024-01-15T10:00:00Z', label: 'Start (ISO 8601)' },
                    endDateTime: { type: 'string', placeholder: '2024-01-15T10:30:00Z', label: 'End (ISO 8601)' }
                }
            }
        ]
    }
];

export function getProvidersByGroup(group: ProviderGroup): Provider[] {
    return PROVIDERS.filter((p) => p.group === group);
}

export function getProviderById(id: string): Provider | undefined {
    return PROVIDERS.find((p) => p.id === id);
}

export function getMCPProviders(): Provider[] {
    return PROVIDERS.filter((p) => p.group === 'mcp');
}
