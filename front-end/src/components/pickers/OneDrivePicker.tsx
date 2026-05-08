import { useRef, useState, useEffect } from 'react';
import { FolderSearch, Loader2 } from 'lucide-react';
import { apiFetch } from '../../utils';

interface Props {
    provider: 'one-drive' | 'one-drive-personal';
    userId: string;
    onFilesSelected: (files: any[]) => void;
}

export function OneDrivePicker({ provider, userId, onFilesSelected }: Props) {
    const [loading, setLoading] = useState(false);
    const [fetching, setFetching] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [authToken, setAuthToken] = useState<string | null>(null);
    const [pickerBaseUrl, setPickerBaseUrl] = useState<string | null>(null);
    const pickerWindowRef = useRef<Window | null>(null);
    const portRef = useRef<MessagePort | null>(null);

    useEffect(() => {
        const fetchToken = async () => {
            setFetching(true);
            setAuthToken(null);
            setPickerBaseUrl(null);
            setError(null);
            try {
                const res = await apiFetch(`/nango-credentials?integrationId=${provider}`);
                if (!res.ok) throw new Error('Failed to get credentials');
                const data = await res.json();

                if (provider === 'one-drive-personal') {
                    setAuthToken(data.credentials?.access_token);
                    setPickerBaseUrl('https://onedrive.live.com/picker');
                } else {
                    setAuthToken(data.connection_config?.sharepointAccessToken?.access_token);
                    setPickerBaseUrl(data.sharepointBaseUrl);
                }
            } catch (err) {
                console.error('Error fetching OneDrive credentials:', err);
                setError('Failed to get access token');
            } finally {
                setFetching(false);
            }
        };
        fetchToken();
    }, [provider, userId]);

    const combine = (...paths: string[]) =>
        paths
            .map((p) => p.replace(/^[\\/|]/, '').replace(/[\\/|]$/, ''))
            .join('/')
            .replace(/\\/g, '/');

    const openPicker = async () => {
        if (!authToken || !pickerBaseUrl) {
            setError('No access token available — try refreshing');
            return;
        }

        try {
            setLoading(true);
            setError(null);

            const params = {
                sdk: '8.0',
                entry: { oneDrive: { files: {} } },
                authentication: {},
                messaging: { origin: window.location.origin, channelId: '27' },
                selection: { mode: 'multiple' },
                search: { enabled: true },
                typesAndSources: {
                    mode: 'files',
                    pivots: { oneDrive: true, recent: true }
                }
            };

            const queryString = new URLSearchParams({ filePicker: JSON.stringify(params) });
            const url =
                provider === 'one-drive-personal'
                    ? `${pickerBaseUrl}?${queryString}`
                    : combine(pickerBaseUrl, `_layouts/15/FilePicker.aspx?${queryString}`);

            const win = window.open('', 'OneDrivePicker', 'width=800,height=600');
            if (!win) throw new Error('Failed to open picker window — please allow popups.');
            pickerWindowRef.current = win;

            const handlePortMessage = async (message: MessageEvent) => {
                switch (message.data.type) {
                    case 'notification':
                        break;
                    case 'command': {
                        const port = portRef.current;
                        if (!port) return;
                        setTimeout(() => port.postMessage({ type: 'acknowledge', id: message.data.id }), 50);

                        const command = message.data.data;
                        switch (command.command) {
                            case 'authenticate':
                                port.postMessage({ type: 'result', id: message.data.id, data: { result: 'token', token: authToken } });
                                break;
                            case 'close':
                                win.close();
                                pickerWindowRef.current = null;
                                portRef.current = null;
                                setLoading(false);
                                break;
                            case 'pick': {
                                const pickedItems = command.items || command.files || [];
                                if (Array.isArray(pickedItems) && pickedItems.length > 0) {
                                    let metadata: Record<string, any>;
                                    if (provider === 'one-drive-personal') {
                                        metadata = { fileIds: pickedItems.map((item: any) => item.id) };
                                    } else {
                                        const driveGroups: Record<string, string[]> = {};
                                        pickedItems.forEach((item: any) => {
                                            const driveId = item.parentReference?.driveId || item.driveId || 'default';
                                            if (!driveGroups[driveId]) driveGroups[driveId] = [];
                                            driveGroups[driveId].push(item.id);
                                        });
                                        metadata = {
                                            drives: Object.keys(driveGroups),
                                            pickedFiles: Object.entries(driveGroups).map(([driveId, fileIds]) => ({ driveId, fileIds }))
                                        };
                                    }

                                    await apiFetch(`/set-connection-metadata`, {
                                        method: 'POST',
                                        headers: { 'Content-Type': 'application/json' },
                                        body: JSON.stringify({ integrationId: provider, metadata, userId })
                                    });

                                    const processed = pickedItems.map((item: any) => ({
                                        id: item.id || item.name,
                                        name: item.name,
                                        url: item.webUrl || item['@sharePoint.embedUrl'] || item.webDavUrl,
                                        size: item.size,
                                        mimeType: item.file?.mimeType || 'application/octet-stream'
                                    }));
                                    onFilesSelected(processed);
                                }
                                port.postMessage({ type: 'result', id: message.data.id, data: { result: 'success' } });
                                win.close();
                                pickerWindowRef.current = null;
                                portRef.current = null;
                                setLoading(false);
                                break;
                            }
                            default:
                                port.postMessage({ result: 'error', error: { code: 'unsupportedCommand', message: command.command }, isExpected: true });
                        }
                        break;
                    }
                }
            };

            const messageListener = (event: MessageEvent) => {
                if (event.source === win && event.data?.type === 'initialize' && event.data.channelId === params.messaging.channelId) {
                    const port = event.ports[0];
                    portRef.current = port;
                    port.addEventListener('message', handlePortMessage);
                    port.start();
                    port.postMessage({ type: 'activate' });
                }
            };

            window.addEventListener('message', messageListener);

            const form = document.createElement('form');
            form.setAttribute('action', url);
            form.setAttribute('method', 'POST');
            form.setAttribute('target', 'OneDrivePicker');
            form.style.display = 'none';
            const input = document.createElement('input');
            input.type = 'hidden';
            input.name = 'access_token';
            input.value = authToken;
            form.appendChild(input);
            document.body.appendChild(form);
            form.submit();
            document.body.removeChild(form);

            const checkClosed = setInterval(() => {
                if (win.closed) {
                    window.removeEventListener('message', messageListener);
                    const port = portRef.current;
                    if (port) port.removeEventListener('message', handlePortMessage);
                    setLoading(false);
                    clearInterval(checkClosed);
                }
            }, 1000);
        } catch (err) {
            console.error('Error opening OneDrive picker:', err);
            setError(err instanceof Error ? err.message : 'Failed to open OneDrive picker');
            setLoading(false);
        }
    };

    useEffect(() => {
        return () => {
            const win = pickerWindowRef.current;
            if (win && !win.closed) win.close();
        };
    }, []);

    return (
        <div className="space-y-3">
            <button
                onClick={openPicker}
                disabled={loading || fetching}
                className="flex items-center gap-2 px-4 py-2 rounded-lg bg-indigo-600 hover:bg-indigo-500 text-white text-sm font-medium transition-all disabled:opacity-50 disabled:cursor-not-allowed"
            >
                {fetching ? (
                    <><Loader2 size={14} className="animate-spin" /> Loading...</>
                ) : loading ? (
                    <><Loader2 size={14} className="animate-spin" /> Opening picker...</>
                ) : (
                    <><FolderSearch size={14} /> Select files</>
                )}
            </button>

            {error && <p className="text-red-400 text-xs">{error}</p>}
        </div>
    );
}
