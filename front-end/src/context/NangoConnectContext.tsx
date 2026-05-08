import { createContext, useContext, useState, useCallback, type ReactNode } from 'react';
import Nango from '@nangohq/frontend';
import { toast } from 'sonner';
import { useQueryClient } from '@tanstack/react-query';
import { motion, AnimatePresence } from 'framer-motion';
import { apiFetch, apiUrl } from '../utils';
import { nangoToast } from '../components/nangoToast';
import { ConnectFlowPanel } from '../components/ConnectFlowPanel';

export interface FlowStep {
    id: string;
    label: string;
    sublabel: string;
    code: string;
    docsUrl: string;
    docsLabel: string;
    status: 'pending' | 'active' | 'done' | 'error';
}

const FLOW_STEPS = (providerConfigKey: string, useConnectUI: boolean): FlowStep[] => [
    {
        id: 'session',
        label: 'Session token created',
        sublabel: 'Your backend calls Nango to create a short-lived token scoped to this user',
        code: 'await nango.createConnectSession({ end_user: { id } })',
        docsUrl: 'https://nango.dev/docs/reference/api/connect/sessions/create',
        docsLabel: 'Connect sessions →',
        status: 'pending'
    },
    {
        id: 'oauth',
        label: 'OAuth window opened',
        sublabel: useConnectUI
            ? `Nango hosts the ${providerConfigKey} OAuth flow — zero custom OAuth code on your end`
            : `nango.auth() opens the ${providerConfigKey} OAuth window directly — no hosted UI needed`,
        code: useConnectUI
            ? `nango.openConnectUI({ onEvent: (e) => { ... } })`
            : `await nango.auth('${providerConfigKey}')`,
        docsUrl: useConnectUI
            ? 'https://nango.dev/docs/reference/sdks/frontend#connect-using-nango-connect-ui'
            : 'https://nango.dev/docs/reference/sdks/frontend#connect-without-nango-connect-ui',
        docsLabel: 'Implement auth →',
        status: 'pending'
    },
    {
        id: 'authed',
        label: 'User authenticated',
        sublabel: 'OAuth code exchanged for access + refresh token by Nango — your app never sees credentials',
        code: `onEvent({ type: 'connect', payload: { connectionId } })`,
        docsUrl: 'https://nango.dev/docs/implementation-guides/platform/auth/implement-api-auth',
        docsLabel: 'Auth flow →',
        status: 'pending'
    },
    {
        id: 'saved',
        label: 'Connection saved',
        sublabel: 'Nango fires an auth webhook to your backend confirming the connection',
        code: `// POST /webhooks-from-nango\n{ type: 'auth', operation: 'creation' }`,
        docsUrl: 'https://nango.dev/docs/implementation-guides/platform/webhooks-from-nango',
        docsLabel: 'Auth webhooks →',
        status: 'pending'
    },
    {
        id: 'stored',
        label: 'Token stored by Nango',
        sublabel: 'Encrypted at rest, auto-refreshed before every API call — forever',
        code: `await nango.getConnection('${providerConfigKey}', connectionId)`,
        docsUrl: 'https://nango.dev/docs/implementation-guides/platform/auth/token-refreshing',
        docsLabel: 'Token refreshing →',
        status: 'pending'
    }
];

const RECONNECT_FLOW_STEPS = (providerConfigKey: string): FlowStep[] => [
    {
        id: 'session',
        label: 'Reconnect session created',
        sublabel: 'Backend calls Nango to create a session token scoped to the existing connection',
        code: `nango.createReconnectSession({ connection_id, integration_id: '${providerConfigKey}' })`,
        docsUrl: 'https://nango.dev/docs/reference/api/connect/sessions/reconnect',
        docsLabel: 'Reconnect sessions →',
        status: 'pending'
    },
    {
        id: 'oauth',
        label: 'Re-auth window opened',
        sublabel: `nango.auth() opens the ${providerConfigKey} window to issue fresh credentials for the existing connection`,
        code: `await nango.auth('${providerConfigKey}')`,
        docsUrl: 'https://nango.dev/docs/reference/sdks/frontend#connect-without-nango-connect-ui',
        docsLabel: 'nango.auth() →',
        status: 'pending'
    },
    {
        id: 'authed',
        label: 'User re-authenticated',
        sublabel: 'New OAuth tokens issued — Nango exchanges the code, your app never sees credentials',
        code: `// result = await nango.auth('${providerConfigKey}')\nresult.connectionId`,
        docsUrl: 'https://nango.dev/docs/implementation-guides/platform/auth/implement-api-auth',
        docsLabel: 'Auth flow →',
        status: 'pending'
    },
    {
        id: 'saved',
        label: 'Connection updated',
        sublabel: 'Nango fires an auth webhook confirming the existing connection was refreshed',
        code: `// POST /webhooks-from-nango\n{ type: 'auth', operation: 'override' }`,
        docsUrl: 'https://nango.dev/docs/implementation-guides/platform/webhooks-from-nango',
        docsLabel: 'Auth webhooks →',
        status: 'pending'
    },
    {
        id: 'stored',
        label: 'Token refreshed',
        sublabel: 'Re-encrypted and ready — auto-refreshed before every future API call',
        code: `await nango.getConnection('${providerConfigKey}', connectionId)`,
        docsUrl: 'https://nango.dev/docs/implementation-guides/platform/auth/token-refreshing',
        docsLabel: 'Token refreshing →',
        status: 'pending'
    }
];

interface ConnectOptions {
    userId?: string;
    providerConfigKey: string;
    onSuccess?: (connectionId: string) => void;
    /** Use Nango Connect UI (hosted provider picker). Default: false — uses nango.auth() directly. */
    useConnectUI?: boolean;
}

interface NangoConnectContextValue {
    connect: (opts: ConnectOptions) => Promise<void>;
    reconnect: (opts: ConnectOptions) => Promise<void>;
    disconnect: (providerConfigKey: string) => Promise<void>;
    connecting: string | null;
    reconnecting: string | null;
    flowSteps: FlowStep[];
    flowProvider: string | null;
    clearFlow: () => void;
}

const NangoConnectContext = createContext<NangoConnectContextValue | null>(null);

export function NangoConnectProvider({ children }: { children: ReactNode }) {
    const queryClient = useQueryClient();
    const [connecting, setConnecting] = useState<string | null>(null);
    const [reconnecting, setReconnecting] = useState<string | null>(null);
    const [flowSteps, setFlowSteps] = useState<FlowStep[]>([]);
    const [flowProvider, setFlowProvider] = useState<string | null>(null);

    const setStep = useCallback((steps: FlowStep[], id: string, status: FlowStep['status']): FlowStep[] => {
        return steps.map((s) => s.id === id ? { ...s, status } : s);
    }, []);

    const advanceStepsAfterAuth = useCallback((
        steps: FlowStep[],
        connectionId: string,
        providerConfigKey: string,
        onSuccess?: (id: string) => void
    ) => {
        let s = setStep(steps, 'oauth', 'done');
        s = setStep(s, 'authed', 'active');
        setFlowSteps([...s]);

        setTimeout(() => {
            s = setStep(s, 'authed', 'done');
            s = setStep(s, 'stored', 'active');
            setFlowSteps([...s]);
        }, 400);

        setTimeout(() => {
            s = setStep(s, 'stored', 'done');
            s = setStep(s, 'saved', 'active');
            setFlowSteps([...s]);
        }, 900);

        apiFetch(`/connections`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ providerConfigKey, connectionId })
        })
            .catch(() => {})
            .finally(() => {
                setTimeout(() => {
                    s = setStep(s, 'saved', 'done');
                    setFlowSteps([...s]);
                    onSuccess?.(connectionId);
                    nangoToast.connected(providerConfigKey, connectionId);
                }, 1400);
            });
    }, [setStep]);

    const connect = useCallback(async ({ providerConfigKey, onSuccess, useConnectUI = false }: ConnectOptions) => {
        setConnecting(providerConfigKey);
        setFlowProvider(providerConfigKey);
        let steps = FLOW_STEPS(providerConfigKey, useConnectUI);
        setFlowSteps(steps);

        try {
            // Step 1: session token
            steps = setStep(steps, 'session', 'active');
            setFlowSteps([...steps]);

            const res = await apiFetch(`/connect-session`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ integration: providerConfigKey })
            });
            if (!res.ok) throw new Error('Failed to create connect session');
            const { token } = await res.json();

            steps = setStep(steps, 'session', 'done');
            steps = setStep(steps, 'oauth', 'active');
            setFlowSteps([...steps]);

            const nango = new Nango({ connectSessionToken: token, host: apiUrl });

            if (useConnectUI) {
                // Connect page: use the Nango-hosted provider picker UI
                await new Promise<void>((resolve, reject) => {
                    nango.openConnectUI({
                        onEvent: (event: any) => {
                            if (event.type === 'close') {
                                resolve();
                            } else if (event.type === 'connect') {
                                advanceStepsAfterAuth(steps, event.payload?.connectionId, providerConfigKey, onSuccess);
                                resolve();
                            } else if (event.type === 'error') {
                                reject(new Error(event.payload?.message || 'Connection failed'));
                            }
                        }
                    });
                });
            } else {
                // All other pages: open the OAuth window directly via nango.auth()
                const authOptions = (providerConfigKey === 'one-drive' || providerConfigKey === 'one-drive-personal')
                    ? { authorization_params: { prompt: 'select_account' } }
                    : {};
                const result = await nango.auth(providerConfigKey, authOptions);
                advanceStepsAfterAuth(steps, result.connectionId, providerConfigKey, onSuccess);
            }
        } catch (err: any) {
            setFlowSteps((prev) => prev.map((s) =>
                s.status === 'active' ? { ...s, status: 'error' } : s
            ));
            if (err?.message !== 'window_closed' && err?.type !== 'window_closed') {
                toast.error(`Failed to connect`, { description: err?.message });
            }
        } finally {
            setConnecting(null);
        }
    }, [setStep, advanceStepsAfterAuth]);

    const reconnect = useCallback(async ({ providerConfigKey, onSuccess }: ConnectOptions) => {
        setReconnecting(providerConfigKey);
        setFlowProvider(providerConfigKey);
        let steps = RECONNECT_FLOW_STEPS(providerConfigKey);
        setFlowSteps(steps);

        try {
            // Step 1: reconnect session token
            steps = setStep(steps, 'session', 'active');
            setFlowSteps([...steps]);

            const res = await apiFetch(`/reconnect-session`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ integration: providerConfigKey })
            });
            if (!res.ok) throw new Error('Failed to create reconnect session');
            const { token } = await res.json();

            steps = setStep(steps, 'session', 'done');
            steps = setStep(steps, 'oauth', 'active');
            setFlowSteps([...steps]);

            // Step 2: re-auth via nango.auth()
            const nango = new Nango({ connectSessionToken: token, host: apiUrl });
            const authOptions = (providerConfigKey === 'one-drive' || providerConfigKey === 'one-drive-personal')
                ? { authorization_params: { prompt: 'select_account' } }
                : {};
            const result = await nango.auth(providerConfigKey, authOptions);

            // Steps 3 → 4 → 5 fire in sequence
            steps = setStep(steps, 'oauth', 'done');
            steps = setStep(steps, 'authed', 'active');
            setFlowSteps([...steps]);

            setTimeout(() => {
                steps = setStep(steps, 'authed', 'done');
                steps = setStep(steps, 'saved', 'active');
                setFlowSteps([...steps]);
            }, 400);

            setTimeout(() => {
                steps = setStep(steps, 'saved', 'done');
                steps = setStep(steps, 'stored', 'active');
                setFlowSteps([...steps]);
            }, 900);

            setTimeout(() => {
                steps = setStep(steps, 'stored', 'done');
                setFlowSteps([...steps]);
                nangoToast.connected(providerConfigKey, result.connectionId);
                onSuccess?.(result.connectionId);
            }, 1400);

            // Optimistically clear broken state immediately
            queryClient.setQueriesData<{ providerConfigKey: string; connectionId: string; broken: boolean }[]>(
                { queryKey: ['connections'] },
                (old) => old?.map((c) => c.providerConfigKey === providerConfigKey ? { ...c, broken: false } : c)
            );
            await queryClient.invalidateQueries({ queryKey: ['connections'] });
        } catch (err: any) {
            setFlowSteps((prev) => prev.map((s) =>
                s.status === 'active' ? { ...s, status: 'error' } : s
            ));
            if (err?.type !== 'window_closed') {
                toast.error(`Failed to reconnect`, { description: err?.message });
            }
        } finally {
            setReconnecting(null);
        }
    }, [queryClient, setStep]);

    const disconnect = useCallback(async (providerConfigKey: string) => {
        try {
            const res = await apiFetch(`/connections?integration=${providerConfigKey}`, {
                method: 'DELETE'
            });
            if (!res.ok) throw new Error('Failed to disconnect');
            await queryClient.invalidateQueries({ queryKey: ['webhook-events'] });
            nangoToast.disconnected(providerConfigKey);
            // Clear flow panel if it was for this provider
            setFlowProvider((prev) => prev === providerConfigKey ? null : prev);
        } catch (err: any) {
            toast.error('Failed to disconnect', { description: err?.message });
        }
    }, [queryClient]);

    const clearFlow = useCallback(() => {
        setFlowProvider(null);
        setFlowSteps([]);
    }, []);

    return (
        <NangoConnectContext.Provider value={{ connect, reconnect, disconnect, connecting, reconnecting, flowSteps, flowProvider, clearFlow }}>
            {children}

            {/* Global connect flow panel — appears on any page when connect() is called */}
            <AnimatePresence>
                {flowProvider && flowSteps.length > 0 && (
                    <motion.div
                        initial={{ opacity: 0, x: 40 }}
                        animate={{ opacity: 1, x: 0 }}
                        exit={{ opacity: 0, x: 40 }}
                        transition={{ type: 'spring', stiffness: 300, damping: 30 }}
                        className="fixed bottom-6 right-6 z-50 w-[380px]"
                    >
                        <ConnectFlowPanel
                            provider={flowProvider}
                            steps={flowSteps}
                            onClose={clearFlow}
                        />
                    </motion.div>
                )}
            </AnimatePresence>
        </NangoConnectContext.Provider>
    );
}

export function useNangoConnect() {
    const ctx = useContext(NangoConnectContext);
    if (!ctx) throw new Error('useNangoConnect must be used within NangoConnectProvider');
    return ctx;
}
