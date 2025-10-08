import type React from 'react';
import type { ProviderConfig } from '../types';
import Spinner from './Spinner';

interface ProviderCardProps {
    provider: ProviderConfig;
    connected: boolean;
    loading?: boolean;
    comingSoon?: boolean;
    onConnect?: () => void;
    onDisconnect?: () => void;
    onSelectFiles?: () => void;
    children?: React.ReactNode;
}

export function ProviderCard({
    provider,
    connected,
    loading = false,
    comingSoon = false,
    onConnect,
    onDisconnect,
    onSelectFiles,
    children
}: ProviderCardProps) {
    return (
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6 hover:shadow-md transition-shadow">
            {/* Logo */}
            <div className="flex justify-center mb-4">
                <img src={provider.logo} alt={`${provider.display_name} logo`} className="h-12 w-12" />
            </div>

            {/* Name */}
            <h3 className="text-lg font-semibold text-gray-900 text-center mb-2">{provider.display_name}</h3>

            {/* Status */}
            <div className="text-center mb-4">
                {comingSoon ? (
                    <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-gray-100 text-gray-800">Coming Soon</span>
                ) : connected ? (
                    <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800">Connected</span>
                ) : (
                    <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-gray-100 text-gray-800">Not connected</span>
                )}
            </div>

            {/* Actions */}
            <div className="space-y-2">
                {comingSoon ? (
                    <button disabled className="w-full bg-gray-100 text-gray-400 py-2 px-4 rounded-md text-sm font-medium cursor-not-allowed">
                        Coming Soon
                    </button>
                ) : connected ? (
                    <>
                        {children}
                        {onSelectFiles && (
                            <button
                                onClick={onSelectFiles}
                                className="w-full bg-gray-900 text-white py-2 px-4 rounded-md text-sm font-medium hover:bg-gray-800 transition-colors"
                            >
                                Select Files
                            </button>
                        )}
                        {onDisconnect && (
                            <button
                                onClick={onDisconnect}
                                className="w-full bg-red-600 text-white py-2 px-4 rounded-md text-sm font-medium hover:bg-red-700 transition-colors"
                            >
                                Disconnect
                            </button>
                        )}
                    </>
                ) : (
                    <button
                        onClick={onConnect}
                        disabled={loading}
                        className="w-full bg-blue-600 text-white py-2 px-4 rounded-md text-sm font-medium hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                        {loading ? (
                            <div className="flex items-center justify-center">
                                <Spinner size={1} className="mr-2" />
                                Connecting...
                            </div>
                        ) : (
                            'Connect'
                        )}
                    </button>
                )}
            </div>
        </div>
    );
}
