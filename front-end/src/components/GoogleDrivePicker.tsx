import React, { useEffect } from 'react';
import { api } from '../api';

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
    try {
      const response = await api.get(`/api/connections/${connectionId}`);
      const accessToken = response.data.access_token;

      const picker = new window.google.picker.PickerBuilder()
        .addView(window.google.picker.ViewId.DOCS)
        .setOAuthToken(accessToken)
        .setCallback(async (data: any) => {
          if (data.action === window.google.picker.Action.PICKED) {
            const files = data.docs.map((doc: any) => ({
              id: doc.id,
              name: doc.name,
            }));

            await api.post(`/api/google-drive/metadata/${connectionId}`, {
              selectedFiles: files,
            });

            if (onFilesSelected) {
              onFilesSelected();
            }
          }
        })
        .build();

      picker.setVisible(true);
    } catch (error) {
      console.error('Error opening picker:', error);
    }
  };

  return (
    <button
      onClick={openPicker}
      className="px-4 py-2 text-white bg-blue-600 rounded hover:bg-blue-700"
    >
      Select Files from Google Drive
    </button>
  );
} 