import React, { useState, useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { getFiles, downloadFile } from '../api';
import { useSupportedProviders } from '../hooks/useSupportedProviders';
import type { File } from '../types';
import Spinner from './Spinner';

interface UnifiedFileManagerProps {
    connections: any[];
}

export function UnifiedFileManager({ connections }: UnifiedFileManagerProps) {
    const [selectedProvider, setSelectedProvider] = useState<string>('all');
    const [searchQuery, setSearchQuery] = useState<string>('');

    const { getProviderByKey } = useSupportedProviders();

    const { data: resFiles, isLoading } = useQuery({
        queryKey: ['unified-files', selectedProvider],
        queryFn: async () => {
            const result = await getFiles();
            return result;
        }
    });

    const filteredFiles = useMemo(() => {
        if (!resFiles) return [];

        let filtered = resFiles;

        if (selectedProvider !== 'all') {
            filtered = filtered.filter((file) => {
                const connection = connections.find((conn) => conn.connection_id === file.connectionId);
                return connection?.provider_config_key === selectedProvider;
            });
        }

        if (searchQuery.trim()) {
            const query = searchQuery.toLowerCase().trim();
            filtered = filtered.filter((file) => file.title.toLowerCase().includes(query) || file.mimeType.toLowerCase().includes(query));
        }

        return filtered;
    }, [resFiles, selectedProvider, searchQuery, connections]);

    const availableProviders = useMemo(() => {
        const providers = connections.map((conn: any) => {
            const providerInfo = getProviderByKey(conn.provider_config_key);
            return {
                key: conn.provider_config_key,
                name: providerInfo?.display_name || conn.provider_config_key,
                logo: providerInfo?.logo || ''
            };
        });

        return [{ key: 'all', name: 'All Providers', logo: '' }, ...providers];
    }, [connections, getProviderByKey]);

    const getFileType = (mimeType: string) => {
        if (mimeType.includes('pdf')) return 'PDF';
        if (mimeType.includes('text')) return 'Text';
        if (mimeType.includes('image')) return 'Image';
        if (mimeType.includes('video')) return 'Video';
        if (mimeType.includes('audio')) return 'Audio';
        if (mimeType.includes('spreadsheet')) return 'Spreadsheet';
        if (mimeType.includes('presentation')) return 'Presentation';
        if (mimeType.includes('document')) return 'Document';
        if (mimeType.includes('folder')) return 'Folder';
        return 'File';
    };

    const getProviderInfo = (file: File) => {
        const connection = connections.find((conn) => conn.connection_id === file.connectionId);
        const provider = availableProviders.find((p) => p.key === connection?.provider_config_key);
        return provider || { key: 'unknown', name: 'Unknown', logo: '' };
    };

    const handleDownload = async (file: File) => {
        try {
            const blob = await downloadFile(file.id);
            const url = window.URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = file.title;
            document.body.appendChild(a);
            a.click();
            a.remove();
            window.URL.revokeObjectURL(url);
        } catch (err) {
            console.error('Error downloading file:', err);
        }
    };

    if (isLoading) {
        return (
            <div className="w-full flex justify-center py-8">
                <Spinner size={2} />
            </div>
        );
    }

    return (
        <div className="space-y-6">
            <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-4">
                <div>
                    <h2 className="text-xl font-semibold text-gray-900">All Files</h2>
                    <p className="text-sm text-gray-500">
                        {filteredFiles.length} files from{' '}
                        {selectedProvider === 'all' ? 'all providers' : availableProviders.find((p: any) => p.key === selectedProvider)?.name}
                        {searchQuery && ` matching "${searchQuery}"`}
                    </p>
                </div>

                <div className="flex flex-col sm:flex-row items-start sm:items-center gap-3">
                    <div className="flex items-center space-x-2">
                        <label className="text-sm font-medium text-gray-700">Search:</label>
                        <div className="relative">
                            <input
                                type="text"
                                placeholder="Search files..."
                                value={searchQuery}
                                onChange={(e) => {
                                    setSearchQuery(e.target.value);
                                }}
                                className="px-3 py-2 pr-8 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 w-48"
                            />
                            {searchQuery && (
                                <button
                                    onClick={() => {
                                        setSearchQuery('');
                                    }}
                                    className="absolute right-2 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-gray-600"
                                >
                                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                                    </svg>
                                </button>
                            )}
                        </div>
                    </div>

                    <div className="flex items-center space-x-2">
                        <label className="text-sm font-medium text-gray-700">Provider:</label>
                        <select
                            value={selectedProvider}
                            onChange={(e) => {
                                setSelectedProvider(e.target.value);
                            }}
                            className="px-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                        >
                            {availableProviders.map((provider: any) => (
                                <option key={provider.key} value={provider.key}>
                                    {provider.name}
                                </option>
                            ))}
                        </select>
                    </div>
                </div>
            </div>

            <div className="bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden">
                <div className="overflow-x-auto">
                    <table className="min-w-full divide-y divide-gray-200">
                        <thead className="bg-gray-50 sticky top-0">
                            <tr>
                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Name</th>
                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Provider</th>
                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Modified</th>
                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Type</th>
                                <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">Actions</th>
                            </tr>
                        </thead>
                        <tbody className="bg-white divide-y divide-gray-200">
                            {filteredFiles.map((file: File) => {
                                const providerInfo = getProviderInfo(file);
                                return (
                                    <tr key={`${file.id}-${file.connectionId}`} className="hover:bg-gray-50">
                                        <td className="px-6 py-4 whitespace-nowrap">
                                            <div className="flex items-center">
                                                <img src={file.iconLink} alt="" className="w-5 h-5 mr-3" />
                                                <div className="text-sm font-medium text-gray-900 truncate max-w-xs">{file.title}</div>
                                            </div>
                                        </td>
                                        <td className="px-6 py-4 whitespace-nowrap">
                                            <div className="flex items-center">
                                                {providerInfo.logo && <img src={providerInfo.logo} alt="" className="w-5 h-5 mr-2" />}
                                                <span className="text-sm text-gray-900">{providerInfo.name}</span>
                                            </div>
                                        </td>
                                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{new Date(file.updatedAt).toLocaleDateString()}</td>
                                        <td className="px-6 py-4 whitespace-nowrap">
                                            <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
                                                {getFileType(file.mimeType)}
                                            </span>
                                        </td>
                                        <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                                            <div className="flex justify-end space-x-2">
                                                <a
                                                    href={file.url}
                                                    target="_blank"
                                                    rel="noopener noreferrer"
                                                    className="text-blue-600 hover:text-blue-900 text-xs"
                                                >
                                                    View
                                                </a>
                                                <button onClick={() => handleDownload(file)} className="text-blue-600 hover:text-blue-900 text-xs">
                                                    Download
                                                </button>
                                            </div>
                                        </td>
                                    </tr>
                                );
                            })}
                        </tbody>
                    </table>

                    {filteredFiles.length === 0 && !isLoading && (
                        <div className="text-center py-8 text-gray-500">No files found. Connect to a provider and select files to sync.</div>
                    )}
                </div>
            </div>
        </div>
    );
}
