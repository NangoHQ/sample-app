import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Terminal, Send, ChevronDown, Loader2, Code } from 'lucide-react';
import { toast } from 'sonner';
import { Layout, useUser } from '../components/layout/Layout';
import { Badge } from '../components/ui/Badge';
import { apiFetch } from '../utils';
import { cn } from '../utils';

const HTTP_METHODS = ['GET', 'POST', 'PUT', 'PATCH', 'DELETE'] as const;
type HttpMethod = typeof HTTP_METHODS[number];

const METHOD_COLORS: Record<HttpMethod, string> = {
    GET: 'text-emerald-400',
    POST: 'text-blue-400',
    PUT: 'text-yellow-400',
    PATCH: 'text-orange-400',
    DELETE: 'text-red-400'
};

export default function DeveloperPage() {
    const { user } = useUser();

    return (
        <Layout
            title="Developer Console"
            description="Send raw API requests through Nango's proxy — no need to handle OAuth tokens yourself"
        >
            <div className="flex-1 overflow-y-auto">
                <ProxyBuilder userId={user.id} />
            </div>
        </Layout>
    );
}

function ProxyBuilder({ userId }: { userId: string }) {
    const [provider, setProvider] = useState('');
    const [method, setMethod] = useState<HttpMethod>('GET');
    const [endpoint, setEndpoint] = useState('');
    const [body, setBody] = useState('');
    const [loading, setLoading] = useState(false);
    const [response, setResponse] = useState<any>(null);

    const { data: connections } = useQuery({
        queryKey: ['connections'],
        queryFn: async () => {
            const res = await apiFetch(`/connections`);
            if (!res.ok) return [];
            return (await res.json()).connections as { providerConfigKey: string }[];
        }
    });

    const connectedProviders = connections?.map((c) => c.providerConfigKey) ?? [];

    const sendRequest = async () => {
        if (!provider || !endpoint) return;
        setLoading(true);
        setResponse(null);
        const startTime = Date.now();
        try {
            let parsedBody;
            if (body.trim()) {
                try {
                    parsedBody = JSON.parse(body);
                } catch {
                    toast.error('Invalid JSON body');
                    return;
                }
            }

            const res = await apiFetch(`/proxy`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ providerConfigKey: provider, method, endpoint, data: parsedBody, userId })
            });
            const data = await res.json();
            setResponse({ ...data, _meta: { elapsed: Date.now() - startTime, status: data.status } });
            if (!res.ok) toast.error('Request failed', { description: data.error });
        } catch (err: any) {
            toast.error('Request failed', { description: err?.message });
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="p-6 max-w-5xl">
            <div className="rounded-xl border border-zinc-800/60 bg-zinc-900/40 overflow-hidden">
                {/* Request builder */}
                <div className="p-5 space-y-4">
                    <p className="text-zinc-500 text-xs">
                        Send raw API requests through <strong className="text-zinc-300">Nango's proxy</strong> — no need to handle OAuth tokens yourself.
                        Nango injects the valid access token and handles refresh automatically.
                    </p>

                    <div className="flex gap-2">
                        {/* Provider picker */}
                        <div className="relative">
                            <select
                                value={provider}
                                onChange={(e) => setProvider(e.target.value)}
                                className="appearance-none bg-zinc-800/60 border border-zinc-700/60 rounded-lg px-3 py-2 text-zinc-200 text-sm focus:outline-none pr-7 cursor-pointer min-w-[160px]"
                            >
                                <option value="">Provider...</option>
                                {connectedProviders.map((p) => (
                                    <option key={p} value={p}>{p}</option>
                                ))}
                            </select>
                            <ChevronDown size={12} className="absolute right-2 top-1/2 -translate-y-1/2 text-zinc-500 pointer-events-none" />
                        </div>

                        {/* Method picker */}
                        <div className="relative">
                            <select
                                value={method}
                                onChange={(e) => setMethod(e.target.value as HttpMethod)}
                                className={cn(
                                    'appearance-none bg-zinc-800/60 border border-zinc-700/60 rounded-lg px-3 py-2 text-sm font-mono font-bold focus:outline-none pr-7 cursor-pointer',
                                    METHOD_COLORS[method]
                                )}
                            >
                                {HTTP_METHODS.map((m) => (
                                    <option key={m} value={m} className="text-zinc-200 font-normal">{m}</option>
                                ))}
                            </select>
                            <ChevronDown size={12} className="absolute right-2 top-1/2 -translate-y-1/2 text-zinc-500 pointer-events-none" />
                        </div>

                        {/* Endpoint input */}
                        <input
                            value={endpoint}
                            onChange={(e) => setEndpoint(e.target.value)}
                            placeholder="/api/endpoint or https://..."
                            className="flex-1 bg-zinc-800/60 border border-zinc-700/60 rounded-lg px-3 py-2 text-zinc-200 text-sm font-mono placeholder-zinc-600 focus:outline-none focus:border-zinc-600"
                        />

                        {/* Send button */}
                        <button
                            onClick={sendRequest}
                            disabled={!provider || !endpoint || loading}
                            className="flex items-center gap-1.5 px-4 py-2 rounded-lg bg-indigo-600 hover:bg-indigo-500 disabled:opacity-40 disabled:cursor-not-allowed text-white text-sm font-medium transition-all"
                        >
                            {loading ? <Loader2 size={14} className="animate-spin" /> : <Send size={14} />}
                            Send
                        </button>
                    </div>

                    {/* Body editor (shown for non-GET methods) */}
                    {method !== 'GET' && method !== 'DELETE' && (
                        <div>
                            <label className="text-zinc-500 text-[11px] block mb-1.5">Request Body (JSON)</label>
                            <textarea
                                value={body}
                                onChange={(e) => setBody(e.target.value)}
                                placeholder='{"key": "value"}'
                                rows={4}
                                className="w-full bg-zinc-800/60 border border-zinc-700/60 rounded-lg px-3 py-2 text-zinc-300 text-xs font-mono placeholder-zinc-700 focus:outline-none focus:border-zinc-600 resize-none"
                            />
                        </div>
                    )}
                </div>

                {/* Response panel */}
                {(loading || response) && (
                    <div className="border-t border-zinc-800/60 bg-zinc-950/60">
                        <div className="flex items-center gap-3 px-5 py-3 border-b border-zinc-800/40">
                            <span className="text-zinc-500 text-xs font-medium">Response</span>
                            {response?._meta && (
                                <>
                                    <Badge
                                        variant={response._meta.status < 400 ? 'green' : 'red'}
                                        size="xs"
                                    >
                                        {response._meta.status}
                                    </Badge>
                                    <span className="text-zinc-600 text-[11px]">{response._meta.elapsed}ms</span>
                                </>
                            )}
                        </div>
                        {loading ? (
                            <div className="flex items-center gap-2 text-zinc-500 text-sm px-5 py-6">
                                <Loader2 size={14} className="animate-spin" /> Sending request through Nango proxy...
                            </div>
                        ) : (
                            <pre className="px-5 py-4 text-xs font-mono text-zinc-300 overflow-x-auto max-h-80">
                                {JSON.stringify(response?.data ?? response, null, 2)}
                            </pre>
                        )}
                    </div>
                )}

                {/* How it works */}
                {!response && !loading && (
                    <div className="border-t border-zinc-800/60 px-5 py-4">
                        <div className="flex items-start gap-2">
                            <Code size={13} className="text-zinc-600 mt-0.5 shrink-0" />
                            <pre className="text-[11px] font-mono text-zinc-600 overflow-x-auto">
{`// Equivalent backend code
await nango.proxy({
  method: '${method}',
  providerConfigKey: '${provider || 'provider-id'}',
  connectionId: connectionId,
  endpoint: '${endpoint || '/api/endpoint'}'
});
// Nango injects the OAuth token automatically`}
                            </pre>
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
}

function TabBtn({ children, active, onClick }: { children: any; active: boolean; onClick: () => void }) {
    return (
        <button
            onClick={onClick}
            className={cn(
                'flex items-center gap-2 px-4 py-2.5 text-sm font-medium border-b-2 transition-all -mb-px',
                active
                    ? 'text-zinc-100 border-indigo-500'
                    : 'text-zinc-500 border-transparent hover:text-zinc-300'
            )}
        >
            {children}
        </button>
    );
}
