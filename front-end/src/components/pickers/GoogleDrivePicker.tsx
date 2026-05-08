import { useEffect, useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { FolderSearch, Loader2 } from 'lucide-react';
import { apiFetch } from '../../utils';

declare global {
    interface Window {
        google: any;
        gapi: any;
    }
}

interface Props {
    connectionId: string;
    userId: string;
    onFilesSelected?: () => void;
}

export function GoogleDrivePicker({ connectionId, userId, onFilesSelected }: Props) {
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const queryClient = useQueryClient();

    const { data: resConnection } = useQuery({
        queryKey: ['nango-credentials', 'google-drive'],
        queryFn: async () => {
            const res = await apiFetch(`/nango-credentials?integrationId=google-drive`);
            if (!res.ok) throw new Error('Failed to get credentials');
            return res.json();
        }
    });

    const accessToken = resConnection?.credentials?.access_token;
    const expiresAt = resConnection?.credentials?.expires_at;
    const appId = process.env.NEXT_PUBLIC_GOOGLE_APP_ID;

    useEffect(() => {
        if (!expiresAt) return;
        const timeUntilExpiry = new Date(expiresAt).getTime() - Date.now();
        if (timeUntilExpiry <= 0) {
            queryClient.invalidateQueries({ queryKey: ['nango-credentials', 'google-drive'] });
            return;
        }
        const id = setTimeout(() => {
            queryClient.invalidateQueries({ queryKey: ['nango-credentials', 'google-drive'] });
        }, timeUntilExpiry - 60_000);
        return () => clearTimeout(id);
    }, [expiresAt, connectionId, queryClient]);

    useEffect(() => {
        const script = document.createElement('script');
        script.src = 'https://apis.google.com/js/api.js';
        script.onload = () => window.gapi.load('picker', () => {});
        document.body.appendChild(script);
    }, []);

    const openPicker = async () => {
        if (!accessToken) {
            setError('No access token available — try refreshing the page');
            return;
        }

        setLoading(true);
        setError(null);

        const myDriveView = new window.google.picker.DocsView()
            .setIncludeFolders(true)
            .setSelectFolderEnabled(true)
            .setOwnedByMe(true)
            .setLabel('My Drive')
            .setMode(window.google.picker.DocsViewMode.LIST);

        const sharedView = new window.google.picker.DocsView()
            .setIncludeFolders(true)
            .setSelectFolderEnabled(true)
            .setOwnedByMe(false)
            .setLabel('Shared with Me')
            .setMode(window.google.picker.DocsViewMode.LIST);

        try {
            const picker = new window.google.picker.PickerBuilder()
                .addView(myDriveView)
                .addView(sharedView)
                .enableFeature(window.google.picker.Feature.SUPPORT_FOLDER_SELECT)
                .enableFeature(window.google.picker.Feature.MULTISELECT_ENABLED)
                .enableFeature(window.google.picker.Feature.SUPPORT_DRIVES)
                .setAppId(appId)
                .setOAuthToken(accessToken)
                .setCallback(async (data: any) => {
                    if (data.action === window.google.picker.Action.PICKED) {
                        const files = data.docs.filter((d: any) => d.type !== 'folder').map((d: any) => d.id);
                        const folders = data.docs.filter((d: any) => d.type === 'folder').map((d: any) => d.id);
                        const metadata = { files, folders };

                        await apiFetch(`/set-connection-metadata`, {
                            method: 'POST',
                            headers: { 'Content-Type': 'application/json' },
                            body: JSON.stringify({ integrationId: 'google-drive', metadata, userId })
                        });

                        setLoading(false);
                        onFilesSelected?.();
                    } else if (data.action === window.google.picker.Action.CANCEL) {
                        setLoading(false);
                    }
                })
                .build();

            picker.setVisible(true);
        } catch (err) {
            console.error('Error opening picker:', err);
            setError('Failed to open picker');
            setLoading(false);
        }
    };

    return (
        <div className="space-y-3">
            <button
                onClick={openPicker}
                disabled={loading || !accessToken}
                className="flex items-center gap-2 px-4 py-2 rounded-lg bg-indigo-600 hover:bg-indigo-500 text-white text-sm font-medium transition-all disabled:opacity-50 disabled:cursor-not-allowed"
            >
                {loading ? (
                    <><Loader2 size={14} className="animate-spin" /> Opening picker...</>
                ) : (
                    <><FolderSearch size={14} /> Select files &amp; folders</>
                )}
            </button>

            {error && (
                <p className="text-red-400 text-xs">{error}</p>
            )}
        </div>
    );
}
