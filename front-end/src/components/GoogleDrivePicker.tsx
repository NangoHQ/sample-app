import React, { useEffect, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
// import { baseUrl } from '../utils';
import Spinner from './Spinner';
import { apiUrl } from '../utils';

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

  const { data: resConnection } = useQuery({
    queryKey: ['connection', connectionId],
    queryFn: async () => {
      console.log("Running query")
      const response = await fetch(`${apiUrl}/connection/${connectionId}`);
      if (!response.ok) {
        throw new Error('Failed to get connection');
      }
      return response.json();
    },
  });

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
    if (!resConnection?.access_token) {
      setError('No access token available');
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const picker = new window.google.picker.PickerBuilder()
        .addView(window.google.picker.ViewId.DOCS)
        .setOAuthToken(resConnection.access_token)
        .setCallback(async (data: any) => {
          if (data.action === window.google.picker.Action.PICKED) {
            const files: PickerFile[] = data.docs.map((doc: any) => ({
              id: doc.id,
              name: doc.name,
            }));

            // Set the metadata for the connection
            const metadataResponse = await fetch(
              `${apiUrl}/google-drive/metadata/${connectionId}`,
              {
                method: 'POST',
                headers: {
                  'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                  integration: 'google-drive',
                  selectedFiles: files,
                }),
              }
            );

            if (!metadataResponse.ok) {
              throw new Error('Failed to set metadata');
            }

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