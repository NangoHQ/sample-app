import { motion } from 'framer-motion';
import { Loader2, Link2, Unlink, RefreshCw, Zap, Database, ArrowRight, AlertTriangle } from 'lucide-react';
import { Badge } from '../ui/Badge';
import type { Provider } from '../../config/providers';
import { cn } from '../../utils';
import { NangoLogo } from '../NangoLogo';

interface Props {
    provider: Provider;
    connected: boolean;
    connectionId?: string;
    broken?: boolean;
    syncing?: boolean;
    onConnect: () => void;
    onDisconnect: () => void;
    onReconnect?: () => void;
    isConnecting: boolean;
    isReconnecting?: boolean;
    onClick?: () => void;
}

export function ProviderCard({
    provider,
    connected,
    connectionId,
    broken = false,
    syncing,
    onConnect,
    onDisconnect,
    onReconnect,
    isConnecting,
    isReconnecting,
    onClick
}: Props) {
    const featureIcons = {
        syncs: <Database size={10} />,
        actions: <Zap size={10} />,
        webhooks: <RefreshCw size={10} />,
        mcp: <span className="text-[9px] font-bold">MCP</span>,
        bot: <span className="text-[9px] font-bold">BOT</span>
    };

    return (
        <motion.div
            layout
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            className={cn(
                'group relative rounded-xl border transition-all cursor-pointer',
                broken
                    ? 'border-amber-500/50 bg-amber-500/5'
                    : connected
                    ? 'border-zinc-700/80 bg-zinc-900/80'
                    : 'border-zinc-800/60 bg-zinc-900/40 hover:border-zinc-700/60 hover:bg-zinc-900/60'
            )}
            style={connected ? { '--glow-color': provider.color + '40' } as any : {}}
            onClick={onClick}
        >
            {/* Brand color accent top bar */}
            <div
                className="absolute inset-x-0 top-0 h-[2px] rounded-t-xl opacity-0 group-hover:opacity-100 transition-opacity"
                style={{ background: `linear-gradient(90deg, transparent, ${provider.color}, transparent)` }}
            />

            <div className="p-4">
                {/* Header row */}
                <div className="flex items-start justify-between mb-3">
                    <div className="flex items-center gap-3">
                        {/* Logo */}
                        <div
                            className="w-9 h-9 rounded-lg flex items-center justify-center relative shrink-0"
                            style={{ background: provider.bgColor }}
                        >
                            <NangoLogo
                                integrationId={provider.id}
                                className="w-5 h-5"
                                fallback={provider.name[0]}
                            />
                        </div>
                        <div>
                            <p className="text-zinc-100 font-medium text-sm leading-none">{provider.name}</p>
                            <p className="text-zinc-500 text-[10px] mt-0.5 capitalize">{provider.authType.replace('_', ' ')}</p>
                        </div>
                    </div>

                    {/* Status indicator */}
                    {broken ? (
                        <AlertTriangle size={14} className="text-amber-400 shrink-0" />
                    ) : connected ? (
                        <div className="relative flex items-center">
                            <div className="w-2 h-2 rounded-full bg-emerald-400">
                                <div className="absolute inset-0 rounded-full bg-emerald-400 animate-ping opacity-50" />
                            </div>
                        </div>
                    ) : (
                        <div className="w-2 h-2 rounded-full bg-zinc-700" />
                    )}
                </div>

                {/* Description */}
                <p className="text-zinc-500 text-xs leading-relaxed mb-3 line-clamp-2">{provider.description}</p>

                {/* Feature tags */}
                {provider.features.length > 0 && (
                    <div className="flex flex-wrap gap-1 mb-3">
                        {provider.features.map((f) => (
                            <span
                                key={f}
                                className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded bg-zinc-800/80 text-zinc-400 text-[10px] border border-zinc-700/40"
                            >
                                {featureIcons[f]}
                                <span className="capitalize">{f}</span>
                            </span>
                        ))}
                    </div>
                )}

                {/* Connection status / action */}
                {connected ? (
                    <div className="space-y-2">
                        {broken && onReconnect && (
                            <button
                                onClick={(e) => { e.stopPropagation(); onReconnect(); }}
                                disabled={isReconnecting}
                                className="w-full flex items-center justify-center gap-1.5 py-1.5 rounded-lg text-xs font-medium bg-amber-500/15 hover:bg-amber-500/25 text-amber-400 border border-amber-500/30 transition-all disabled:opacity-50"
                            >
                                {isReconnecting
                                    ? <><Loader2 size={12} className="animate-spin" /> Reconnecting...</>
                                    : <><RefreshCw size={12} /> Reconnect — token expired</>
                                }
                            </button>
                        )}
                        <div className="flex items-center justify-between">
                            <span className="text-[10px] text-zinc-500 font-mono truncate max-w-[120px]">{connectionId}</span>
                            <div className="flex items-center gap-1.5">
                                {onClick && !broken && (
                                    <button
                                        onClick={(e) => { e.stopPropagation(); onClick(); }}
                                        className="flex items-center gap-1 text-[11px] text-indigo-400 hover:text-indigo-300 transition-colors font-medium"
                                    >
                                        Open <ArrowRight size={10} />
                                    </button>
                                )}
                                {onReconnect && !broken && (
                                    <button
                                        onClick={(e) => { e.stopPropagation(); onReconnect(); }}
                                        disabled={isReconnecting}
                                        className="p-1 rounded hover:bg-zinc-800 text-zinc-500 hover:text-zinc-300 transition-colors disabled:opacity-50"
                                        title="Reconnect"
                                    >
                                        <RefreshCw size={12} className={isReconnecting ? 'animate-spin' : ''} />
                                    </button>
                                )}
                                <button
                                    onClick={(e) => { e.stopPropagation(); onDisconnect(); }}
                                    className="p-1 rounded hover:bg-zinc-800 text-zinc-500 hover:text-red-400 transition-colors"
                                    title="Disconnect"
                                >
                                    <Unlink size={12} />
                                </button>
                            </div>
                        </div>
                    </div>
                ) : (
                    <button
                        onClick={(e) => { e.stopPropagation(); onConnect(); }}
                        disabled={isConnecting}
                        className={cn(
                            'w-full flex items-center justify-center gap-1.5 py-1.5 rounded-lg text-xs font-medium transition-all',
                            isConnecting
                                ? 'bg-zinc-800 text-zinc-500 cursor-not-allowed'
                                : 'bg-zinc-800 hover:bg-zinc-700 text-zinc-300 hover:text-white border border-zinc-700/50 hover:border-zinc-600'
                        )}
                    >
                        {isConnecting ? (
                            <><Loader2 size={12} className="animate-spin" /> Connecting...</>
                        ) : (
                            <><Link2 size={12} /> Connect</>
                        )}
                    </button>
                )}
            </div>
        </motion.div>
    );
}
