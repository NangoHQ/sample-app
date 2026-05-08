import { useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { motion, AnimatePresence } from 'framer-motion';
import { Zap, Trash2, ChevronDown, ChevronRight } from 'lucide-react';
import { Layout } from '../components/layout/Layout';
import { useSSE } from '../hooks/useSSE';
import { Badge } from '../components/ui/Badge';
import { apiFetch } from '../utils';
import { cn } from '../utils';
import type { WebhookEvent } from '../hooks/useSSE';

const TYPE_COLORS = {
    auth: { badge: 'blue' as const, dot: 'bg-blue-400', label: 'Auth' },
    sync: { badge: 'purple' as const, dot: 'bg-purple-400', label: 'Sync' },
    forward: { badge: 'orange' as const, dot: 'bg-orange-400', label: 'Forward' }
};

export default function WebhooksPage() {
    const [filter, setFilter] = useState<'all' | 'auth' | 'sync' | 'forward'>('all');
    const [expandedId, setExpandedId] = useState<string | null>(null);
    const { events: liveEvents, connected, clear } = useSSE({ maxEvents: 200 });
    const queryClient = useQueryClient();

    const clearAll = () => {
        clear();
        queryClient.setQueryData(['webhook-events'], []);
    };

    // Load historical events on mount
    const { data: history } = useQuery({
        queryKey: ['webhook-events'],
        queryFn: async () => {
            const res = await apiFetch(`/webhook-events?limit=50`);
            if (!res.ok) return [];
            const data = await res.json();
            return data.events as WebhookEvent[];
        },
        staleTime: Infinity // only fetch once
    });

    // Merge live + history, dedupe by id
    const allEvents = (() => {
        const seen = new Set<string>();
        const merged: WebhookEvent[] = [];
        for (const e of [...liveEvents, ...(history ?? [])]) {
            if (!seen.has(e.id)) {
                seen.add(e.id);
                merged.push(e);
            }
        }
        return merged.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());
    })();

    const filtered = filter === 'all' ? allEvents : allEvents.filter((e) => e.type === filter);

    const authCount = allEvents.filter((e) => e.type === 'auth').length;
    const syncCount = allEvents.filter((e) => e.type === 'sync').length;
    const forwardCount = allEvents.filter((e) => e.type === 'forward').length;

    return (
        <Layout
            title="Live Webhooks"
            description="Real-time event stream from Nango — auth, sync, and forward webhooks"
            actions={
                <div className="flex items-center gap-2">
                    {/* SSE connection status */}
                    <div className={cn(
                        'flex items-center gap-1.5 text-xs px-2.5 py-1 rounded-full border',
                        connected
                            ? 'border-emerald-500/30 bg-emerald-500/10 text-emerald-400'
                            : 'border-zinc-700 bg-zinc-800/60 text-zinc-500'
                    )}>
                        <div className={cn('w-1.5 h-1.5 rounded-full', connected ? 'bg-emerald-400 animate-pulse' : 'bg-zinc-500')} />
                        {connected ? 'Connected' : 'Disconnected'}
                    </div>
                    <button
                        onClick={clearAll}
                        className="flex items-center gap-1.5 text-xs text-zinc-500 hover:text-zinc-300 px-2.5 py-1 rounded-lg hover:bg-zinc-800 border border-zinc-800/60 transition-all"
                    >
                        <Trash2 size={12} /> Clear
                    </button>
                </div>
            }
        >
            <div className="flex flex-col h-full">
                {/* Stats + filter bar */}
                <div className="flex items-center gap-4 px-6 py-4 border-b border-zinc-800/60">
                    <div className="flex items-center gap-3 flex-1">
                        <StatPill label="All" count={allEvents.length} active={filter === 'all'} onClick={() => setFilter('all')} color="zinc" />
                        <StatPill label="Auth" count={authCount} active={filter === 'auth'} onClick={() => setFilter('auth')} color="blue" />
                        <StatPill label="Sync" count={syncCount} active={filter === 'sync'} onClick={() => setFilter('sync')} color="purple" />
                        <StatPill label="Forward" count={forwardCount} active={filter === 'forward'} onClick={() => setFilter('forward')} color="orange" />
                    </div>
                    <p className="text-zinc-600 text-xs">
                        {filtered.length} event{filtered.length !== 1 ? 's' : ''}
                    </p>
                </div>

                {/* Event stream */}
                <div className="flex-1 overflow-y-auto p-4 space-y-2">
                    {filtered.length === 0 ? (
                        <EmptyState connected={connected} />
                    ) : (
                        <AnimatePresence initial={false}>
                            {filtered.map((event) => (
                                <EventCard
                                    key={event.id}
                                    event={event}
                                    expanded={expandedId === event.id}
                                    onToggle={() => setExpandedId(expandedId === event.id ? null : event.id)}
                                    isLive={liveEvents.some((e) => e.id === event.id)}
                                />
                            ))}
                        </AnimatePresence>
                    )}
                </div>

                {/* How webhooks work explainer */}
                <div className="border-t border-zinc-800/60 px-6 py-4">
                    <p className="text-zinc-600 text-[11px]">
                        Nango fires webhooks to <code className="bg-zinc-800 px-1 rounded text-zinc-400">/webhooks-from-nango</code> on your backend.
                        Your backend verifies the HMAC-SHA256 signature, processes the payload, and this page receives it live via SSE.
                        <span className="ml-1 text-zinc-500">→ <span className="underline">Auth</span> = new connection · <span className="underline">Sync</span> = data fetched · <span className="underline">Forward</span> = provider event relayed</span>
                    </p>
                </div>
            </div>
        </Layout>
    );
}

function EventCard({ event, expanded, onToggle, isLive }: {
    event: WebhookEvent;
    expanded: boolean;
    onToggle: () => void;
    isLive: boolean;
}) {
    const typeInfo = TYPE_COLORS[event.type as keyof typeof TYPE_COLORS] ?? {
        badge: 'default' as const,
        dot: 'bg-zinc-500',
        label: event.type
    };

    const time = new Date(event.timestamp);
    const now = new Date();
    const isToday = time.toDateString() === now.toDateString();
    const timeStr = isToday
        ? time.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' })
        : time.toLocaleString([], { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit', second: '2-digit' });

    return (
        <motion.div
            layout
            initial={{ opacity: 0, x: 16 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -16 }}
            transition={{ duration: 0.2 }}
            className={cn(
                'rounded-xl border bg-zinc-900/60 overflow-hidden',
                isLive ? 'border-zinc-700/80' : 'border-zinc-800/60',
                'event-appear'
            )}
        >
            <button
                onClick={onToggle}
                className="w-full flex items-center gap-3 px-4 py-3 text-left hover:bg-zinc-800/30 transition-colors"
            >
                {/* Type dot */}
                <div className={cn('w-2 h-2 rounded-full shrink-0', typeInfo.dot)} />

                {/* Type badge */}
                <Badge variant={typeInfo.badge} size="xs">{typeInfo.label}</Badge>

                {/* Provider */}
                <span className="text-zinc-200 text-sm font-medium">{event.provider}</span>

                {/* Extra info */}
                {event.operation && (
                    <span className="text-zinc-500 text-xs">{event.operation}</span>
                )}
                {event.model && (
                    <Badge variant="default" size="xs">{event.model}</Badge>
                )}
                {event.connectionId && (
                    <span className="text-zinc-600 text-xs font-mono truncate max-w-[140px]">{event.connectionId}</span>
                )}

                {/* Live badge */}
                {isLive && (
                    <span className="ml-auto flex items-center gap-1 text-[10px] text-emerald-400 font-medium shrink-0">
                        <div className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                        LIVE
                    </span>
                )}

                {/* Timestamp */}
                <span className={cn('text-[10px] text-zinc-600 font-mono shrink-0', isLive ? '' : 'ml-auto')}>{timeStr}</span>

                {/* Expand chevron */}
                {expanded ? (
                    <ChevronDown size={14} className="text-zinc-500 shrink-0" />
                ) : (
                    <ChevronRight size={14} className="text-zinc-500 shrink-0" />
                )}
            </button>

            {/* Expanded payload */}
            <AnimatePresence>
                {expanded && (
                    <motion.div
                        initial={{ height: 0, opacity: 0 }}
                        animate={{ height: 'auto', opacity: 1 }}
                        exit={{ height: 0, opacity: 0 }}
                        transition={{ duration: 0.2 }}
                        className="overflow-hidden"
                    >
                        <div className="px-4 pb-4 border-t border-zinc-800/60">
                            <pre className="mt-3 text-xs font-mono text-zinc-400 bg-zinc-950 rounded-lg p-3 overflow-x-auto max-h-64 border border-zinc-800/60">
                                {JSON.stringify(event.payload, null, 2)}
                            </pre>
                        </div>
                    </motion.div>
                )}
            </AnimatePresence>
        </motion.div>
    );
}

function StatPill({ label, count, active, onClick, color }: {
    label: string;
    count: number;
    active: boolean;
    onClick: () => void;
    color: string;
}) {
    const colorMap: Record<string, string> = {
        zinc: 'text-zinc-300 border-zinc-700 bg-zinc-800',
        blue: 'text-blue-300 border-blue-500/30 bg-blue-500/10',
        purple: 'text-purple-300 border-purple-500/30 bg-purple-500/10',
        orange: 'text-orange-300 border-orange-500/30 bg-orange-500/10'
    };

    return (
        <button
            onClick={onClick}
            className={cn(
                'flex items-center gap-1.5 px-3 py-1 rounded-lg text-xs border font-medium transition-all',
                active ? colorMap[color] : 'text-zinc-500 border-zinc-800/60 hover:text-zinc-300 hover:border-zinc-700/60'
            )}
        >
            {label}
            <span className={cn('text-[10px] rounded-full px-1', active ? 'opacity-80' : 'opacity-50')}>{count}</span>
        </button>
    );
}

function EmptyState({ connected }: { connected: boolean }) {
    return (
        <div className="flex flex-col items-center justify-center py-24 text-center">
            <div className="w-12 h-12 rounded-xl bg-zinc-900 border border-zinc-800 flex items-center justify-center mb-4">
                <Zap size={20} className="text-zinc-600" />
            </div>
            <p className="text-zinc-400 font-medium text-sm">
                {connected ? 'Waiting for events...' : 'Connecting to event stream...'}
            </p>
            <p className="text-zinc-600 text-xs mt-1 max-w-xs">
                {connected
                    ? 'Connect a provider or trigger an action to see webhook events appear here in real-time.'
                    : 'Start the backend server to enable the live event stream.'}
            </p>
        </div>
    );
}
