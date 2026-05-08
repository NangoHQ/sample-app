import Link from 'next/link';
import { motion } from 'framer-motion';
import {
    Activity, MessageSquare, FolderOpen, GitBranch, Users, Cpu,
    Zap, Terminal, ArrowRight, ChevronRight
} from 'lucide-react';
import { Layout } from '../components/layout/Layout';
import { PROVIDERS, PROVIDER_GROUPS } from '../config/providers';

const FEATURE_HIGHLIGHTS = [
    {
        icon: Activity,
        color: '#6366f1',
        title: 'Connect UI',
        desc: 'One-line OAuth for any provider. No custom OAuth code. nango.openConnectUI() handles everything.',
        href: '/connect'
    },
    {
        icon: Zap,
        color: '#f97316',
        title: 'Webhooks',
        desc: 'Auth, sync, and forward webhooks from 700+ providers streamed live via SSE.',
        href: '/webhooks'
    },
    {
        icon: GitBranch,
        color: '#10b981',
        title: 'Syncs',
        desc: 'Background data sync with delta detection. Records normalized and stored automatically.',
        href: '/records'
    },
    {
        icon: Terminal,
        color: '#0ea5e9',
        title: 'Actions',
        desc: 'On-demand API calls via nango.triggerAction(). Zero OAuth token management in your code.',
        href: '/messaging'
    },
    {
        icon: Cpu,
        color: '#a855f7',
        title: 'MCP',
        desc: 'Three MCP patterns: Nango as MCP server, dedicated integrations, and MCP Generic.',
        href: '/mcp'
    },
    {
        icon: Terminal,
        color: '#6366f1',
        title: 'Proxy',
        desc: "Raw API calls through Nango's proxy. Auth token injected automatically.",
        href: '/developer'
    }
];

const GROUP_PAGES: Record<string, string> = {
    messaging: '/messaging',
    files: '/files',
    mcp: '/mcp',
    productivity: '/calendar'
};

const fadeUp = {
    hidden: { opacity: 0, y: 16 },
    show: { opacity: 1, y: 0 }
};

export default function HomePage() {
    return (
        <Layout>
            <div className="min-h-full">
                {/* Hero */}
                <div className="relative border-b border-zinc-800/60">
                    <div className="absolute inset-0 dot-pattern opacity-30" />
                    <div className="absolute inset-0 bg-gradient-to-b from-zinc-950/0 to-zinc-950" />
                    <div className="absolute top-0 left-1/4 w-96 h-96 bg-indigo-600/10 rounded-full blur-3xl" />
                    <div className="absolute top-0 right-1/4 w-64 h-64 bg-purple-600/8 rounded-full blur-3xl" />

                    <div className="relative px-8 pt-16 pb-12 max-w-4xl">
                        <motion.div
                            initial="hidden"
                            animate="show"
                            variants={{ show: { transition: { staggerChildren: 0.08 } } }}
                        >
                            <motion.div variants={fadeUp} className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-indigo-500/10 border border-indigo-500/20 mb-6">
                                <div className="w-1.5 h-1.5 rounded-full bg-indigo-400" />
                                <span className="text-indigo-300 text-xs font-medium">Interactive Developer Showcase</span>
                            </motion.div>

                            <motion.h1 variants={fadeUp} className="text-4xl font-bold text-white leading-tight mb-4">
                                Everything Nango<br />
                                <span className="text-transparent bg-clip-text bg-gradient-to-r from-indigo-400 to-purple-400">
                                    can do — live
                                </span>
                            </motion.h1>

                            <motion.p variants={fadeUp} className="text-zinc-400 text-lg leading-relaxed mb-8 max-w-2xl">
                                A fully functional sample app showcasing auth, syncs, actions, webhooks, MCP connections, and proxy — all with real data from real providers.
                            </motion.p>

                            <motion.div variants={fadeUp} className="flex items-center gap-3">
                                <Link
                                    href="/connect"
                                    className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-medium text-sm transition-all"
                                >
                                    Connect your first provider <ArrowRight size={14} />
                                </Link>
                                <a
                                    href="https://docs.nango.dev"
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-zinc-800 hover:bg-zinc-700 text-zinc-200 font-medium text-sm transition-all border border-zinc-700/60"
                                >
                                    Read the docs
                                </a>
                            </motion.div>
                        </motion.div>
                    </div>
                </div>

                <div className="px-8 py-10 max-w-6xl space-y-12">
                    {/* Feature grid */}
                    <section>
                        <h2 className="text-zinc-200 font-semibold text-base mb-5">What this app demonstrates</h2>
                        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                            {FEATURE_HIGHLIGHTS.map((feature, i) => {
                                const Icon = feature.icon;
                                return (
                                    <motion.div
                                        key={feature.title}
                                        initial={{ opacity: 0, y: 12 }}
                                        animate={{ opacity: 1, y: 0 }}
                                        transition={{ delay: i * 0.05 }}
                                    >
                                        <Link
                                            href={feature.href}
                                            className="group flex flex-col gap-3 rounded-xl border border-zinc-800/60 bg-zinc-900/40 p-5 hover:border-zinc-700/60 hover:bg-zinc-900/70 transition-all"
                                        >
                                            <div className="w-9 h-9 rounded-xl flex items-center justify-center" style={{ background: feature.color + '18' }}>
                                                <Icon size={17} style={{ color: feature.color }} />
                                            </div>
                                            <div>
                                                <div className="flex items-center gap-1.5">
                                                    <p className="text-zinc-100 font-semibold text-sm">{feature.title}</p>
                                                    <ChevronRight size={12} className="text-zinc-600 group-hover:text-zinc-400 transition-colors ml-auto" />
                                                </div>
                                                <p className="text-zinc-500 text-xs mt-1 leading-relaxed">{feature.desc}</p>
                                            </div>
                                        </Link>
                                    </motion.div>
                                );
                            })}
                        </div>
                    </section>

                    {/* Provider count by group */}
                    <section>
                        <h2 className="text-zinc-200 font-semibold text-base mb-5">
                            {PROVIDERS.length} providers across {PROVIDER_GROUPS.length} categories
                        </h2>
                        <div className="grid grid-cols-1 sm:grid-cols-5 gap-3">
                            {PROVIDER_GROUPS.map((group) => {
                                const count = PROVIDERS.filter((p) => p.group === group.id).length;
                                return (
                                    <Link
                                        key={group.id}
                                        href={GROUP_PAGES[group.id] ?? '/connect'}
                                        className="group rounded-xl border border-zinc-800/60 bg-zinc-900/40 p-4 hover:border-zinc-700/60 transition-all text-center"
                                    >
                                        <p className="text-2xl font-bold mb-1" style={{ color: group.color }}>{count}</p>
                                        <p className="text-zinc-300 text-xs font-medium">{group.label}</p>
                                    </Link>
                                );
                            })}
                        </div>
                    </section>

                </div>
            </div>
        </Layout>
    );
}
