import { ProviderLogo } from './ProviderLogo';

export function NangoLogo({
    integrationId,
    className = 'w-5 h-5',
    fallback
}: {
    integrationId: string;
    className?: string;
    fallback?: string;
}) {
    return <ProviderLogo integrationId={integrationId} className={className} />;
}
