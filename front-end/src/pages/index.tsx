import { useQuery } from '@tanstack/react-query';
import { useMemo } from 'react';
import Link from 'next/link';
import Spinner from '../components/Spinner';
import { listConnections, listIntegrations } from '../api';
import type { Integration } from '../types';

export default function IndexPage() {
    const { data: resIntegrations } = useQuery({
        queryKey: ['integrations'],
        queryFn: listIntegrations
    });
    const { data: resConnections } = useQuery({
        queryKey: ['connections'],
        queryFn: listConnections
    });

    const integrations = useMemo<Integration[] | undefined>(() => {
        if (!resIntegrations || !resConnections) {
            return;
        }

        return resIntegrations.integrations.map((integration) => {
            return {
                ...integration,
                connected:
                    resConnections.connections.find((connection) => {
                        return connection.provider_config_key === integration.unique_key;
                    }) !== undefined
            };
        });
    }, [resIntegrations, resConnections]);

    if (!integrations) {
        return (
            <main className="p-4 md:p-10 mx-auto max-w-7xl">
                <Spinner size={2} />
            </main>
        );
    }

    return (
        <div className="min-h-screen flex flex-col">
            <header className="px-10 py-5 border-b">
                <h1 className="text-2xl font-bold">Welcome to MySaaS</h1>
            </header>
            <div className="flex-1 px-10 py-10 overflow-auto">
                <div className="flex justify-center">
                    <div className="flex flex-col gap-8 w-[540px]">
                        <div className="rounded shadow-2xl px-16 py-10">
                            <h2 className="text-center text-2xl mb-8 font-semibold">Quick Links</h2>
                            <div className="flex flex-col gap-4">
                                <Link href="/files" className="flex items-center gap-4 p-4 rounded-lg hover:bg-gray-50 transition-colors">
                                    <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 16 17" fill="none">
                                        <path
                                            d="M5.71604 3.87408V9.47104C5.71604 10.0168 5.27543 10.4594 4.72368 10.4594C4.17589 10.4594 3.73131 10.0079 3.73131 9.47203V3.88797L1.91924 5.70103C1.82724 5.79384 1.7178 5.86755 1.5972 5.91791C1.47661 5.96827 1.34725 5.9943 1.21656 5.99448C1.08588 5.99466 0.956445 5.96901 0.83571 5.91899C0.714976 5.86897 0.605322 5.79557 0.513058 5.70301C0.420054 5.61111 0.346251 5.50162 0.295941 5.38093C0.245631 5.26024 0.219818 5.13076 0.220002 5C0.220187 4.86925 0.246366 4.73983 0.297017 4.61929C0.347668 4.49874 0.42178 4.38947 0.515043 4.29782L4.02108 0.792778C4.11407 0.699148 4.22482 0.625026 4.34683 0.574756C4.46884 0.524486 4.59966 0.499081 4.73161 0.500029C4.98864 0.498045 5.24566 0.596289 5.44314 0.792778L8.9462 4.29782C9.34315 4.69477 9.33719 5.31599 8.94918 5.70301C8.85693 5.79542 8.74734 5.86869 8.6267 5.91862C8.50605 5.96856 8.37674 5.99417 8.24617 5.99398C8.1156 5.9938 7.98636 5.96782 7.86585 5.91755C7.74535 5.86728 7.63597 5.79369 7.54399 5.70103L5.71803 3.87507L5.71604 3.87408Z"
                                            fill="#A3ACB9"
                                        />
                                        <path
                                            d="M12.2508 13.1249V7.52795C12.2508 7.39786 12.2251 7.26905 12.1752 7.14893C12.1252 7.02881 12.052 6.91974 11.9598 6.82798C11.8676 6.73623 11.7582 6.6636 11.6378 6.61427C11.5174 6.56494 11.3885 6.53989 11.2584 6.54054C10.7106 6.54054 10.2661 6.99207 10.2661 7.52795V13.111L8.45399 11.2989C8.362 11.2063 8.25262 11.1327 8.13212 11.0824C8.01162 11.0322 7.88237 11.0062 7.7518 11.006C7.62124 11.0058 7.49192 11.0314 7.37127 11.0813C7.25063 11.1313 7.14104 11.2046 7.04879 11.297C6.95579 11.3889 6.88199 11.4984 6.83168 11.619C6.78137 11.7397 6.75555 11.8692 6.75574 12C6.75592 12.1307 6.7821 12.2601 6.83275 12.3807C6.8834 12.5012 6.95752 12.6105 7.05078 12.7022L10.5548 16.2062C10.7513 16.4037 11.0093 16.5009 11.2654 16.4999C11.3976 16.5008 11.5286 16.4753 11.6508 16.4249C11.773 16.3744 11.8838 16.3001 11.9769 16.2062L15.4809 12.7022C15.8779 12.3052 15.8709 11.684 15.4829 11.297C15.3907 11.2046 15.2811 11.1313 15.1604 11.0813C15.0398 11.0314 14.9105 11.0058 14.7799 11.006C14.6494 11.0062 14.5201 11.0322 14.3996 11.0824C14.2791 11.1327 14.1697 11.2063 14.0777 11.2989L12.2518 13.1249H12.2508Z"
                                            fill="#4F566B"
                                        />
                                    </svg>
                                    <div>
                                        <h3 className="text-lg font-semibold">Files</h3>
                                        <p className="text-gray-600">Access and manage your files</p>
                                    </div>
                                </Link>
                                <Link href="/team-settings" className="flex items-center gap-4 p-4 rounded-lg hover:bg-gray-50 transition-colors">
                                    <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 16 17" fill="none">
                                        <path
                                            fillRule="evenodd"
                                            clipRule="evenodd"
                                            d="M14.197 7.517C13.967 7.517 12.59 7.517 12.017 6.822C12.017 6.707 11.902 6.707 11.902 6.591C11.787 5.781 12.82 4.74 12.934 4.624C13.164 4.393 13.164 4.045 13.049 3.93C12.934 3.814 12.475 3.351 12.361 3.12C12.246 2.888 11.901 3.004 11.672 3.236C11.442 3.466 10.525 4.393 9.722 4.276C9.607 4.276 9.607 4.161 9.492 4.161C8.803 3.698 8.803 2.31 8.803 2.079C8.803 1.731 8.689 1.5 8.459 1.5H7.311C7.082 1.5 6.967 1.731 6.967 2.079C6.967 2.309 6.967 3.699 6.279 4.277C6.164 4.277 6.164 4.393 6.049 4.393C5.246 4.393 4.328 3.467 4.099 3.236C3.869 3.004 3.525 3.004 3.409 3.12C3.295 3.351 2.836 3.814 2.607 3.93C2.492 4.045 2.492 4.393 2.721 4.624C2.951 4.855 3.869 5.781 3.754 6.591C3.754 6.707 3.639 6.707 3.639 6.822C3.18 7.517 1.803 7.517 1.574 7.517C1.23 7.517 1 7.632 1 7.864V8.905C1 9.136 1.23 9.368 1.574 9.368C1.804 9.368 3.18 9.368 3.754 10.062C3.754 10.178 3.869 10.178 3.869 10.293C3.984 11.103 2.951 12.145 2.836 12.26C2.606 12.492 2.606 12.839 2.721 12.955C2.836 13.07 3.295 13.533 3.41 13.765C3.525 13.88 3.869 13.88 4.098 13.649C4.328 13.417 5.246 12.492 6.049 12.607C6.164 12.607 6.164 12.723 6.279 12.723C6.967 13.302 6.967 14.574 6.967 14.921C6.967 15.153 7.197 15.5 7.427 15.5H8.459C8.689 15.5 8.918 15.269 8.918 14.921C8.918 14.691 8.918 13.301 9.607 12.723C9.721 12.723 9.721 12.607 9.837 12.607C10.639 12.492 11.672 13.533 11.787 13.649C12.017 13.88 12.361 13.88 12.475 13.764L13.279 12.954C13.393 12.839 13.393 12.492 13.164 12.26C12.934 12.029 12.016 11.103 12.131 10.293C12.131 10.178 12.246 10.178 12.246 10.062C12.82 9.368 14.082 9.368 14.426 9.368C14.656 9.368 15 9.136 15 8.905V7.864C14.77 7.632 14.541 7.517 14.197 7.517ZM7.885 10.987C6.508 10.987 5.361 9.831 5.361 8.442C5.361 7.054 6.508 5.897 7.885 5.897C9.262 5.897 10.41 7.054 10.41 8.442C10.41 9.831 9.262 10.988 7.885 10.988V10.987Z"
                                            fill="#4F566B"
                                        />
                                    </svg>
                                    <div>
                                        <h3 className="text-lg font-semibold">Team Settings</h3>
                                        <p className="text-gray-600">Manage your team and integrations</p>
                                    </div>
                                </Link>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}
