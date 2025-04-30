import React, { useEffect, useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import Spinner from './Spinner';
import { getNangoCredentials, setConnectionMetadata } from '../api';

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

interface PickerFile {
  id: string;
  name: string;
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
    },
  });

  const accessToken = resConnection?.credentials?.access_token;
  const expiresAt = resConnection?.credentials?.expires_at;

  useEffect(() => {
    if (expiresAt) {
      const expiryTime = new Date(expiresAt).getTime();
      const currentTime = new Date().getTime();
      const timeUntilExpiry = expiryTime - currentTime;

      if (timeUntilExpiry <= 0) {
        void queryClient.invalidateQueries({ queryKey: ['connection', connectionId] });
      } else {
        const timeoutId = setTimeout(() => {
          void queryClient.invalidateQueries({ queryKey: ['connection', connectionId] });
        }, timeUntilExpiry - 60000); // Refresh 1 minute before expiry

        return () => clearTimeout(timeoutId);
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
    <div className="flex justify-center items-center">
      <button
        onClick={openPicker}
        disabled={loading}
        className="relative transition-colors inline-flex w-full items-center justify-center gap-x-3 py-3 text-sm font-semibold rounded-md bg-black text-white hover:bg-gray-900"
      >
        <span>Select Files from Google Drive</span>
        {loading && <Spinner size={1} className="text-white" />}
      </button>
      {error && <div className="mt-2 text-sm text-red-500">{error}</div>}
    </div>
  );
}
