import React, { useEffect, useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import Spinner from '../Spinner';
import { getNangoCredentials, setConnectionMetadata } from '../../api';

declare global {
    interface Window {
        google: any;
        gapi: any;
    }
}

interface Props {
    connectionId: string;
    onFilesSelected?: () => void;
}

export function GoogleDrivePicker({ connectionId, onFilesSelected }: Props) {
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const queryClient = useQueryClient();

    const { data: resConnection } = useQuery({
        queryKey: ['connection', connectionId],
        queryFn: async () => {
            const credentials = await getNangoCredentials('google-drive');
            return credentials.credentials;
        }
    });

    const accessToken = resConnection?.access_token;
    const expiresAt = resConnection?.expires_at;
    const appId = process.env.NEXT_PUBLIC_GOOGLE_APP_ID;

    useEffect(() => {
        if (expiresAt) {
            const expiryTime = new Date(expiresAt).getTime();
            const currentTime = new Date().getTime();
            const timeUntilExpiry = expiryTime - currentTime;

            if (timeUntilExpiry <= 0) {
                void queryClient.invalidateQueries({
                    queryKey: ['connection', connectionId]
                });
            } else {
                const timeoutId = setTimeout(() => {
                    void queryClient.invalidateQueries({
                        queryKey: ['connection', connectionId]
                    });
                }, timeUntilExpiry - 60000); // Refresh 1 minute before expiry

                return () => {
                    clearTimeout(timeoutId);
                };
            }
        }
    }, [expiresAt, connectionId, queryClient]);

    useEffect(() => {
        const script = document.createElement('script');
        script.src = 'https://apis.google.com/js/api.js';
        script.onload = () => {
            window.gapi.load('picker', () => {
                console.log('Picker API loaded');
            });
        };
        document.body.appendChild(script);
    }, []);

    const openPicker = async () => {
        if (!accessToken) {
            setError('No access token available');
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

        const sharedWithMeView = new window.google.picker.DocsView()
            .setIncludeFolders(true)
            .setSelectFolderEnabled(true)
            .setOwnedByMe(false)
            .setLabel('Shared with Me')
            .setMode(window.google.picker.DocsViewMode.LIST);

        try {
            const picker = new window.google.picker.PickerBuilder()
                .addView(myDriveView)
                .addView(sharedWithMeView)
                .enableFeature(window.google.picker.Feature.SUPPORT_FOLDER_SELECT)
                .enableFeature(window.google.picker.Feature.MULTISELECT_ENABLED)
                .enableFeature(window.google.picker.Feature.SUPPORT_DRIVES)
                // this can be found by going to the google console > IAM > Settings > "Project Number"
                .setAppId(appId)
                .setOAuthToken(accessToken)
                .setCallback(async (data: any) => {
                    if (data.action === window.google.picker.Action.PICKED) {
                        const files = data.docs.filter((doc: any) => doc.type !== 'folder').map((doc: any) => doc.id);
                        const folders = data.docs.filter((doc: any) => doc.type === 'folder').map((doc: any) => doc.id);

                        const metadata = { files, folders };
                        await setConnectionMetadata('google-drive', metadata);

                        onFilesSelected?.();
                    }
                })
                .build();

            picker.setVisible(true);
        } catch (err) {
            console.error('Error opening picker:', err);
            setError('Failed to open picker');
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="space-y-4">
            <button
                onClick={openPicker}
                disabled={loading || !accessToken}
                className="w-full inline-flex items-center justify-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed"
            >
                {loading ? (
                    <>
                        <Spinner size={1} className="mr-2" />
                        Opening Google Drive Picker...
                    </>
                ) : (
                    <>
                        <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
                        </svg>
                        Select Files from Google Drive
                    </>
                )}
            </button>
            {error && (
                <div className="rounded-md bg-red-50 p-4">
                    <div className="flex">
                        <div className="flex-shrink-0">
                            <svg className="h-5 w-5 text-red-400" viewBox="0 0 20 20" fill="currentColor">
                                <path
                                    fillRule="evenodd"
                                    d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z"
                                    clipRule="evenodd"
                                />
                            </svg>
                        </div>
                        <div className="ml-3">
                            <h3 className="text-sm font-medium text-red-800">Error</h3>
                            <div className="mt-2 text-sm text-red-700">{error}</div>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
