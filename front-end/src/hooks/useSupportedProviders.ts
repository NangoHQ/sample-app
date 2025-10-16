import { useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { listIntegrations } from '../api';
import { SUPPORTED_PROVIDERS } from '../utils';
import type { ProviderConfig } from '../types';

export function useSupportedProviders() {
    const {
        data: integrations,
        isLoading,
        error
    } = useQuery({
        queryKey: ['integrations'],
        queryFn: listIntegrations
    });

    const supportedProviders = useMemo<ProviderConfig[]>(() => {
        if (!integrations?.integrations || !Array.isArray(integrations.integrations)) {
            return [];
        }

        return integrations.integrations
            .filter((integration) => SUPPORTED_PROVIDERS.includes(integration.unique_key))
            .map((integration) => ({
                unique_key: integration.unique_key,
                display_name: (integration as any).display_name || integration.unique_key,
                logo: (integration as any).logo || '',
                supported: true
            }))
            .sort((a, b) => {
                const aIndex = SUPPORTED_PROVIDERS.indexOf(a.unique_key);
                const bIndex = SUPPORTED_PROVIDERS.indexOf(b.unique_key);
                return aIndex - bIndex;
            });
    }, [integrations]);

    const getProviderByKey = (key: string): ProviderConfig | undefined => {
        return supportedProviders.find((provider) => provider.unique_key === key);
    };

    return {
        supportedProviders,
        getProviderByKey,
        isLoading,
        error
    };
}
