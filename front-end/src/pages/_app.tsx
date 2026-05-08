import type { AppProps } from 'next/app';
import Head from 'next/head';
import { QueryClientProvider, useQuery } from '@tanstack/react-query';
import { Inter } from 'next/font/google';
import { Toaster, toast } from 'sonner';
import { useRouter } from 'next/router';
import { useEffect } from 'react';

import '../globals.css';
import { queryClient, apiFetch } from '../utils';
import { UserProvider } from '../components/layout/Layout';
import { useAuth, AuthProvider } from '../hooks/useAuth';
import { NangoConnectProvider } from '../hooks/useNangoConnect';

const BROKEN_WARNED_KEY = 'nango_broken_warned';

function getWarnedIds(): Set<string> {
    try {
        return new Set(JSON.parse(localStorage.getItem(BROKEN_WARNED_KEY) ?? '[]'));
    } catch {
        return new Set();
    }
}

function setWarnedIds(ids: Set<string>) {
    localStorage.setItem(BROKEN_WARNED_KEY, JSON.stringify([...ids]));
}

function BrokenConnectionWatcher() {
    const { data: connections } = useQuery({
        queryKey: ['connections'],
        queryFn: async () => {
            const res = await apiFetch(`/connections`);
            if (!res.ok) return [];
            return (await res.json()).connections as { providerConfigKey: string; connectionId: string; broken: boolean }[];
        },
        refetchInterval: 5000
    });

    useEffect(() => {
        if (!connections) return;
        const warned = getWarnedIds();
        let changed = false;

        for (const conn of connections) {
            if (conn.broken && !warned.has(conn.connectionId)) {
                warned.add(conn.connectionId);
                changed = true;
                const provider = conn.providerConfigKey
                    .replace(/-/g, ' ')
                    .replace(/\b\w/g, (c) => c.toUpperCase());
                toast.warning(`${provider} needs re-authentication`, {
                    description: 'Token refresh failed — go to the Connect page to reconnect.',
                    duration: 12000,
                    id: `auth-broken-${conn.connectionId}`
                });
            }
            // Once fixed, remove from storage so a future break warns again
            if (!conn.broken && warned.has(conn.connectionId)) {
                warned.delete(conn.connectionId);
                changed = true;
            }
        }

        if (changed) setWarnedIds(warned);
    }, [connections]);

    return null;
}

const inter = Inter({ subsets: ['latin'], variable: '--font-inter' });

const PUBLIC_ROUTES = ['/login', '/register'];

function AuthGate({ children }: { children: React.ReactNode }) {
    const { isAuthenticated, loading } = useAuth();
    const router = useRouter();

    useEffect(() => {
        if (!loading && !isAuthenticated && !PUBLIC_ROUTES.includes(router.pathname)) {
            router.replace('/login');
        }
    }, [loading, isAuthenticated, router]);

    if (loading) {
        return (
            <div className="min-h-screen bg-zinc-950 flex items-center justify-center">
                <div className="w-6 h-6 border-2 border-indigo-500/30 border-t-indigo-500 rounded-full animate-spin" />
            </div>
        );
    }

    if (!isAuthenticated && !PUBLIC_ROUTES.includes(router.pathname)) {
        return null;
    }

    return <>{children}</>;
}

export default function MyApp({ Component, pageProps }: AppProps) {
    return (
        <div className={`${inter.variable} font-sans`}>
            <Head>
                <title key="title">Nango Showcase</title>
                <meta name="description" content="Interactive showcase of Nango's integration capabilities" />
                <link rel="icon" type="image/svg+xml" href="/favicon.svg" />
            </Head>
            <QueryClientProvider client={queryClient}>
                <AuthProvider>
                    <AuthGate>
                        <UserProvider>
                            <NangoConnectProvider>
                                <BrokenConnectionWatcher />
                                <Component {...pageProps} />
                            </NangoConnectProvider>
                        </UserProvider>
                    </AuthGate>
                </AuthProvider>
                <Toaster
                    theme="dark"
                    position="bottom-right"
                    toastOptions={{
                        style: {
                            background: '#18181b',
                            border: '1px solid #3f3f46',
                            color: '#f4f4f5'
                        }
                    }}
                />
            </QueryClientProvider>
        </div>
    );
}
