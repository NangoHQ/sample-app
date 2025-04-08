import React, { useEffect, useState } from 'react';
import { api } from '../api';

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
  const [files, setFiles] = useState<File[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchFiles = async () => {
      try {
        const response = await api.get(`/google-drive/files/${connectionId}`);
        setFiles(response.data.files);
      } catch (err) {
        setError('Failed to load files');
        console.error('Error loading files:', err);
      } finally {
        setLoading(false);
      }
    };

    fetchFiles();
  }, [connectionId]);

  const handleDownload = async (fileId: string) => {
    try {
      window.location.href = `/api/google-drive/files/${connectionId}/${fileId}/download`;
    } catch (err) {
      console.error('Error downloading file:', err);
    }
  };

  if (loading) {
    return <div>Loading files...</div>;
  }

  if (error) {
    return <div className="text-red-500">{error}</div>;
  }

  if (files.length === 0) {
    return <div>No files found. Use the Google Drive picker to select files to sync.</div>;
  }

  return (
    <div className="space-y-4">
      <h2 className="text-xl font-semibold">Your Google Drive Files</h2>
      <div className="grid grid-cols-1 gap-4">
        {files.map((file) => (
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