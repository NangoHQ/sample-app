import { useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { motion, AnimatePresence } from 'framer-motion';
import { MessageSquare, FolderOpen, Cpu, Activity, Calendar } from 'lucide-react';
import { Layout, useUser } from '../components/layout/Layout';
import { ProviderCard } from '../components/providers/ProviderCard';
import { useNangoConnect } from '../hooks/useNangoConnect';
import { PROVIDERS, PROVIDER_GROUPS, getProvidersByGroup } from '../config/providers';
import type { ProviderGroup } from '../config/providers';
import { apiFetch } from '../utils';
import { cn } from '../utils';

const GROUP_ICONS: Record<ProviderGroup, any> = {
    messaging: MessageSquare,
    files: FolderOpen,
    mcp: Cpu,
    productivity: Calendar
};

const GROUP_COLORS: Record<ProviderGroup, string> = {
    messaging: '#6366f1',
    files: '#0ea5e9',
    mcp: '#a855f7',
    productivity: '#1a73e8'
};

export default function ConnectPage() {
    const { user } = useUser();
    const queryClient = useQueryClient();
    const { connect, reconnect, disconnect, connecting, reconnecting } = useNangoConnect();
    const [expandedGroup, setExpandedGroup] = useState<ProviderGroup | 'all'>('all');

    const { data: connections } = useQuery({
        queryKey: ['connections'],
        queryFn: async () => {
            const res = await apiFetch(`/connections`);
            if (!res.ok) return [];
            const data = await res.json();
            return data.connections as { providerConfigKey: string; connectionId: string; broken: boolean }[];
        },
        refetchInterval: 5000
    });

    const connectedMap = new Map(connections?.map((c) => [c.providerConfigKey, c.connectionId]) ?? []);
    const brokenSet = new Set(connections?.filter((c) => c.broken).map((c) => c.providerConfigKey) ?? []);
    const totalConnected = connections?.length ?? 0;

    const visibleGroups = expandedGroup === 'all' ? PROVIDER_GROUPS : PROVIDER_GROUPS.filter((g) => g.id === expandedGroup);

    return (
        <>
        <Layout
            title="Integration Hub"
            description="Connect providers using Nango Connect UI — OAuth, API Key, and more"
        >
            <div className="p-6 max-w-6xl mx-auto">
                {/* Stats bar */}
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-6">
                    <StatCard label="Total Providers" value={PROVIDERS.length} />
                    <StatCard label="Connected" value={totalConnected} accent="emerald" />
                    <StatCard label="Provider Groups" value={PROVIDER_GROUPS.length} />
                    <StatCard label="Auth Types" value="OAuth & API Key" small />
                </div>

                {/* Group filter tabs */}
                <div className="flex items-center gap-2 mb-6 flex-wrap">
                    <FilterTab
                        active={expandedGroup === 'all'}
                        onClick={() => setExpandedGroup('all')}
                        color="#6366f1"
                    >
                        All Groups
                    </FilterTab>
                    {PROVIDER_GROUPS.map((group) => {
                        const Icon = GROUP_ICONS[group.id];
                        const count = getProvidersByGroup(group.id).length;
                        return (
                            <FilterTab
                                key={group.id}
                                active={expandedGroup === group.id}
                                onClick={() => setExpandedGroup(group.id)}
                                color={GROUP_COLORS[group.id]}
                            >
                                <Icon size={12} />
                                {group.label}
                                <span className="ml-1 text-[10px] opacity-60">({count})</span>
                            </FilterTab>
                        );
                    })}
                </div>

                {/* Provider groups */}
                <div className="space-y-8">
                    {visibleGroups.map((group) => {
                        const Icon = GROUP_ICONS[group.id];
                        const providers = getProvidersByGroup(group.id);
                        const groupConnected = providers.filter((p) => connectedMap.has(p.id)).length;

                        return (
                            <motion.section
                                key={group.id}
                                initial={{ opacity: 0, y: 12 }}
                                animate={{ opacity: 1, y: 0 }}
                                transition={{ duration: 0.3 }}
                            >
                                {/* Group header */}
                                <div className="flex items-center gap-3 mb-4">
                                    <div
                                        className="w-8 h-8 rounded-lg flex items-center justify-center"
                                        style={{ background: GROUP_COLORS[group.id] + '20' }}
                                    >
                                        <Icon size={16} style={{ color: GROUP_COLORS[group.id] }} />
                                    </div>
                                    <div>
                                        <h2 className="text-zinc-100 font-semibold text-sm">{group.label}</h2>
                                        <p className="text-zinc-500 text-xs">{group.description}</p>
                                    </div>
                                    {groupConnected > 0 && (
                                        <span
                                            className="ml-auto text-xs px-2 py-0.5 rounded-full border font-medium"
                                            style={{
                                                color: GROUP_COLORS[group.id],
                                                borderColor: GROUP_COLORS[group.id] + '40',
                                                background: GROUP_COLORS[group.id] + '10'
                                            }}
                                        >
                                            {groupConnected}/{providers.length} connected
                                        </span>
                                    )}
                                </div>

                                {/* Provider grid */}
                                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3">
                                    {providers.map((provider) => (
                                        <ProviderCard
                                            key={provider.id}
                                            provider={provider}
                                            connected={connectedMap.has(provider.id)}
                                            connectionId={connectedMap.get(provider.id)}
                                            broken={brokenSet.has(provider.id)}
                                            isConnecting={connecting === provider.id}
                                            isReconnecting={reconnecting === provider.id}
                                            onConnect={() =>
                                                connect({
                                                    userId: user.id,
                                                    providerConfigKey: provider.id,
                                                    useConnectUI: true,
                                                    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['connections'] })
                                                })
                                            }
                                            onReconnect={() =>
                                                reconnect({
                                                    userId: user.id,
                                                    providerConfigKey: provider.id,
                                                    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['connections'] })
                                                })
                                            }
                                            onDisconnect={async () => {
                                                await disconnect(provider.id);
                                                queryClient.invalidateQueries({ queryKey: ['connections'] });
                                            }}
                                        />
                                    ))}
                                </div>
                            </motion.section>
                        );
                    })}
                </div>

                {/* How it works callout */}
                <div className="mt-10 rounded-xl border border-indigo-500/20 bg-indigo-500/5 p-5">
                    <h3 className="text-indigo-300 font-semibold text-sm mb-2 flex items-center gap-2">
                        <Activity size={14} />
                        How Connect UI works
                    </h3>
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mt-3">
                        <Step num={1} title="Session Token" desc="Your backend calls Nango to create a short-lived session token scoped to this user" />
                        <Step num={2} title="Connect UI Opens" desc="nango.openConnectUI() launches Nango's hosted OAuth modal — zero custom OAuth code" />
                        <Step num={3} title="Webhook Confirms" desc="Nango fires an auth webhook to your backend confirming the connection was created" />
                    </div>
                    <pre className="mt-4 text-xs font-mono text-zinc-400 bg-zinc-900/60 rounded-lg p-3 overflow-x-auto border border-zinc-800/60">
{`// Frontend: one line to open the modal
const nango = new Nango({ connectSessionToken: token });
nango.openConnectUI({ onEvent: handler });`}
                    </pre>
                </div>
            </div>
        </Layout>
        </>
    );
}

function StatCard({ label, value, accent, small }: { label: string; value: any; accent?: string; small?: boolean }) {
    return (
        <div className="bg-zinc-900/60 border border-zinc-800/60 rounded-xl p-4">
            <p className="text-zinc-500 text-xs mb-1">{label}</p>
            <p className={cn(
                'font-bold',
                small ? 'text-sm text-zinc-200' : 'text-2xl',
                accent === 'emerald' ? 'text-emerald-400' : 'text-zinc-100'
            )}>
                {value}
            </p>
        </div>
    );
}

function FilterTab({ children, active, onClick, color }: { children: any; active: boolean; onClick: () => void; color: string }) {
    return (
        <button
            onClick={onClick}
            className={cn(
                'flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-all border',
                active
                    ? 'text-white border-transparent'
                    : 'text-zinc-400 border-zinc-800/60 hover:text-zinc-200 hover:border-zinc-700/60'
            )}
            style={active ? { background: color + '20', borderColor: color + '40', color } : {}}
        >
            {children}
        </button>
    );
}

function Step({ num, title, desc }: { num: number; title: string; desc: string }) {
    return (
        <div className="flex gap-3">
            <div className="w-5 h-5 rounded-full bg-indigo-500/20 border border-indigo-500/30 flex items-center justify-center text-[10px] font-bold text-indigo-400 shrink-0 mt-0.5">
                {num}
            </div>
            <div>
                <p className="text-zinc-200 text-xs font-medium">{title}</p>
                <p className="text-zinc-500 text-[11px] mt-0.5 leading-relaxed">{desc}</p>
            </div>
        </div>
    );
}
