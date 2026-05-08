import { motion, AnimatePresence } from 'framer-motion';
import { CheckCircle2, Circle, Loader2, ExternalLink, X, Key, Globe, ShieldCheck, Database, Zap } from 'lucide-react';
import type { FlowStep } from '../hooks/useNangoConnect';

const STEP_ICONS = [Key, Globe, ShieldCheck, Database, Zap];

interface Props {
    provider: string;
    steps: FlowStep[];
    onClose: () => void;
}

export function ConnectFlowPanel({ provider, steps, onClose }: Props) {
    const allDone = steps.length > 0 && steps.every((s) => s.status === 'done');
    const hasError = steps.some((s) => s.status === 'error');
    const isReconnect = steps[0]?.label?.startsWith('Reconnect');

    return (
        <AnimatePresence>
            <motion.div
                initial={{ opacity: 0, y: 16 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: 8 }}
                transition={{ duration: 0.2 }}
                className="rounded-2xl border border-zinc-800/60 bg-zinc-900/80 backdrop-blur-sm overflow-hidden shadow-2xl shadow-black/40"
            >
                {/* Header */}
                <div className="flex items-center gap-3 px-5 py-4 border-b border-zinc-800/60">
                    <div className="w-8 h-8 rounded-lg bg-indigo-500/15 border border-indigo-500/30 flex items-center justify-center">
                        {allDone ? (
                            <CheckCircle2 size={16} className="text-emerald-400" />
                        ) : hasError ? (
                            <X size={16} className="text-red-400" />
                        ) : (
                            <Loader2 size={16} className="text-indigo-400 animate-spin" />
                        )}
                    </div>
                    <div className="flex-1">
                        <p className="text-zinc-100 text-sm font-semibold">
                            {allDone
                                ? (isReconnect ? `Reconnected to ${provider}` : `Connected to ${provider}`)
                                : hasError
                                ? (isReconnect ? 'Reconnection failed' : 'Connection failed')
                                : (isReconnect ? `Reconnecting to ${provider}…` : `Connecting to ${provider}…`)}
                        </p>
                        <p className="text-zinc-500 text-[11px] mt-0.5">
                            {allDone
                                ? 'Nango is handling token refresh automatically from now on'
                                : 'Watch what Nango does behind the scenes'}
                        </p>
                    </div>
                    {(allDone || hasError) && (
                        <button onClick={onClose} className="text-zinc-600 hover:text-zinc-300 transition-colors p-1 rounded">
                            <X size={14} />
                        </button>
                    )}
                </div>

                {/* Steps */}
                <div className="px-5 py-4 space-y-0">
                    {steps.map((step, i) => {
                        const Icon = STEP_ICONS[i] ?? Circle;
                        const isActive = step.status === 'active';
                        const isDone = step.status === 'done';
                        const isError = step.status === 'error';
                        const isPending = step.status === 'pending';

                        return (
                            <div key={step.id} className="flex gap-3">
                                {/* Timeline */}
                                <div className="flex flex-col items-center">
                                    <div className={`w-7 h-7 rounded-full flex items-center justify-center shrink-0 transition-all duration-300 ${
                                        isDone ? 'bg-emerald-500/20 border border-emerald-500/40' :
                                        isActive ? 'bg-indigo-500/20 border border-indigo-500/50' :
                                        isError ? 'bg-red-500/20 border border-red-500/40' :
                                        'bg-zinc-800/60 border border-zinc-700/40'
                                    }`}>
                                        {isActive ? (
                                            <Loader2 size={12} className="text-indigo-400 animate-spin" />
                                        ) : isDone ? (
                                            <CheckCircle2 size={12} className="text-emerald-400" />
                                        ) : isError ? (
                                            <X size={12} className="text-red-400" />
                                        ) : (
                                            <Icon size={12} className="text-zinc-600" />
                                        )}
                                    </div>
                                    {i < steps.length - 1 && (
                                        <div className={`w-px flex-1 my-1 min-h-[16px] transition-all duration-500 ${
                                            isDone ? 'bg-emerald-500/30' : 'bg-zinc-800'
                                        }`} />
                                    )}
                                </div>

                                {/* Content */}
                                <div className={`pb-4 flex-1 min-w-0 ${i === steps.length - 1 ? 'pb-0' : ''}`}>
                                    <p className={`text-xs font-medium transition-colors duration-200 ${
                                        isDone ? 'text-zinc-200' :
                                        isActive ? 'text-indigo-300' :
                                        isError ? 'text-red-400' :
                                        'text-zinc-600'
                                    }`}>
                                        {step.label}
                                    </p>
                                    {!isPending && (
                                        <motion.div
                                            initial={{ opacity: 0, height: 0 }}
                                            animate={{ opacity: 1, height: 'auto' }}
                                            transition={{ duration: 0.2 }}
                                        >
                                            <p className="text-zinc-600 text-[10px] mt-0.5 leading-relaxed">{step.sublabel}</p>
                                            {(isActive || isDone) && (
                                                <div className="flex items-center gap-2 mt-1.5">
                                                    <code className="text-[10px] font-mono text-indigo-400/80 bg-indigo-500/5 border border-indigo-500/15 px-1.5 py-0.5 rounded truncate max-w-[220px]">
                                                        {step.code}
                                                    </code>
                                                    <a
                                                        href={step.docsUrl}
                                                        target="_blank"
                                                        rel="noreferrer"
                                                        className="flex items-center gap-1 text-[10px] text-zinc-600 hover:text-indigo-400 transition-colors shrink-0"
                                                    >
                                                        <ExternalLink size={9} />
                                                        {step.docsLabel}
                                                    </a>
                                                </div>
                                            )}
                                        </motion.div>
                                    )}
                                </div>
                            </div>
                        );
                    })}
                </div>

                {/* Footer — only shown when done */}
                <AnimatePresence>
                    {allDone && (
                        <motion.div
                            initial={{ opacity: 0, height: 0 }}
                            animate={{ opacity: 1, height: 'auto' }}
                            className="border-t border-zinc-800/60 px-5 py-3 bg-emerald-500/5"
                        >
                            <p className="text-emerald-400 text-[11px] leading-relaxed">
                                {isReconnect
                                    ? 'Token replaced. Nango silently refreshes it before every API call — no further action needed.'
                                    : 'From now on, Nango silently refreshes the token if need be before every API call. You never handle credentials again.'}
                            </p>
                            <a
                                href="https://nango.dev/docs/implementation-guides/platform/auth/implement-api-auth"
                                target="_blank"
                                rel="noreferrer"
                                className="inline-flex items-center gap-1 text-[11px] text-indigo-400 hover:text-indigo-300 mt-1.5 transition-colors"
                            >
                                <ExternalLink size={10} />
                                Learn more about Nango connections
                            </a>
                        </motion.div>
                    )}
                </AnimatePresence>
            </motion.div>
        </AnimatePresence>
    );
}
