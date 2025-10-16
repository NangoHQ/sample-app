import React, { useRef, useState, useEffect } from 'react';
import { setConnectionMetadata, getNangoCredentials } from '../../api';
import Spinner from '../Spinner';

interface Props {
    provider: 'one-drive' | 'one-drive-personal';
    onFilesSelected: (files: any[]) => void;
}

export function OneDrivePicker({ provider, onFilesSelected }: Props) {
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [authToken, setAuthToken] = useState<string | null>(null);
    const [baseUrl, setBaseUrl] = useState<string | null>(null);
    const pickerWindowRef = useRef<Window | null>(null);
    const portRef = useRef<MessagePort | null>(null);

    useEffect(() => {
        const fetchAuthToken = async () => {
            try {
                const credentials = await getNangoCredentials(provider);
                
                if (provider === 'one-drive-personal') {
                    setAuthToken(credentials.credentials.access_token);
                    setBaseUrl('https://onedrive.live.com/picker');
                } else {
                    setAuthToken(credentials.connection_config.sharepointAccessToken.access_token);
                    setBaseUrl(credentials.sharepointBaseUrl);
                }
            } catch (error) {
                console.error('Error fetching OneDrive credentials:', error);
                setError('Failed to get access token');
            }
        };
        fetchAuthToken();
    }, [provider]);

    const combine = (...paths: string[]) =>
        paths
            .map((path) => path.replace(/^[\\/|]/, '').replace(/[\\/|]$/, ''))
            .join('/')
            .replace(/\\/g, '/');

    const openPicker = async () => {
        if (!authToken || !baseUrl) {
            setError('No access token or base URL available');
            return;
        }

        try {
            setLoading(true);
            setError(null);
            const params = {
                sdk: '8.0',
                entry: {
                    oneDrive: {
                        files: {}
                    }
                },
                authentication: {},
                messaging: {
                    origin: window.location.origin,
                    channelId: '27'
                },
                selection: {
                    mode: 'multiple'
                },
                search: { enabled: true },
                typesAndSources: {
                    mode: 'files',
                    pivots: {
                        oneDrive: true,
                        recent: true
                    }
                }
            };

            const queryString = new URLSearchParams({
                filePicker: JSON.stringify(params)
            });

            const url = provider === 'one-drive-personal'
                ? combine(baseUrl, `?${queryString}`)
                : combine(baseUrl, `_layouts/15/FilePicker.aspx?${queryString}`);

            const win = window.open('', 'OneDrivePicker', 'width=800,height=600');
            if (!win) {
                throw new Error('Failed to open picker window. Please allow popups.');
            }

            pickerWindowRef.current = win;

            const handlePortMessage = async (message: MessageEvent) => {
                switch (message.data.type) {
                    case 'notification':
                        console.log('OneDrive notification:', message.data);
                        break;

                    case 'command':
                        const port = portRef.current;
                        if (!port) return;

                        setTimeout(() => {
                            port.postMessage({
                                type: 'acknowledge',
                                id: message.data.id
                            });
                        }, 50);

                        const command = message.data.data;

                        switch (command.command) {
                            case 'authenticate':
                                try {
                                    if (authToken) {
                                        port.postMessage({
                                            type: 'result',
                                            id: message.data.id,
                                            data: { result: 'token', token: authToken }
                                        });
                                    }
                                } catch (error) {
                                    console.error('Error re-authenticating:', error);
                                }
                                break;

                            case 'close':
                                win.close();
                                pickerWindowRef.current = null;
                                portRef.current = null;
                                break;

                            case 'pick':
                                console.log('OneDrive picked response:', command);

                                const pickedItems = command.items || command.files || [];

                                if (Array.isArray(pickedItems) && pickedItems.length > 0) {
                                    let metadata;

                                    if (provider === 'one-drive-personal') {
                                        const fileIds = pickedItems.map((item: any) => item.id);
                                        metadata = { fileIds };
                                    } else {
                                        const driveGroups: Record<string, string[]> = {};

                                        pickedItems.forEach((item: any) => {
                                            const driveId = item.parentReference?.driveId || item.driveId || 'default';
                                            if (!driveGroups[driveId]) {
                                                driveGroups[driveId] = [];
                                            }
                                            driveGroups[driveId].push(item.id);
                                        });

                                        const drives = Object.keys(driveGroups);
                                        const pickedFiles = Object.entries(driveGroups).map(([driveId, fileIds]) => ({
                                            driveId,
                                            fileIds
                                        }));

                                        metadata = { drives, pickedFiles };
                                    }

                                    await setConnectionMetadata(provider, metadata);

                                    const processedFiles = pickedItems.map((item: any) => ({
                                        id: item.id || item.name,
                                        name: item.name,
                                        url: item.webUrl || item['@sharePoint.embedUrl'] || item.webDavUrl,
                                        size: item.size,
                                        lastModified: item.lastModifiedDateTime,
                                        mimeType: item.file?.mimeType || 'application/octet-stream',
                                        provider: 'onedrive',
                                        site: item.sharepointIds?.siteUrl || item.parentReference?.sharepointIds?.siteUrl,
                                        listId: item.sharepointIds?.listId,
                                        listItemId: item.sharepointIds?.listItemId,
                                        driveId: item.parentReference?.driveId
                                    }));

                                    console.log('Processed OneDrive selected files:', processedFiles);
                                    onFilesSelected(processedFiles);
                                }

                                port.postMessage({
                                    type: 'result',
                                    id: message.data.id,
                                    data: { result: 'success' }
                                });
                                win.close();
                                pickerWindowRef.current = null;
                                portRef.current = null;
                                break;
                            default:
                                console.warn('Unsupported command:', command.command);
                                port.postMessage({
                                    result: 'error',
                                    error: {
                                        code: 'unsupportedCommand',
                                        message: command.command
                                    },
                                    isExpected: true
                                });
                        }
                        break;
                }
            };

            const messageListener = (event: MessageEvent) => {
                if (event.source === win && event.data?.type === 'initialize') {
                    if (event.data.channelId === params.messaging.channelId) {
                        const messagePort = event.ports[0];
                        portRef.current = messagePort;

                        messagePort.addEventListener('message', handlePortMessage);
                        messagePort.start();

                        messagePort.postMessage({ type: 'activate' });
                    }
                }
            };

            window.addEventListener('message', messageListener);

            const form = document.createElement('form');
            form.setAttribute('action', url);
            form.setAttribute('method', 'POST');
            form.setAttribute('target', 'OneDrivePicker');
            form.style.display = 'none';
            document.body.appendChild(form);

            const input = document.createElement('input');
            input.type = 'hidden';
            input.name = 'access_token';
            input.value = authToken;
            form.appendChild(input);
            form.submit();
            document.body.removeChild(form);

            const cleanup = () => {
                window.removeEventListener('message', messageListener);
                const port = portRef.current;
                if (port) port.removeEventListener('message', handlePortMessage);
                setLoading(false);
            };

            const checkClosed = setInterval(() => {
                if (win.closed) {
                    cleanup();
                    clearInterval(checkClosed);
                }
            }, 1000);
        } catch (error) {
            console.error('Error opening OneDrive picker:', error);
            setError(error instanceof Error ? error.message : 'Failed to open OneDrive picker');
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
        <div className="space-y-4">
            <button
                onClick={openPicker}
                disabled={loading}
                className="w-full inline-flex items-center justify-center px-4 py-2 text-sm font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:opacity-50"
            >
                {loading ? (
                    <>
                        <Spinner size={1} className="mr-2" /> Opening OneDrive Picker...
                    </>
                ) : (
                    <>
                        <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
                        </svg>
                        Select Files from OneDrive
                    </>
                )}
            </button>

            {error && (
                <div className="rounded-md bg-red-50 p-4">
                    <h3 className="text-sm font-medium text-red-800">Error</h3>
                    <p className="mt-2 text-sm text-red-700">{error}</p>
                </div>
            )}
        </div>
    );
}
