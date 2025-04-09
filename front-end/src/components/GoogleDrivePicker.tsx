import React, { useEffect, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
// import { baseUrl } from '../utils';
import Spinner from './Spinner';
import { apiUrl } from '../utils';
import { getNangoCredentials, setConnectionMetadata } from '../api';
import { useQueryClient } from '@tanstack/react-query';

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
      console.log("Running query");
      const credentials = await getNangoCredentials('google-drive');
      return credentials.credentials;
    },
  });

  const accessToken = resConnection?.credentials?.access_token;
  const expiresAt = resConnection?.credentials?.expires_at;
  console.log("Access token", accessToken);
  console.log("Expires at", expiresAt);

  useEffect(() => {
    if (expiresAt) {
      const expiryTime = new Date(expiresAt).getTime();
      const currentTime = new Date().getTime();
      const timeUntilExpiry = expiryTime - currentTime;

      if (timeUntilExpiry <= 0) {
        // Token has expired, refresh it
        void queryClient.invalidateQueries({ queryKey: ['connection', connectionId] });
      } else {
        // Set a timeout to refresh the token before it expires
        const timeoutId = setTimeout(() => {
          void queryClient.invalidateQueries({ queryKey: ['connection', connectionId] });
        }, timeUntilExpiry - 60000); // Refresh 1 minute before expiry

        return () => clearTimeout(timeoutId);
      }
    }
  }, [expiresAt, connectionId, queryClient]);

  useEffect(() => {
    // Load the Google Drive picker
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

    try {
      const picker = new window.google.picker.PickerBuilder()
        .addView(window.google.picker.ViewId.DOCS)
        .addView(window.google.picker.ViewId.FOLDERS)
        .setOAuthToken(accessToken)
        .setCallback(async (data: any) => {
          if (data.action === window.google.picker.Action.PICKED) {
            const files = data.docs.filter((doc: any) => doc.type !== 'folder').map((doc: any) => doc.id);
            const folders = data.docs.filter((doc: any) => doc.type === 'folder').map((doc: any) => doc.id);

            // Prepare metadata for the connection
            const metadata = { files, folders };

            // Set the metadata for the connection
            await setConnectionMetadata('google-drive', metadata);

            // Notify parent component that files were selected
            if (onFilesSelected) {
              onFilesSelected();
            }
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
    <div>
      <button
        onClick={openPicker}
        disabled={loading}
        className="px-4 py-2 text-white bg-blue-600 rounded hover:bg-blue-700 flex items-center space-x-2"
      >
        <span>Select Files from Google Drive</span>
        {loading && <Spinner size={1} className="text-white" />}
      </button>
      {error && <div className="mt-2 text-sm text-red-500">{error}</div>}
    </div>
  );
} 