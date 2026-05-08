import Link from 'next/link';
import { useRouter } from 'next/router';
import {
    LayoutGrid,
    MessageSquare,
    FolderOpen,
    Cpu,
    Zap,
    Terminal,
    ChevronRight,
    Activity,
    Calendar,
    BrainCircuit,
    Sparkles,
    PanelLeftClose,
    PanelLeftOpen
} from 'lucide-react';

const navItems = [
    { href: '/', label: 'Overview', icon: LayoutGrid, description: 'What Nango can do' },
    { href: '/connect', label: 'Connect', icon: Activity, description: 'Auth & Connect UI' },
    { href: '/ask', label: 'Ask AI', icon: Sparkles, description: 'Chat with integrations', badge: 'Beta' },
    { href: '/messaging', label: 'Messaging', icon: MessageSquare, description: 'Slack, Teams, Discord' },
    { href: '/files', label: 'Files', icon: FolderOpen, description: 'Drive, OneDrive, Box' },
    { href: '/calendar', label: 'Calendar', icon: Calendar, description: 'Google Calendar + AI' },
    { href: '/records', label: 'Records + AI', icon: BrainCircuit, description: 'Synced data + LLM' },
    { href: '/mcp', label: 'AI Tool Calling & MCP', icon: Cpu, description: 'Any LLM + MCP' },
    { href: '/webhooks', label: 'Live Webhooks', icon: Zap, description: 'Real-time event feed' },
    { href: '/developer', label: 'Dev Console', icon: Terminal, description: 'Proxy & inspect' }
];

interface SidebarProps {
    collapsed: boolean;
    onToggle: () => void;
}

export function Sidebar({ collapsed, onToggle }: SidebarProps) {
    const router = useRouter();

    return (
        <aside
            className={`flex flex-col h-full bg-zinc-950 border-r border-zinc-800/60 shrink-0 transition-all duration-200 ${collapsed ? 'w-[56px] overflow-visible' : 'w-[220px] overflow-hidden'}`}
        >
            {/* Logo */}
            <div className={`flex items-center border-b border-zinc-800/60 ${collapsed ? 'justify-center px-0 py-5' : 'gap-2.5 px-4 py-5'}`}>
                <div className="w-7 h-7 rounded-lg bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center shadow-lg shadow-indigo-500/20 shrink-0">
                    <span className="text-white font-bold text-xs">N</span>
                </div>
                {!collapsed && (
                    <div>
                        <p className="text-white font-semibold text-sm leading-none">Nango</p>
                        <p className="text-zinc-500 text-[10px] mt-0.5">Showcase App</p>
                    </div>
                )}
            </div>

            {/* Nav */}
            <nav className={`flex-1 px-2 py-3 space-y-0.5 ${collapsed ? 'overflow-visible' : 'overflow-y-auto'}`}>
                {navItems.map((item) => {
                    const Icon = item.icon;
                    const active = router.pathname === item.href;
                    return (
                        <div key={item.href} className="relative group/tooltip">
                            <Link
                                href={item.href}
                                className={`
                                    group flex items-center gap-3 px-3 py-2 rounded-lg text-sm transition-all
                                    ${collapsed ? 'justify-center px-0' : ''}
                                    ${active
                                        ? 'bg-zinc-800 text-white'
                                        : 'text-zinc-400 hover:text-zinc-100 hover:bg-zinc-800/50'
                                    }
                                `}
                            >
                                <Icon
                                    size={15}
                                    className={active ? 'text-indigo-400' : 'text-zinc-500 group-hover:text-zinc-300'}
                                />
                                {!collapsed && (
                                    <>
                                        <span className="flex-1 font-medium">{item.label}</span>
                                        {item.badge && (
                                            <span className="px-1.5 py-0.5 rounded text-[9px] font-semibold bg-indigo-500/20 text-indigo-300 border border-indigo-500/30">
                                                {item.badge}
                                            </span>
                                        )}
                                        {active && !item.badge && <ChevronRight size={12} className="text-zinc-500" />}
                                    </>
                                )}
                            </Link>
                            {collapsed && (
                                <div className="pointer-events-none absolute left-full top-1/2 -translate-y-1/2 ml-2 px-2 py-1 rounded-md bg-zinc-800 text-zinc-100 text-xs font-medium whitespace-nowrap opacity-0 group-hover/tooltip:opacity-100 transition-opacity duration-150 z-50 shadow-lg">
                                    {item.label}
                                </div>
                            )}
                        </div>
                    );
                })}
            </nav>

            {/* Footer */}
            <div className={`border-t border-zinc-800/60 ${collapsed ? 'flex justify-center px-0 py-4' : 'px-4 py-4'}`}>
                {collapsed ? (
                    <button
                        onClick={onToggle}
                        title="Expand sidebar"
                        className="text-zinc-500 hover:text-zinc-300 transition-colors"
                    >
                        <PanelLeftOpen size={15} />
                    </button>
                ) : (
                    <div className="flex items-center justify-between">
                        <a
                            href="https://nango.dev/docs"
                            target="_blank"
                            rel="noopener noreferrer"
                            className="flex items-center gap-2 text-xs text-zinc-500 hover:text-zinc-300 transition-colors"
                        >
                            <span>docs.nango.dev</span>
                            <ChevronRight size={10} />
                        </a>
                        <button
                            onClick={onToggle}
                            title="Collapse sidebar"
                            className="text-zinc-500 hover:text-zinc-300 transition-colors"
                        >
                            <PanelLeftClose size={15} />
                        </button>
                    </div>
                )}
            </div>
        </aside>
    );
}
