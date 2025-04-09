import React, { useEffect, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { apiUrl, baseUrl, queryClient } from '../utils';
import Spinner from './Spinner';

interface File {
  id: string;
  name: string;
  mimeType: string;
  webViewLink: string;
  iconLink: string;
  size?: number;
  modifiedTime: string;
}

interface Props {
  connectionId: string;
}

export function GoogleDriveFiles({ connectionId }: Props) {
  const { data: resFiles, isLoading } = useQuery({
    queryKey: ['google-drive-files', connectionId],
    queryFn: async () => {
      const response = await fetch(`${apiUrl}/google-drive/files/${connectionId}`);
      if (!response.ok) {
        throw new Error('Failed to load files');
      }
      return response.json();
    },
  });

  useEffect(() => {
    const interval = setInterval(
      () => {
        void queryClient.refetchQueries({ queryKey: ['google-drive-files', connectionId] });
      },
      resFiles?.files?.length > 0 ? 10000 : 1000
    );

    return () => {
      if (interval) {
        clearInterval(interval);
      }
    };
  }, [resFiles, connectionId]);

  const handleDownload = async (fileId: string) => {
    // 
    try {
      window.location.href = `${apiUrl}/google-drive/files/${connectionId}/${fileId}/download`;
    } catch (err) {
      console.error('Error downloading file:', err);
    }
  };

  if (isLoading || !resFiles?.files) {
    return (
      <div className="w-full flex justify-center">
        <Spinner size={1} />
      </div>
    );
  }

  if (resFiles.files.length === 0) {
    return <div className="mt-8 text-center h-20">No files found. Use the Google Drive picker to select files to sync.</div>;
  }

  return (
    <div className="space-y-4">
      <h2 className="text-xl font-semibold">Your Google Drive Files</h2>
      <div className="grid grid-cols-1 gap-4">
        {resFiles.files.map((file: File) => (
          <div
            key={file.id}
            className="flex items-center justify-between p-4 bg-white rounded-lg shadow"
          >
            <div className="flex items-center space-x-4">
              <img src={file.iconLink} alt="" className="w-6 h-6" />
              <div>
                <h3 className="font-medium">{file.name}</h3>
                <p className="text-sm text-gray-500">
                  Last modified: {new Date(file.modifiedTime).toLocaleDateString()}
                </p>
              </div>
            </div>
            <div className="flex space-x-2">
              <a
                href={file.webViewLink}
                target="_blank"
                rel="noopener noreferrer"
                className="px-3 py-1 text-sm text-blue-600 hover:text-blue-800"
              >
                View
              </a>
              <button
                onClick={() => handleDownload(file.id)}
                className="px-3 py-1 text-sm text-white bg-blue-600 rounded hover:bg-blue-700"
              >
                Download
              </button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
} 