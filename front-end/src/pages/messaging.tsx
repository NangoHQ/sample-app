import { useState, useRef, useEffect } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { motion, AnimatePresence } from 'framer-motion';
import { MessageSquare, Send, Users, Zap, Loader2, Link2, Unlink, RefreshCw, ChevronDown, ChevronRight, CheckCircle2, Hash, LogOut } from 'lucide-react';
import { toast } from 'sonner';
import { Layout, useUser } from '../components/layout/Layout';
import { useNangoConnect } from '../hooks/useNangoConnect';
import { useSSE } from '../hooks/useSSE';
import { Badge } from '../components/ui/Badge';
import { NangoLogo } from '../components/NangoLogo';
import { apiFetch } from '../utils';
import { cn } from '../utils';

interface Contact {
    id: string;
    fullName: string;
    avatar: string;
}

export default function MessagingPage() {
    const { user } = useUser();
    const queryClient = useQueryClient();

    const { data: connections, refetch: refetchConnections } = useQuery({
        queryKey: ['connections'],
        queryFn: async () => {
            const res = await apiFetch(`/connections`);
            if (!res.ok) return [];
            return (await res.json()).connections as { providerConfigKey: string; connectionId: string; broken: boolean }[];
        },
        refetchInterval: 5000
    });

    const slackConn = connections?.find((c) => c.providerConfigKey === 'slack');

    const onConnectionChange = () => {
        refetchConnections();
        queryClient.invalidateQueries({ queryKey: ['connections'] });
    };

    return (
        <Layout
            title="Messaging"
            description="Sync workspace users, send messages, and receive real-time events via Slack"
        >
            <div className="flex flex-col h-full">
                {/* Provider selector row */}
                <div className="flex items-center gap-2 px-6 pt-5 pb-4 border-b border-zinc-800/60">
                    {/* Slack — active */}
                    <div className="flex items-center gap-2 px-3.5 py-2 rounded-lg border text-sm font-medium text-white"
                        style={{ background: '#4A154B25', borderColor: '#4A154B50' }}>
                        <NangoLogo integrationId="slack" className="w-3.5 h-3.5" fallback="S" />
                        Slack
                        {slackConn && <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 ml-0.5" />}
                    </div>

                </div>

                {/* Main content */}
                <div className="flex-1 min-h-0">
                    {slackConn ? (
                        <SlackWorkspace userId={user.id} connectionId={slackConn.connectionId} onDisconnect={onConnectionChange} />
                    ) : (
                        <SlackConnectPrompt userId={user.id} onConnect={onConnectionChange} />
                    )}
                </div>
            </div>
        </Layout>
    );
}


type SlackChannel = { id: string; name: string; is_member: boolean; num_members: number };

function ChannelAccess({ userId }: { userId: string }) {
    const [selected, setSelected] = useState<Set<string>>(new Set());
    const [installing, setInstalling] = useState(false);
    const [uninstalling, setUninstalling] = useState<Set<string>>(new Set());
    const [installedIds, setInstalledIds] = useState<Set<string>>(new Set());

    const { data: channels, isLoading } = useQuery({
        queryKey: ['slack-channels-list', userId],
        queryFn: async () => {
            const res = await apiFetch(`/proxy`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    providerConfigKey: 'slack',
                    method: 'GET',
                    endpoint: '/conversations.list?limit=200&exclude_archived=true&types=public_channel',
                    userId
                })
            });
            if (!res.ok) return [] as SlackChannel[];
            const json = await res.json();
            return (json.data?.channels ?? []) as SlackChannel[];
        },
        staleTime: 30_000
    });

    useEffect(() => {
        if (channels) {
            setInstalledIds(new Set(channels.filter((c) => c.is_member).map((c) => c.id)));
        }
    }, [channels]);

    const toggleSelect = (id: string) => {
        setSelected((prev) => {
            const next = new Set(prev);
            if (next.has(id)) next.delete(id);
            else next.add(id);
            return next;
        });
    };

    const installBot = async () => {
        if (selected.size === 0 || installing) return;
        setInstalling(true);
        const ids = [...selected];
        const results = await Promise.allSettled(
            ids.map(async (channelId) => {
                const res = await apiFetch(`/proxy`, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                        providerConfigKey: 'slack',
                        method: 'POST',
                        endpoint: '/conversations.join',
                        userId,
                        data: { channel: channelId }
                    })
                });
                const json = await res.json();
                if (!res.ok || json.data?.ok === false) {
                    throw new Error(json.data?.error ?? 'Failed to join channel');
                }
                return channelId;
            })
        );

        const joined: string[] = [];
        const failed: { id: string; err: string }[] = [];
        results.forEach((r, i) => {
            if (r.status === 'fulfilled') joined.push(ids[i]);
            else failed.push({ id: ids[i], err: (r.reason as Error)?.message ?? 'unknown' });
        });

        if (joined.length > 0) {
            setInstalledIds((prev) => new Set([...prev, ...joined]));
            setSelected((prev) => {
                const next = new Set(prev);
                joined.forEach((id) => next.delete(id));
                return next;
            });
            toast.success(`Bot installed to ${joined.length} channel${joined.length > 1 ? 's' : ''}`, {
                description: 'Webhook events for these channels will now appear in the feed'
            });
        }
        if (failed.length > 0) {
            toast.error(`Failed to join ${failed.length} channel${failed.length > 1 ? 's' : ''}`, {
                description: failed.map((f) => f.err).join(', ')
            });
        }
        setInstalling(false);
    };

    const leaveChannel = async (channelId: string, channelName: string) => {
        setUninstalling((prev) => new Set([...prev, channelId]));
        try {
            const res = await apiFetch(`/proxy`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    providerConfigKey: 'slack',
                    method: 'POST',
                    endpoint: '/conversations.leave',
                    userId,
                    data: { channel: channelId }
                })
            });
            const json = await res.json();
            if (!res.ok || json.data?.ok === false) {
                throw new Error(json.data?.error ?? 'Failed to leave channel');
            }
            setInstalledIds((prev) => {
                const next = new Set(prev);
                next.delete(channelId);
                return next;
            });
            toast.success(`Bot removed from #${channelName}`);
        } catch (err: any) {
            toast.error(`Failed to leave #${channelName}`, { description: err?.message });
        } finally {
            setUninstalling((prev) => {
                const next = new Set(prev);
                next.delete(channelId);
                return next;
            });
        }
    };

    const uninstalledChannels = channels?.filter((c) => !installedIds.has(c.id)) ?? [];
    const installedChannels = channels?.filter((c) => installedIds.has(c.id)) ?? [];

    return (
        <div className="max-w-xl">
            <div className="flex items-center gap-2 mb-1">
                <Hash size={14} className="text-zinc-500" />
                <h3 className="text-zinc-200 text-sm font-medium">Channel Access</h3>
                <Badge variant="blue" size="xs">Proxy</Badge>
            </div>
            <p className="text-zinc-500 text-xs mb-5 leading-relaxed">
                Install your bot to channels to start receiving webhook events — messages, reactions, member joins, and more. Uses <code className="text-zinc-400 bg-zinc-800 px-1 py-0.5 rounded text-[10px]">conversations.join</code> via Nango proxy.
            </p>

            {isLoading ? (
                <div className="space-y-2">
                    {[...Array(5)].map((_, i) => (
                        <div key={i} className="animate-pulse flex items-center gap-3 px-3 py-2.5 rounded-xl border border-zinc-800/60 bg-zinc-900/30">
                            <div className="w-4 h-4 rounded bg-zinc-800" />
                            <div className="h-2.5 bg-zinc-800 rounded" style={{ width: `${50 + i * 8}%` }} />
                            <div className="h-2 bg-zinc-800/60 rounded w-12 ml-auto" />
                        </div>
                    ))}
                </div>
            ) : (
                <>
                    {/* Available channels */}
                    {uninstalledChannels.length > 0 && (
                        <div className="mb-5">
                            <p className="text-zinc-600 text-[10px] uppercase tracking-wider mb-2">
                                Available · {uninstalledChannels.length}
                            </p>
                            <div className="space-y-1.5 max-h-72 overflow-y-auto pr-1">
                                {uninstalledChannels.map((ch) => {
                                    const isSelected = selected.has(ch.id);
                                    return (
                                        <button
                                            key={ch.id}
                                            onClick={() => toggleSelect(ch.id)}
                                            className={cn(
                                                'w-full flex items-center gap-3 px-3 py-2.5 rounded-xl border text-left transition-all',
                                                isSelected
                                                    ? 'border-[#4A154B]/60 bg-[#4A154B]/10'
                                                    : 'border-zinc-800/60 hover:border-zinc-700/60 hover:bg-zinc-800/20'
                                            )}
                                        >
                                            <div className={cn(
                                                'w-4 h-4 rounded border flex items-center justify-center shrink-0 transition-all',
                                                isSelected ? 'bg-[#4A154B] border-[#4A154B]' : 'border-zinc-700'
                                            )}>
                                                {isSelected && <CheckCircle2 size={9} className="text-white" />}
                                            </div>
                                            <Hash size={11} className="text-zinc-600 shrink-0" />
                                            <span className="text-zinc-300 text-xs flex-1 truncate">{ch.name}</span>
                                            {ch.num_members > 0 && (
                                                <span className="text-zinc-600 text-[10px] shrink-0">{ch.num_members.toLocaleString()} members</span>
                                            )}
                                        </button>
                                    );
                                })}
                            </div>
                        </div>
                    )}

                    {/* Install button */}
                    <AnimatePresence>
                        {selected.size > 0 && (
                            <motion.div
                                initial={{ opacity: 0, y: 4 }}
                                animate={{ opacity: 1, y: 0 }}
                                exit={{ opacity: 0, y: 4 }}
                                className="mb-5"
                            >
                                <button
                                    onClick={installBot}
                                    disabled={installing}
                                    className="flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-medium text-white transition-all disabled:opacity-60"
                                    style={{ background: '#4A154B' }}
                                >
                                    {installing ? <Loader2 size={13} className="animate-spin" /> : <Hash size={13} />}
                                    {installing
                                        ? `Installing to ${selected.size} channel${selected.size > 1 ? 's' : ''}…`
                                        : `Install bot to ${selected.size} channel${selected.size > 1 ? 's' : ''}`}
                                </button>
                            </motion.div>
                        )}
                    </AnimatePresence>

                    {/* Already installed */}
                    {installedChannels.length > 0 && (
                        <div>
                            <p className="text-zinc-600 text-[10px] uppercase tracking-wider mb-2">
                                Bot installed · {installedChannels.length}
                            </p>
                            <div className="space-y-1.5">
                                {installedChannels.map((ch) => {
                                    const isLeaving = uninstalling.has(ch.id);
                                    return (
                                        <div
                                            key={ch.id}
                                            className="flex items-center gap-3 px-3 py-2.5 rounded-xl border border-emerald-500/20 bg-emerald-500/5"
                                        >
                                            {isLeaving
                                                ? <Loader2 size={13} className="text-zinc-500 shrink-0 animate-spin" />
                                                : <CheckCircle2 size={13} className="text-emerald-400 shrink-0" />}
                                            <Hash size={11} className="text-zinc-600 shrink-0" />
                                            <span className="text-zinc-300 text-xs flex-1 truncate">{ch.name}</span>
                                            {ch.num_members > 0 && (
                                                <span className="text-zinc-600 text-[10px] shrink-0">{ch.num_members.toLocaleString()} members</span>
                                            )}
                                            <button
                                                onClick={() => leaveChannel(ch.id, ch.name)}
                                                disabled={isLeaving}
                                                className="flex items-center gap-1 text-[10px] text-zinc-600 hover:text-red-400 transition-colors disabled:opacity-40 shrink-0 ml-1"
                                                title="Remove bot from channel"
                                            >
                                                <LogOut size={10} />
                                                Remove
                                            </button>
                                        </div>
                                    );
                                })}
                            </div>
                        </div>
                    )}

                    {channels?.length === 0 && (
                        <div className="text-center py-10">
                            <Hash size={20} className="text-zinc-700 mx-auto mb-2" />
                            <p className="text-zinc-600 text-xs">No public channels found in this workspace.</p>
                        </div>
                    )}

                    {/* Code snippet */}
                    {!isLoading && (
                        <div className="mt-6 rounded-xl border border-zinc-800/60 bg-zinc-900/40 p-4">
                            <p className="text-zinc-500 text-[10px] uppercase tracking-wider mb-2.5">How it works</p>
                            <pre className="text-[11px] font-mono text-zinc-400 leading-relaxed overflow-x-auto whitespace-pre">{`// Install — join a channel
await nango.proxy({
  method: 'POST', providerConfigKey: 'slack',
  endpoint: '/conversations.join',
  data: { channel: 'CHANNEL_ID' }
});

// Uninstall — leave a channel
await nango.proxy({
  method: 'POST', providerConfigKey: 'slack',
  endpoint: '/conversations.leave',
  data: { channel: 'CHANNEL_ID' }
});`}</pre>
                        </div>
                    )}
                </>
            )}
        </div>
    );
}


function SlackConnectPrompt({ userId, onConnect }: { userId: string; onConnect: () => void }) {
    const { connect, connecting } = useNangoConnect();
    const isConnecting = connecting === 'slack';

    const handleConnect = () => connect({
        userId,
        providerConfigKey: 'slack',
        onSuccess: onConnect
    });

    return (
        <div className="flex items-center justify-center h-full p-10">
            <div className="max-w-lg w-full">
                <div className="rounded-2xl border border-zinc-800/60 bg-zinc-900/60 p-8">
                    <div className="w-12 h-12 rounded-xl bg-[#4A154B]/20 flex items-center justify-center mb-5">
                        <NangoLogo integrationId="slack" className="w-7 h-7" fallback="S" />
                    </div>
                    <h3 className="text-zinc-100 font-semibold text-lg mb-2">Connect Slack</h3>
                    <p className="text-zinc-400 text-sm leading-relaxed mb-6">
                        Connect your Slack workspace to sync workspace members and send direct messages — all powered by Nango.
                    </p>

                    <div className="grid grid-cols-3 gap-3 mb-6">
                        {[
                            { icon: <Users size={15} />, label: 'Syncs', desc: 'Workspace members synced automatically' },
                            { icon: <Send size={15} />, label: 'Actions', desc: 'Send DMs via nango.triggerAction()' },
                            { icon: <Zap size={15} />, label: 'Webhooks', desc: 'Forward webhooks for real-time events' }
                        ].map(({ icon, label, desc }) => (
                            <div key={label} className="rounded-xl border border-zinc-800/60 bg-zinc-900/40 p-3">
                                <div className="text-zinc-400 mb-1.5">{icon}</div>
                                <p className="text-zinc-200 text-xs font-medium mb-0.5">{label}</p>
                                <p className="text-zinc-500 text-[10px] leading-relaxed">{desc}</p>
                            </div>
                        ))}
                    </div>

                    <button
                        onClick={handleConnect}
                        disabled={isConnecting}
                        className="flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-medium text-white transition-all disabled:opacity-60"
                        style={{ background: '#4A154B' }}
                    >
                        {isConnecting ? <Loader2 size={14} className="animate-spin" /> : <Link2 size={14} />}
                        {isConnecting ? 'Connecting...' : 'Connect Slack workspace'}
                    </button>

                    {/* Code snippet */}
                    <div className="mt-5 rounded-xl border border-zinc-800/60 bg-zinc-900/40 p-4">
                        <p className="text-zinc-500 text-[10px] uppercase tracking-wider mb-2.5">How it works</p>
                        <pre className="text-[11px] font-mono text-zinc-400 leading-relaxed overflow-x-auto whitespace-pre">{`const nango = new Nango({ connectSessionToken });

const result = await nango.auth(
  'slack',      // providerConfigKey
  connectionId  // your user's ID
);`}</pre>
                    </div>
                </div>
            </div>
        </div>
    );
}


const SYNC_STEPS = [
    { label: 'Sync started', detail: 'Nango is fetching workspace members' },
    { label: 'Pulling members', detail: 'Paginating through Slack API…' },
    { label: 'Saving to database', detail: 'Records will appear any moment' },
];

function SyncProgress({ step }: { step: number }) {
    return (
        <div className="px-4 py-4 space-y-4">
            <div className="flex items-center gap-2 mb-1">
                <Loader2 size={11} className="animate-spin text-[#4A154B]" />
                <span className="text-zinc-400 text-[11px] font-medium">Syncing workspace…</span>
            </div>

            <div className="space-y-2.5">
                {SYNC_STEPS.map((s, i) => {
                    const done = i < step;
                    const active = i === step;
                    return (
                        <motion.div
                            key={i}
                            initial={{ opacity: 0, x: -6 }}
                            animate={{ opacity: done || active ? 1 : 0.35, x: 0 }}
                            transition={{ delay: i * 0.1 }}
                            className="flex items-start gap-2"
                        >
                            <div className="mt-0.5 shrink-0">
                                {done ? (
                                    <CheckCircle2 size={11} className="text-emerald-400" />
                                ) : active ? (
                                    <Loader2 size={11} className="animate-spin text-[#4A154B]" />
                                ) : (
                                    <div className="w-2.5 h-2.5 rounded-full border border-zinc-700 mt-0.5" />
                                )}
                            </div>
                            <div>
                                <p className={`text-[11px] font-medium ${done ? 'text-zinc-400' : active ? 'text-zinc-200' : 'text-zinc-600'}`}>
                                    {s.label}
                                </p>
                                {active && (
                                    <motion.p
                                        initial={{ opacity: 0 }}
                                        animate={{ opacity: 1 }}
                                        className="text-zinc-600 text-[10px] mt-0.5"
                                    >
                                        {s.detail}
                                    </motion.p>
                                )}
                            </div>
                        </motion.div>
                    );
                })}
            </div>

            {/* Skeleton rows hinting at members coming soon */}
            <div className="space-y-2 pt-2 border-t border-zinc-800/40">
                {[75, 55, 65, 50, 70].map((w, i) => (
                    <div key={i} className="flex items-center gap-2.5 animate-pulse" style={{ animationDelay: `${i * 120}ms` }}>
                        <div className="w-6 h-6 rounded-full bg-zinc-800 shrink-0" />
                        <div className="h-2 rounded bg-zinc-800" style={{ width: `${w}%` }} />
                    </div>
                ))}
            </div>
        </div>
    );
}


function SlackWorkspace({ userId, connectionId, onDisconnect }: {
    userId: string;
    connectionId: string;
    onDisconnect: () => void;
}) {
    const queryClient = useQueryClient();
    const { disconnect, reconnect, reconnecting: reconnectingProvider } = useNangoConnect();
    const isReconnecting = reconnectingProvider === 'slack';
    const [selectedContact, setSelectedContact] = useState<Contact | null>(null);
    const [expandedEventId, setExpandedEventId] = useState<string | null>(null);
    const [activeTab, setActiveTab] = useState<'dm' | 'channels'>('dm');

    const handleReconnect = () => reconnect({ userId, providerConfigKey: 'slack' });
    const [message, setMessage] = useState('');
    const [sending, setSending] = useState(false);
    const textareaRef = useRef<HTMLTextAreaElement>(null);

    const { data: contacts, isLoading: loadingContacts } = useQuery({
        queryKey: ['contacts', 'slack', userId],
        queryFn: async () => {
            const res = await apiFetch(`/contacts?integration=slack`);
            if (!res.ok) return [];
            return (await res.json()).contacts as Contact[];
        },
        refetchInterval: 30_000
    });

    // Track sync state
    const [syncState, setSyncState] = useState<'idle' | 'syncing' | 'done'>('idle');
    const [syncStep, setSyncStep] = useState(0);

    // If contacts are empty after load, assume sync is in progress
    useEffect(() => {
        if (!loadingContacts && contacts !== undefined && contacts.length === 0 && syncState === 'idle') {
            setSyncState('syncing');
            setSyncStep(0);
        }
        if (contacts && contacts.length > 0 && syncState !== 'done') {
            setSyncState('done');
        }
    }, [contacts, loadingContacts, syncState]);

    // Auto-advance step counter while syncing
    useEffect(() => {
        if (syncState !== 'syncing') return;
        if (syncStep >= 3) return;
        const t = setTimeout(() => setSyncStep((s) => s + 1), 1400);
        return () => clearTimeout(t);
    }, [syncState, syncStep]);

    // Slack events: live SSE + historical forward webhooks from DB
    const { events: liveEvents } = useSSE({
        maxEvents: 30,
        onEvent: (event) => {
            if (event.provider !== 'slack') return;
            if (event.type === 'auth' && (event.operation === 'creation' || event.operation === 'override')) {
                setSyncState('syncing');
                setSyncStep(0);
            }
            if (event.type === 'sync') {
                setSyncState('done');
                queryClient.invalidateQueries({ queryKey: ['contacts', 'slack', userId] });
                toast.success('Workspace sync complete', {
                    description: `${event.model ?? 'Members'} are now up to date`
                });
            }
        }
    });

    const { data: historicalEvents } = useQuery({
        queryKey: ['webhook-events', 'slack-forward'],
        queryFn: async () => {
            const res = await apiFetch(`/webhook-events?type=forward&provider=slack&limit=20`);
            if (!res.ok) return [];
            return (await res.json()).events as import('../hooks/useSSE').WebhookEvent[];
        },
        staleTime: 30_000
    });

    const slackEvents = (() => {
        const seen = new Set<string>();
        return [...liveEvents, ...(historicalEvents ?? [])]
            .filter((e) => e.provider?.includes('slack'))
            .filter((e) => { if (seen.has(e.id)) return false; seen.add(e.id); return true; });
    })();

    const sendMessage = async () => {
        if (!selectedContact || !message.trim()) return;
        setSending(true);
        try {
            const res = await apiFetch(`/send-slack-message`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ slackUserId: selectedContact.id, message, appUserId: userId })
            });
            if (!res.ok) throw new Error('Failed to send');
            toast.success('Message sent!', { description: `Sent to ${selectedContact.fullName}` });
            setMessage('');
        } catch (err: any) {
            toast.error('Failed to send message', { description: err?.message });
        } finally {
            setSending(false);
        }
    };

    const handleKeyDown = (e: React.KeyboardEvent) => {
        if (e.key === 'Enter' && (e.metaKey || e.ctrlKey)) sendMessage();
    };

    return (
        <div className="flex h-full">
            {/* ── Left: Members list ─────────────────────────────────── */}
            <div className="w-56 shrink-0 border-r border-zinc-800/60 flex flex-col bg-zinc-950/30">
                <div className="flex items-center gap-2 px-4 py-3.5 border-b border-zinc-800/60">
                    <Users size={12} className="text-zinc-500" />
                    <span className="text-zinc-400 text-xs font-medium">Workspace Members</span>
                    {contacts && (
                        <span className="text-zinc-600 text-[10px] ml-auto">{contacts.length}</span>
                    )}
                </div>

                {/* Connection status */}
                <div className="flex items-center gap-2 px-4 py-2.5 border-b border-zinc-800/40">
                    <div className="w-1.5 h-1.5 rounded-full bg-emerald-400" />
                    <span className="text-zinc-500 text-[10px] truncate">Connected · {connectionId}</span>
                </div>

                <div className="flex-1 overflow-y-auto py-2">
                    {loadingContacts ? (
                        <div className="flex items-center gap-2 px-4 py-4 text-zinc-600 text-xs">
                            <Loader2 size={12} className="animate-spin" />
                            Loading...
                        </div>
                    ) : !contacts?.length ? (
                        <SyncProgress step={syncStep} />
                    ) : (
                        contacts.map((contact) => (
                            <button
                                key={contact.id}
                                onClick={() => setSelectedContact(contact)}
                                className={cn(
                                    'w-full flex items-center gap-2.5 px-3 py-2 transition-all text-left',
                                    selectedContact?.id === contact.id
                                        ? 'bg-zinc-800/80'
                                        : 'hover:bg-zinc-800/40'
                                )}
                            >
                                <img
                                    src={contact.avatar}
                                    alt={contact.fullName}
                                    className="w-6 h-6 rounded-full object-cover bg-zinc-700 shrink-0"
                                    onError={(e) => {
                                        (e.target as HTMLImageElement).src = `https://ui-avatars.com/api/?name=${encodeURIComponent(contact.fullName)}&background=4A154B&color=fff&size=32`;
                                    }}
                                />
                                <span className="text-zinc-300 text-xs truncate">{contact.fullName}</span>
                                {selectedContact?.id === contact.id && (
                                    <div className="w-1 h-1 rounded-full bg-[#4A154B] ml-auto shrink-0" />
                                )}
                            </button>
                        ))
                    )}
                </div>

                {/* Reconnect / Disconnect */}
                <div className="px-4 py-3 border-t border-zinc-800/40 flex items-center gap-3">
                    <button
                        onClick={handleReconnect}
                        disabled={isReconnecting}
                        className="flex items-center gap-1.5 text-[11px] text-zinc-600 hover:text-zinc-300 transition-colors disabled:opacity-50"
                    >
                        <RefreshCw size={10} className={isReconnecting ? 'animate-spin' : ''} />
                        Reconnect
                    </button>
                    <span className="text-zinc-800">·</span>
                    <button
                        onClick={() => disconnect('slack').then(onDisconnect)}
                        className="flex items-center gap-1.5 text-[11px] text-zinc-600 hover:text-red-400 transition-colors"
                    >
                        <Unlink size={10} />
                        Disconnect
                    </button>
                </div>
            </div>

            {/* ── Center: DM / Channel Access ───────────────────────── */}
            <div className="flex-1 min-w-0 flex flex-col">
                {/* Tabs */}
                <div className="flex items-center px-6 pt-4 border-b border-zinc-800/60">
                    {([
                        { id: 'dm', label: 'Send DM', icon: MessageSquare },
                        { id: 'channels', label: 'Channel Access', icon: Hash }
                    ] as const).map(({ id, label, icon: Icon }) => (
                        <button
                            key={id}
                            onClick={() => setActiveTab(id)}
                            className={cn(
                                'flex items-center gap-1.5 px-3 py-2 mr-1 text-xs font-medium border-b-2 -mb-px transition-colors',
                                activeTab === id
                                    ? 'border-[#4A154B] text-zinc-200'
                                    : 'border-transparent text-zinc-500 hover:text-zinc-400'
                            )}
                        >
                            <Icon size={11} />
                            {label}
                        </button>
                    ))}
                </div>

                <div className="flex-1 min-h-0 overflow-y-auto p-6">
                    {activeTab === 'dm' ? (
                        <div className="flex flex-col h-full max-w-xl">
                            <div className="flex items-center gap-2 mb-5">
                                <MessageSquare size={14} className="text-zinc-500" />
                                <h3 className="text-zinc-200 text-sm font-medium">Send Message</h3>
                                <Badge variant="blue" size="xs">Action</Badge>
                            </div>

                            {/* To field */}
                            <div className="mb-3">
                                <p className="text-zinc-500 text-xs mb-1.5">To</p>
                                {selectedContact ? (
                                    <div className="flex items-center gap-2.5 px-3 py-2 rounded-xl bg-zinc-800/60 border border-zinc-700/60">
                                        <img
                                            src={selectedContact.avatar}
                                            alt=""
                                            className="w-5 h-5 rounded-full object-cover bg-zinc-700"
                                            onError={(e) => {
                                                (e.target as HTMLImageElement).src = `https://ui-avatars.com/api/?name=${encodeURIComponent(selectedContact.fullName)}&background=4A154B&color=fff&size=32`;
                                            }}
                                        />
                                        <span className="text-zinc-200 text-sm">{selectedContact.fullName}</span>
                                        <button
                                            onClick={() => setSelectedContact(null)}
                                            className="ml-auto text-zinc-600 hover:text-zinc-400 text-xs"
                                        >✕</button>
                                    </div>
                                ) : (
                                    <div className="px-3 py-2.5 rounded-xl border border-dashed border-zinc-800/60 text-zinc-600 text-xs">
                                        ← Select a workspace member
                                    </div>
                                )}
                            </div>

                            {/* Message textarea */}
                            <div className="flex-1 flex flex-col mb-3">
                                <p className="text-zinc-500 text-xs mb-1.5">Message</p>
                                <textarea
                                    ref={textareaRef}
                                    value={message}
                                    onChange={(e) => setMessage(e.target.value)}
                                    onKeyDown={handleKeyDown}
                                    placeholder="Hello from Nango!"
                                    rows={6}
                                    className="w-full bg-zinc-800/60 border border-zinc-700/60 rounded-xl px-3.5 py-3 text-zinc-200 text-sm placeholder-zinc-600 focus:outline-none focus:border-zinc-600 resize-none"
                                />
                                <p className="text-zinc-600 text-[10px] mt-1 text-right">⌘↵ to send</p>
                            </div>

                            {/* Send button */}
                            <button
                                onClick={sendMessage}
                                disabled={!selectedContact || !message.trim() || sending}
                                className={cn(
                                    'flex items-center justify-center gap-2 py-2.5 rounded-xl text-sm font-medium transition-all',
                                    selectedContact && message.trim() && !sending
                                        ? 'bg-[#4A154B] hover:bg-[#611f69] text-white'
                                        : 'bg-zinc-800 text-zinc-500 cursor-not-allowed'
                                )}
                            >
                                {sending ? <Loader2 size={14} className="animate-spin" /> : <Send size={14} />}
                                {sending ? 'Sending...' : 'Send via Nango Action'}
                            </button>

                            {/* Code snippet */}
                            <div className="mt-5 rounded-xl border border-zinc-800/60 bg-zinc-900/40 p-4">
                                <p className="text-zinc-500 text-[10px] uppercase tracking-wider mb-2.5">How it works</p>
                                <pre className="text-[11px] font-mono text-zinc-400 leading-relaxed overflow-x-auto whitespace-pre">{`await nango.triggerAction(
  'slack',           // providerConfigKey
  connectionId,      // user's connection
  'send-message',    // action name
  { userId, message }
);`}</pre>
                            </div>
                        </div>
                    ) : (
                        <ChannelAccess userId={userId} />
                    )}
                </div>
            </div>

            {/* ── Right: Live webhook events ─────────────────────────── */}
            <div className="w-96 shrink-0 border-l border-zinc-800/60 flex flex-col bg-zinc-950/30">
                <div className="flex items-center gap-2 px-4 py-3.5 border-b border-zinc-800/60">
                    <Zap size={12} className="text-orange-400" />
                    <span className="text-zinc-400 text-xs font-medium">Webhook Events</span>
                    <div className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse ml-auto" />
                </div>

                <div className="flex-1 overflow-y-auto p-3 space-y-2">
                    <AnimatePresence initial={false}>
                        {slackEvents.length === 0 ? (
                            <div className="text-center mt-10 px-3">
                                <Zap size={20} className="text-zinc-700 mx-auto mb-2" />
                                <p className="text-zinc-600 text-[11px] leading-relaxed">
                                    Forward webhooks from Slack will appear here in real-time — message events, reactions, member joins, and more.
                                </p>
                            </div>
                        ) : (
                            slackEvents.map((event) => {
                                const isExpanded = expandedEventId === event.id;
                                // event.payload is the Nango envelope; the provider's actual payload is nested at .payload
                                const innerPayload = (event.payload as any)?.payload;
                                const eventType = innerPayload?.event?.type   // Slack: event_callback → event.type
                                    ?? innerPayload?.type                      // Other providers: top-level type
                                    ?? event.type;                             // Fallback
                                return (
                                    <motion.div
                                        key={event.id}
                                        initial={{ opacity: 0, y: -6 }}
                                        animate={{ opacity: 1, y: 0 }}
                                        className="rounded-lg border border-orange-500/20 bg-orange-500/5 overflow-hidden"
                                    >
                                        {/* Header row — always visible, click to expand */}
                                        <button
                                            onClick={() => setExpandedEventId(isExpanded ? null : event.id)}
                                            className="w-full flex items-center gap-1.5 px-2.5 py-2 hover:bg-orange-500/10 transition-colors text-left"
                                        >
                                            {isExpanded
                                                ? <ChevronDown size={10} className="text-zinc-500 shrink-0" />
                                                : <ChevronRight size={10} className="text-zinc-500 shrink-0" />
                                            }
                                            <Badge variant="orange" size="xs">Forward</Badge>
                                            <span className="text-zinc-400 text-[10px] truncate flex-1">{eventType}</span>
                                            <span className="text-zinc-600 text-[9px] shrink-0 ml-1">
                                                {new Date(event.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' })}
                                            </span>
                                        </button>

                                        {/* Expanded payload */}
                                        {isExpanded && (
                                            <div className="px-2.5 pb-2.5 border-t border-orange-500/10">
                                                <pre className="text-[10px] font-mono text-zinc-400 leading-relaxed overflow-x-auto max-h-72 overflow-y-auto mt-2 whitespace-pre">
                                                    {JSON.stringify(event.payload, null, 2)}
                                                </pre>
                                            </div>
                                        )}
                                    </motion.div>
                                );
                            })
                        )}
                    </AnimatePresence>
                </div>
            </div>
        </div>
    );
}
