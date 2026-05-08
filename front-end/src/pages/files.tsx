import { useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import {
    FolderOpen, Download, ExternalLink, FileText, Image, Archive,
    Loader2, RefreshCw, Search, Grid, List as ListIcon, ChevronRight
} from 'lucide-react';
import { toast } from 'sonner';
import { Layout, useUser } from '../components/layout/Layout';
import { ProviderCard } from '../components/providers/ProviderCard';
import { GoogleDrivePicker } from '../components/pickers/GoogleDrivePicker';
import { OneDrivePicker } from '../components/pickers/OneDrivePicker';
import { useNangoConnect } from '../hooks/useNangoConnect';
import { Badge } from '../components/ui/Badge';
import { PROVIDERS } from '../config/providers';
import { apiFetch } from '../utils';
import { cn } from '../utils';

const FILE_PROVIDERS = PROVIDERS.filter((p) => p.group === 'files');

interface SyncedFile {
    id: string;
    title: string;
    mimeType: string;
    url: string;
    size?: number;
    createdTime: string;
    integrationId: string;
    connectionId: string;
}

const MIME_ICONS: Record<string, any> = {
    'application/pdf': FileText,
    'image/': Image,
    'application/zip': Archive,
    'application/vnd.google-apps': FileText
};

function getMimeIcon(mimeType: string) {
    for (const [key, Icon] of Object.entries(MIME_ICONS)) {
        if (mimeType.startsWith(key)) return Icon;
    }
    return FileText;
}

function formatSize(bytes?: number) {
    if (!bytes) return null;
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}


function ProviderPickerPanel({
    providerId,
    connectionId,
    userId,
    onSyncStarted
}: {
    providerId: string;
    connectionId: string;
    userId: string;
    onSyncStarted: () => void;
}) {
    const providerLabel = providerId.replace(/-/g, ' ');

    return (
        <div className="rounded-xl border border-indigo-500/20 bg-indigo-500/5 p-5">
            <div className="flex items-center justify-between mb-4">
                <span className="text-indigo-300 font-semibold text-sm">Select files to sync</span>
                <span className="text-[10px] text-zinc-500 capitalize">{providerLabel}</span>
            </div>

            {providerId === 'google-drive' && (
                <div className="space-y-2">
                    <p className="text-zinc-400 text-xs leading-relaxed mb-3">
                        Use the Google Drive Picker to select specific files and folders you want Nango to sync.
                    </p>
                    <GoogleDrivePicker
                        connectionId={connectionId}
                        userId={userId}
                        onFilesSelected={() => {
                            toast.success('Sync started', { description: 'Files will appear shortly after the sync completes.' });
                            onSyncStarted();
                        }}
                    />
                </div>
            )}

            {(providerId === 'one-drive' || providerId === 'one-drive-personal') && (
                <div className="space-y-2">
                    <p className="text-zinc-400 text-xs leading-relaxed mb-3">
                        Use the OneDrive Picker to select specific files you want Nango to sync.
                    </p>
                    <OneDrivePicker
                        provider={providerId as 'one-drive' | 'one-drive-personal'}
                        userId={userId}
                        onFilesSelected={() => {
                            toast.success('Sync started', { description: 'Files will appear shortly after the sync completes.' });
                            onSyncStarted();
                        }}
                    />
                </div>
            )}

        </div>
    );
}


export default function FilesPage() {
    const { user } = useUser();
    const queryClient = useQueryClient();
    const { connect, reconnect, disconnect, connecting, reconnecting } = useNangoConnect();
    const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');
    const [search, setSearch] = useState('');
    const [downloading, setDownloading] = useState<string | null>(null);
    const [configuringProvider, setConfiguringProvider] = useState<string | null>(null);

    const { data: connections } = useQuery({
        queryKey: ['connections'],
        queryFn: async () => {
            const res = await apiFetch(`/connections`);
            if (!res.ok) return [];
            return (await res.json()).connections as { providerConfigKey: string; connectionId: string; broken: boolean }[];
        },
        refetchInterval: 5000
    });
    const connectedMap = new Map(connections?.map((c) => [c.providerConfigKey, c.connectionId]) ?? []);
    const brokenSet = new Set(connections?.filter((c) => c.broken).map((c) => c.providerConfigKey) ?? []);
    const hasAnyFileProvider = FILE_PROVIDERS.some((p) => connectedMap.has(p.id));

    const { data: files, isLoading: loadingFiles, refetch } = useQuery({
        queryKey: ['files'],
        enabled: hasAnyFileProvider,
        queryFn: async () => {
            const res = await apiFetch(`/get-files`);
            if (!res.ok) return [];
            const data = await res.json();
            return (data.files ?? []) as SyncedFile[];
        },
        refetchInterval: 30000
    });

    const filteredFiles = (files ?? []).filter((f) =>
        !search || f.title.toLowerCase().includes(search.toLowerCase())
    );

    const downloadFile = async (fileId: string, title: string) => {
        setDownloading(fileId);
        try {
            const res = await apiFetch(`/download/${fileId}`);
            if (!res.ok) throw new Error('Download failed');
            const blob = await res.blob();
            const url = window.URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = title;
            a.click();
            window.URL.revokeObjectURL(url);
            toast.success('Downloaded', { description: title });
        } catch (err: any) {
            toast.error('Download failed', { description: err?.message });
        } finally {
            setDownloading(null);
        }
    };

    return (
        <Layout
            title="Files & Documents"
            description="Sync and browse files from Google Drive, OneDrive, Dropbox, and Box"
            actions={
                <div className="flex items-center gap-2">
                    <button
                        onClick={() => refetch()}
                        className="p-1.5 rounded-lg hover:bg-zinc-800 text-zinc-500 hover:text-zinc-300 transition-colors"
                        title="Refresh"
                    >
                        <RefreshCw size={14} />
                    </button>
                    <button
                        onClick={() => setViewMode(viewMode === 'grid' ? 'list' : 'grid')}
                        className="p-1.5 rounded-lg hover:bg-zinc-800 text-zinc-500 hover:text-zinc-300 transition-colors"
                    >
                        {viewMode === 'grid' ? <ListIcon size={14} /> : <Grid size={14} />}
                    </button>
                </div>
            }
        >
            <div className="p-6 space-y-6">
                {/* Provider grid */}
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                    {FILE_PROVIDERS.map((provider) => (
                        <ProviderCard
                            key={provider.id}
                            provider={provider}
                            connected={connectedMap.has(provider.id)}
                            connectionId={connectedMap.get(provider.id)}
                            broken={brokenSet.has(provider.id)}
                            isConnecting={connecting === provider.id}
                            isReconnecting={reconnecting === provider.id}
                            onConnect={() => connect({
                                userId: user.id,
                                providerConfigKey: provider.id,
                                onSuccess: () => {
                                    queryClient.invalidateQueries({ queryKey: ['connections'] });
                                    queryClient.invalidateQueries({ queryKey: ['files'] });
                                    setConfiguringProvider(provider.id);
                                }
                            })}
                            onReconnect={() => reconnect({
                                userId: user.id,
                                providerConfigKey: provider.id,
                                onSuccess: () => queryClient.invalidateQueries({ queryKey: ['connections'] })
                            })}
                            onDisconnect={async () => {
                                await disconnect(provider.id);
                                queryClient.invalidateQueries({ queryKey: ['connections'] });
                                queryClient.invalidateQueries({ queryKey: ['files'] });
                                if (configuringProvider === provider.id) setConfiguringProvider(null);
                            }}
                            onClick={connectedMap.has(provider.id)
                                ? () => setConfiguringProvider(configuringProvider === provider.id ? null : provider.id)
                                : undefined
                            }
                        />
                    ))}
                </div>

                {/* Folder pickers for connected providers */}
                {FILE_PROVIDERS.filter((p) => connectedMap.has(p.id)).map((provider) => (
                    configuringProvider === provider.id && (
                        <ProviderPickerPanel
                            key={provider.id}
                            providerId={provider.id}
                            connectionId={connectedMap.get(provider.id)!}
                            userId={user.id}
                            onSyncStarted={() => {
                                setConfiguringProvider(null);
                                setTimeout(() => refetch(), 3000);
                            }}
                        />
                    )
                ))}

                {/* Hint: click connected card to configure */}
                {hasAnyFileProvider && !configuringProvider && (
                    <div className="flex items-center gap-2 text-zinc-600 text-xs">
                        <ChevronRight size={12} />
                        Click a connected provider card to select a folder and start syncing
                    </div>
                )}

                {/* File browser */}
                {hasAnyFileProvider ? (
                    <div className="rounded-xl border border-zinc-800/60 bg-zinc-900/40 overflow-hidden">
                        {/* Toolbar */}
                        <div className="flex items-center gap-3 px-5 py-3.5 border-b border-zinc-800/60">
                            <FolderOpen size={15} className="text-zinc-500" />
                            <span className="text-zinc-200 font-medium text-sm">Synced Files</span>
                            {files && <Badge variant="default" size="xs">{files.length}</Badge>}
                            <div className="flex items-center gap-2 ml-auto">
                                <div className="relative">
                                    <Search size={12} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-zinc-500" />
                                    <input
                                        value={search}
                                        onChange={(e) => setSearch(e.target.value)}
                                        placeholder="Search files..."
                                        className="pl-7 pr-3 py-1.5 bg-zinc-800/60 border border-zinc-700/60 rounded-lg text-zinc-200 text-xs placeholder-zinc-600 focus:outline-none w-48"
                                    />
                                </div>
                            </div>
                        </div>

                        {/* Files */}
                        {loadingFiles ? (
                            <div className="flex items-center justify-center py-16 gap-2 text-zinc-500 text-sm">
                                <Loader2 size={15} className="animate-spin" />
                                Syncing files...
                            </div>
                        ) : filteredFiles.length === 0 ? (
                            <div className="flex flex-col items-center justify-center py-16 text-center">
                                <FolderOpen size={28} className="text-zinc-700 mb-3" />
                                <p className="text-zinc-400 text-sm font-medium">
                                    {search ? 'No files match your search' : 'No files synced yet'}
                                </p>
                                <p className="text-zinc-600 text-xs mt-1">
                                    {search
                                        ? 'Try a different search term'
                                        : 'Click a connected provider above to select a folder and start syncing'
                                    }
                                </p>
                            </div>
                        ) : viewMode === 'grid' ? (
                            <div className="p-5 grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-3">
                                {filteredFiles.map((file) => (
                                    <FileGridCard
                                        key={file.id}
                                        file={file}
                                        downloading={downloading === file.id}
                                        onDownload={() => downloadFile(file.id, file.title)}
                                    />
                                ))}
                            </div>
                        ) : (
                            <div className="divide-y divide-zinc-800/40">
                                {filteredFiles.map((file) => (
                                    <FileListRow
                                        key={file.id}
                                        file={file}
                                        downloading={downloading === file.id}
                                        onDownload={() => downloadFile(file.id, file.title)}
                                    />
                                ))}
                            </div>
                        )}
                    </div>
                ) : (
                    <div className="rounded-xl border border-zinc-800/40 border-dashed p-12 text-center">
                        <FolderOpen size={28} className="text-zinc-700 mx-auto mb-3" />
                        <p className="text-zinc-400 text-sm font-medium mb-1">Connect a file provider to get started</p>
                        <p className="text-zinc-600 text-xs">Connect above, then select a folder to sync. Google Drive and OneDrive let you pick specific folders.</p>
                    </div>
                )}

                {/* Deploy reminder */}
                <div className="rounded-xl border border-amber-500/20 bg-amber-500/5 p-4 flex items-start gap-3">
                    <span className="text-amber-400 text-base mt-0.5">⚠</span>
                    <div>
                        <p className="text-amber-300 font-semibold text-xs mb-1">Deploy integrations before connecting</p>
                        <p className="text-zinc-400 text-xs leading-relaxed mb-2">
                            Syncs won't run until the integration scripts are deployed to Nango. Run this once before creating any connections:
                        </p>
                        <div className="flex items-center gap-3 font-mono text-xs bg-zinc-900/80 border border-zinc-700/50 rounded-lg px-3 py-2">
                            <span className="text-zinc-600">$</span>
                            <span className="text-zinc-200">cd nango-integrations</span>
                            <span className="text-zinc-600 mx-1">&amp;&amp;</span>
                            <span className="text-zinc-200">nango deploy dev</span>
                        </div>
                    </div>
                </div>

                {/* Sync explanation */}
                <div className="rounded-xl border border-sky-500/20 bg-sky-500/5 p-5">
                    <h3 className="text-sky-300 font-semibold text-sm mb-3">How file sync works</h3>
                    <div className="grid grid-cols-1 sm:grid-cols-4 gap-4">
                        {[
                            { title: 'Connect', desc: 'Authorize via Nango Connect UI. OAuth token stored securely.' },
                            { title: 'Pick folder', desc: 'Select a folder (Google Drive / OneDrive) or sync root (Dropbox / Box).' },
                            { title: 'Sync', desc: 'Nango runs the sync script scoped to your selected folder.' },
                            { title: 'Webhook', desc: 'When sync completes, Nango fires a webhook and files appear here.' }
                        ].map((step, i) => (
                            <div key={i} className="flex gap-3">
                                <div className="w-5 h-5 rounded-full bg-sky-500/20 border border-sky-500/30 flex items-center justify-center text-[10px] font-bold text-sky-400 shrink-0 mt-0.5">
                                    {i + 1}
                                </div>
                                <div>
                                    <p className="text-zinc-200 text-xs font-medium">{step.title}</p>
                                    <p className="text-zinc-500 text-[11px] mt-0.5 leading-relaxed">{step.desc}</p>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            </div>
        </Layout>
    );
}

function FileGridCard({ file, downloading, onDownload }: { file: SyncedFile; downloading: boolean; onDownload: () => void }) {
    const Icon = getMimeIcon(file.mimeType);
    return (
        <div className="group rounded-xl border border-zinc-800/60 bg-zinc-900/40 p-3.5 hover:border-zinc-700/60 transition-all">
            <div className="flex items-start justify-between mb-2.5">
                <div className="w-9 h-9 rounded-lg bg-zinc-800/60 flex items-center justify-center">
                    <Icon size={18} className="text-zinc-400" />
                </div>
                <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                    {file.url && (
                        <a href={file.url} target="_blank" rel="noopener noreferrer"
                            className="p-1.5 rounded hover:bg-zinc-700 text-zinc-500 hover:text-zinc-300 transition-colors">
                            <ExternalLink size={11} />
                        </a>
                    )}
                    <button onClick={onDownload} disabled={downloading}
                        className="p-1.5 rounded hover:bg-zinc-700 text-zinc-500 hover:text-zinc-300 transition-colors disabled:opacity-40">
                        {downloading ? <Loader2 size={11} className="animate-spin" /> : <Download size={11} />}
                    </button>
                </div>
            </div>
            <p className="text-zinc-200 text-xs font-medium line-clamp-2 leading-tight mb-1.5">{file.title}</p>
            <div className="flex items-center gap-2">
                <span className="text-[10px] text-zinc-600 capitalize">{file.integrationId.replace(/-/g, ' ')}</span>
                {file.size && <span className="text-[10px] text-zinc-700">{formatSize(file.size)}</span>}
            </div>
        </div>
    );
}

function FileListRow({ file, downloading, onDownload }: { file: SyncedFile; downloading: boolean; onDownload: () => void }) {
    const Icon = getMimeIcon(file.mimeType);
    return (
        <div className="group flex items-center gap-3 px-5 py-3 hover:bg-zinc-800/30 transition-colors">
            <Icon size={15} className="text-zinc-500 shrink-0" />
            <p className="text-zinc-200 text-sm flex-1 truncate">{file.title}</p>
            <span className="text-zinc-600 text-xs capitalize">{file.integrationId.replace(/-/g, ' ')}</span>
            {file.size && <span className="text-zinc-700 text-xs">{formatSize(file.size)}</span>}
            <span className="text-zinc-700 text-xs">{new Date(file.createdTime).toLocaleDateString()}</span>
            <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                {file.url && (
                    <a href={file.url} target="_blank" rel="noopener noreferrer"
                        className="p-1.5 rounded hover:bg-zinc-700 text-zinc-500 hover:text-zinc-300 transition-colors">
                        <ExternalLink size={12} />
                    </a>
                )}
                <button onClick={onDownload} disabled={downloading}
                    className="p-1.5 rounded hover:bg-zinc-700 text-zinc-500 hover:text-zinc-300 transition-colors disabled:opacity-40">
                    {downloading ? <Loader2 size={12} className="animate-spin" /> : <Download size={12} />}
                </button>
            </div>
        </div>
    );
}
