import { useState, useRef, useEffect } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { motion, AnimatePresence } from 'framer-motion';
import { Cpu, Link2, Loader2, Play, ChevronRight, CheckCircle2, Zap, Server, Send, Bot, CornerDownLeft, Sparkles, Terminal, Wrench, CircleCheck, FileText, ExternalLink, Hash, ChevronDown, AlertTriangle } from 'lucide-react';
import { toast } from 'sonner';
import Nango from '@nangohq/frontend';
import { Layout, useUser } from '../components/layout/Layout';
import { Badge } from '../components/ui/Badge';
import { getMCPProviders } from '../config/providers';
import { NangoLogo } from '../components/NangoLogo';
import { apiFetch, apiUrl, cn } from '../utils';

const MCP_PROVIDERS = getMCPProviders();

type MCPMethod = 'nango-server' | 'dedicated' | 'any-llm';

const METHOD_CONFIG: Record<MCPMethod, {
    label: string;
    icon: any;
    color: string;
    tagline: string;
    description: string;
    steps: string[];
    codeSnippet: string;
}> = {
    'nango-server': {
        label: 'Nango as MCP Server',
        icon: Server,
        color: '#6366f1',
        tagline: 'Your tools exposed as MCP — Nango routes calls',
        description: 'Your AI agent connects to Nango\'s MCP endpoint. Nango exposes your configured integrations and actions as MCP tools. You build the tools; Nango handles auth and routing.',
        steps: [
            'Deploy your Nango integrations (syncs + actions)',
            'Configure Nango as an MCP server in your AI agent',
            'Agent calls tools via MCP protocol',
            'Nango routes to the correct integration + handles token refresh'
        ],
        codeSnippet: `// Connect your AI agent to Nango's MCP server
import { experimental_createMCPClient } from 'ai';
import { StreamableHTTPClientTransport } from '@modelcontextprotocol/sdk/client/streamableHttp.js';

const mcpClient = await experimental_createMCPClient({
  transport: new StreamableHTTPClientTransport(
    new URL('https://api.nango.dev/mcp'),
    {
      requestInit: {
        headers: {
          'Authorization': \`Bearer \${nangoSecretKey}\`,
          'connection-id': connectionId,
          'provider-config-key': 'slack'
        }
      }
    }
  )
});

// Nango exposes your actions as tools
const tools = await mcpClient.tools();
// Use with any LLM via Vercel AI SDK
const { text } = await generateText({
  model: openai('gpt-4o-mini'),
  tools,
  messages: [{ role: 'user', content: 'Send a hello to #general' }]
});`
    },
    'dedicated': {
        label: 'Third-party MCP',
        icon: Zap,
        color: '#f97316',
        tagline: 'Provider\'s MCP server — Nango handles OAuth',
        description: 'Notion and Linear publish their own MCP servers. Nango handles the OAuth flow using PKCE and dynamic discovery — no client secrets needed. Connect once, and your agent calls the provider\'s tools directly.',
        steps: [
            'No client secret needed — PKCE + dynamic OAuth discovery',
            'Nango auto-discovers and registers an OAuth client with the provider',
            'User connects via standard OAuth flow',
            'Agent calls the provider\'s MCP server with Nango-managed tokens'
        ],
        codeSnippet: `// Connect to Notion or Linear MCP via Nango
const nango = new Nango({ secretKey: process.env.NANGO_SECRET_KEY });

// Get a valid access token (Nango handles refresh)
const token = await nango.getToken('notion-mcp', connectionId);

// Call Notion's MCP server directly
const client = new MCPClient({
  transport: new SSEClientTransport(
    new URL('https://mcp.notion.com/sse'),
    { requestInit: { headers: { 'Authorization': \`Bearer \${token}\` } } }
  )
});

const pages = await client.callTool('notion_search', { query: 'meeting notes' });`
    },
    'any-llm': {
        label: 'Any LLM',
        icon: Sparkles,
        color: '#10b981',
        tagline: 'LLM tool calling — Nango executes actions',
        description: 'Define your Nango actions as LLM tools. Your model decides which tool to call; Nango executes it with the user\'s managed credentials. Works with Claude, GPT, Gemini, or any model that supports tool calling.',
        steps: [
            'Define Nango actions as tool schemas for your LLM',
            'Send user prompt to LLM with tool definitions',
            'LLM returns a tool_call with arguments',
            'Execute the action via nango.triggerAction — Nango injects the token'
        ],
        codeSnippet: `import { Nango } from "@nangohq/node";

const nango = new Nango({ secretKey: process.env.NANGO_SECRET_KEY });

// Step 1: Check user is connected
const connections = await nango.listConnections({
  integrationId: "slack", tags: { end_user_id: userId }
});
const connectionId = connections.connections[0]?.connection_id;

// Step 2: Call LLM with Nango action as a tool
const response = await anthropic.messages.create({
  model: "claude-3-5-haiku-20241022",
  tools: [{
    name: "send_message",
    description: "Send a message to a Slack channel",
    input_schema: {
      type: "object",
      properties: {
        channel: { type: "string" },
        text: { type: "string" }
      },
      required: ["channel", "text"]
    }
  }],
  messages: [{ role: "user", content: userPrompt }]
});

// Step 3: Execute the tool via Nango
if (response.stop_reason === "tool_use") {
  const tool = response.content.find(b => b.type === "tool_use");
  const result = await nango.triggerAction(
    "slack", connectionId, "send-message", tool.input
  );
}`
    }
};

export default function MCPPage() {
    const { user } = useUser();
    const queryClient = useQueryClient();
    const [connecting, setConnecting] = useState<string | null>(null);
    const [activeMethod, setActiveMethod] = useState<MCPMethod>('nango-server');

    const handleConnect = async (providerConfigKey: string) => {
        setConnecting(providerConfigKey);
        try {
            // 1. Get a connect session token from our backend
            const res = await apiFetch(`/connect-session`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ integration: providerConfigKey, userId: user.id })
            });
            if (!res.ok) throw new Error('Failed to create connect session');
            const { token } = await res.json();

            // 2. Use nango.auth() with the session token — headless, no Connect UI
            const nango = new Nango({ connectSessionToken: token, host: apiUrl });
            const authOptions = (providerConfigKey === 'one-drive' || providerConfigKey === 'one-drive-personal')
                ? { authorization_params: { prompt: 'select_account' } }
                : {};
            const result = await nango.auth(providerConfigKey, authOptions);

            // 3. Save connection to our backend
            await apiFetch(`/connections`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ providerConfigKey, connectionId: result.connectionId, userId: user.id })
            });

            await queryClient.invalidateQueries({ queryKey: ['connections'] });
            toast.success(`${providerConfigKey} connected!`, { description: `Connection ID: ${result.connectionId}` });
        } catch (err: any) {
            if (err?.type !== 'windowClosed') {
                toast.error('Connection failed', { description: err?.message });
            }
        } finally {
            setConnecting(null);
        }
    };
    const { data: connections } = useQuery({
        queryKey: ['connections'],
        queryFn: async () => {
            const res = await apiFetch(`/connections`);
            if (!res.ok) return [];
            return (await res.json()).connections as { providerConfigKey: string; connectionId: string; broken: boolean }[];
        },
        refetchInterval: 5000
    });
    const connectedMap = new Map(connections?.map((c) => [c.providerConfigKey, c.connectionId]) ?? []);
    const methodConfig = METHOD_CONFIG[activeMethod];

    // Get providers that match current method
    const methodProviders = MCP_PROVIDERS.filter((p) => {
        if (activeMethod === 'nango-server') return false;
        if (activeMethod === 'dedicated') return p.id === 'notion-mcp';
        return false;
    });

    return (
        <Layout
            title="AI Tool Calling & MCP"
            description="Three ways to use Model Context Protocol with Nango"
        >
            <div className="p-6 max-w-6xl space-y-6">
                {/* Explainer banner */}
                <div className="rounded-xl border border-purple-500/20 bg-purple-500/5 p-4">
                    <div className="flex items-start gap-3">
                        <div className="w-8 h-8 rounded-lg bg-purple-500/20 flex items-center justify-center shrink-0">
                            <Cpu size={16} className="text-purple-400" />
                        </div>
                        <div>
                            <p className="text-purple-300 font-semibold text-sm">Model Context Protocol (MCP)</p>
                            <p className="text-zinc-400 text-xs mt-0.5 leading-relaxed max-w-2xl">
                                MCP lets AI agents call tools via a standard protocol. Nango supports three distinct patterns — each with different tradeoffs. Pick the right one for your use case.
                            </p>
                        </div>
                    </div>
                </div>

                {/* Method selector */}
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                    {(Object.entries(METHOD_CONFIG) as [MCPMethod, typeof METHOD_CONFIG[MCPMethod]][]).map(([method, config]) => {
                        const Icon = config.icon;
                        const active = activeMethod === method;
                        return (
                            <button
                                key={method}
                                onClick={() => setActiveMethod(method)}
                                className={cn(
                                    'text-left rounded-xl border p-4 transition-all',
                                    active
                                        ? 'border-transparent'
                                        : 'border-zinc-800/60 bg-zinc-900/40 hover:border-zinc-700/60 hover:bg-zinc-900/60'
                                )}
                                style={active ? {
                                    background: config.color + '12',
                                    borderColor: config.color + '40'
                                } : {}}
                            >
                                <div className="flex items-center gap-2 mb-2">
                                    <div className="w-7 h-7 rounded-lg flex items-center justify-center" style={{ background: config.color + '20' }}>
                                        <Icon size={14} style={{ color: config.color }} />
                                    </div>
                                    {active && (
                                        <div className="w-2 h-2 rounded-full ml-auto" style={{ background: config.color }} />
                                    )}
                                </div>
                                <p className="text-zinc-200 font-medium text-xs mb-1">{config.label}</p>
                                <p className="text-zinc-500 text-[11px]">{config.tagline}</p>
                            </button>
                        );
                    })}
                </div>

                {/* Active method detail */}
                <AnimatePresence mode="wait">
                    <motion.div
                        key={activeMethod}
                        initial={{ opacity: 0, y: 8 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: -8 }}
                        transition={{ duration: 0.2 }}
                        className="grid grid-cols-1 lg:grid-cols-5 gap-6"
                    >
                        {/* Left: description + steps + code */}
                        <div className="space-y-4 lg:col-span-2">
                            <div className="rounded-xl border border-zinc-800/60 bg-zinc-900/40 p-5">
                                <h3 className="text-zinc-100 font-semibold text-sm mb-2">{methodConfig.label}</h3>
                                <p className="text-zinc-400 text-xs leading-relaxed mb-4">{methodConfig.description}</p>
                                <div className="space-y-2">
                                    {methodConfig.steps.map((step, i) => (
                                        <div key={i} className="flex items-start gap-2.5">
                                            <div
                                                className="w-5 h-5 rounded-full flex items-center justify-center text-[10px] font-bold shrink-0 mt-0.5"
                                                style={{ background: methodConfig.color + '20', color: methodConfig.color }}
                                            >
                                                {i + 1}
                                            </div>
                                            <p className="text-zinc-400 text-xs">{step}</p>
                                        </div>
                                    ))}
                                </div>
                            </div>

                        </div>

                        {/* Right: live demo panel */}
                        <div className="space-y-4 lg:col-span-3">
                            <div className="rounded-xl border border-zinc-800/60 bg-zinc-900/40 p-5">
                                <div className="flex items-center gap-2 mb-4">
                                    <Play size={13} style={{ color: methodConfig.color }} />
                                    <span className="text-zinc-200 font-medium text-sm">Live Demo</span>
                                    <Badge variant="purple" size="xs">Real calls</Badge>
                                </div>

                                {activeMethod === 'nango-server' ? (
                                    <NangoServerDemo color={methodConfig.color} userId={user.id} connectedMap={connectedMap} />
                                ) : activeMethod === 'any-llm' ? (
                                    <AnyLLMDemo color={methodConfig.color} userId={user.id} connectedMap={connectedMap} />
                                ) : (
                                    <ThirdPartyMCPDemo
                                        providers={methodProviders}
                                        connectedMap={connectedMap}
                                        onConnect={handleConnect}
                                        connecting={connecting}
                                        color={methodConfig.color}
                                        userId={user.id}
                                    />
                                )}
                            </div>
                        </div>
                    </motion.div>
                </AnimatePresence>
            </div>
        </Layout>
    );
}

// All MCP tools exposed by this app's deployed integrations.
// `toolName` is the actual MCP tool name sent to Nango's MCP server
// (i.e. the Nango action name, without the integration prefix).
const MCP_TOOLS = [
    {
        name: 'slack_send-message',
        toolName: 'send-message',
        integration: 'slack',
        description: 'Send a message to a Slack channel or user',
        inputs: [
            { key: 'channel', label: 'Channel', placeholder: 'C1234567890' },
            { key: 'text', label: 'Message', placeholder: 'Hello from AI agent!' }
        ]
    }
];

function NangoServerDemo({ color, userId, connectedMap }: { color: string; userId: string; connectedMap: Map<string, string> }) {
    const queryClient = useQueryClient();
    const [selectedTool, setSelectedTool] = useState<typeof MCP_TOOLS[0] | null>(null);
    const [inputs, setInputs] = useState<Record<string, string>>({});
    const [calling, setCalling] = useState(false);
    const [result, setResult] = useState<any>(null);
    const [error, setError] = useState<string | null>(null);
    const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});

    const slackConnected = connectedMap.has('slack');
    const { data: slackChannels, isLoading: loadingChannels } = useQuery({
        queryKey: ['slack-channels', userId],
        enabled: slackConnected,
        staleTime: 60_000,
        queryFn: async () => {
            const res = await apiFetch(`/proxy`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ providerConfigKey: 'slack', method: 'GET', endpoint: '/conversations.list?limit=200&exclude_archived=true', userId })
            });
            if (!res.ok) return [];
            const json = await res.json();
            const channels: { id: string; name: string; is_member: boolean }[] = json.data?.channels ?? [];
            return channels.sort((a, b) => a.name.localeCompare(b.name));
        }
    });

    const [channelDropdownOpen, setChannelDropdownOpen] = useState(false);
    const channelDropdownRef = useRef<HTMLDivElement>(null);
    const [installingChannel, setInstallingChannel] = useState(false);

    useEffect(() => {
        const handler = (e: MouseEvent) => {
            if (channelDropdownRef.current && !channelDropdownRef.current.contains(e.target as Node)) {
                setChannelDropdownOpen(false);
            }
        };
        document.addEventListener('mousedown', handler);
        return () => document.removeEventListener('mousedown', handler);
    }, []);

    const memberChannels = slackChannels?.filter((c) => c.is_member) ?? [];
    const nonMemberChannels = slackChannels?.filter((c) => !c.is_member) ?? [];

    const installChannelInline = async (channelId: string, channelName: string) => {
        setInstallingChannel(true);
        try {
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
            if (!res.ok || json.data?.ok === false) throw new Error(json.data?.error ?? 'Failed to join');
            queryClient.setQueryData(['slack-channels', userId], (prev: { id: string; name: string; is_member: boolean }[] | undefined) =>
                prev?.map((c) => c.id === channelId ? { ...c, is_member: true } : c) ?? []
            );
            toast.success(`Bot installed to #${channelName} — ready to send messages`);
        } catch (err: any) {
            toast.error(`Failed to install bot`, { description: err?.message });
        } finally {
            setInstallingChannel(false);
        }
    };

    const selectTool = (tool: typeof MCP_TOOLS[0]) => {
        setSelectedTool(tool);
        setInputs({});
        setResult(null);
        setError(null);
        setFieldErrors({});
    };

    const callTool = async () => {
        if (!selectedTool) return;

        const errors: Record<string, string> = {};
        for (const field of selectedTool.inputs) {
            if (!inputs[field.key]?.trim()) {
                errors[field.key] = `${field.label} is required`;
            }
        }
        if (Object.keys(errors).length > 0) {
            setFieldErrors(errors);
            return;
        }
        setFieldErrors({});

        setCalling(true);
        setResult(null);
        setError(null);
        const start = Date.now();
        try {
            const res = await apiFetch(`/mcp/tool`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    providerConfigKey: selectedTool.integration,
                    tool: selectedTool.toolName,
                    input: inputs,
                    userId
                })
            });
            const json = await res.json();
            if (!res.ok) throw new Error(json.error ?? 'Tool call failed');
            setResult({ tool: selectedTool.name, status: 'success', latency_ms: Date.now() - start, result: json.result });
        } catch (err: any) {
            setError(err?.message ?? 'Tool call failed');
        } finally {
            setCalling(false);
        }
    };

    return (
        <div className="space-y-4">
            {/* Tool picker */}
            <div>
                <p className="text-zinc-500 text-[11px] mb-2 uppercase tracking-wider">Available MCP tools</p>
                <div className="space-y-1.5 max-h-52 overflow-y-auto pr-1">
                    {MCP_TOOLS.map((tool) => {
                        const connected = connectedMap.has(tool.integration);
                        return (
                            <button
                                key={tool.name}
                                onClick={() => connected && selectTool(tool)}
                                disabled={!connected}
                                className={cn(
                                    'w-full flex items-start gap-3 px-3 py-2.5 rounded-lg border text-left transition-all',
                                    !connected && 'opacity-40 cursor-not-allowed',
                                    selectedTool?.name === tool.name
                                        ? 'border-indigo-500/40 bg-indigo-500/10'
                                        : connected
                                            ? 'border-zinc-800/60 bg-zinc-900/40 hover:border-zinc-700/60'
                                            : 'border-zinc-800/40 bg-zinc-900/20'
                                )}
                            >
                                <NangoLogo integrationId={tool.integration} className="w-4 h-4 mt-0.5 shrink-0" fallback={tool.integration[0].toUpperCase()} />
                                <div className="min-w-0 flex-1">
                                    <code className="text-zinc-300 text-[11px] font-mono">{tool.name}</code>
                                    <p className="text-zinc-600 text-[10px] truncate mt-0.5">{tool.description}</p>
                                </div>
                                {connected ? (
                                    selectedTool?.name === tool.name ? (
                                        <ChevronRight size={12} className="text-indigo-400 ml-auto mt-0.5 shrink-0" />
                                    ) : (
                                        <div className="w-1.5 h-1.5 rounded-full bg-emerald-400 ml-auto mt-1.5 shrink-0" />
                                    )
                                ) : (
                                    <span className="text-zinc-600 text-[10px] ml-auto mt-0.5 shrink-0">not connected</span>
                                )}
                            </button>
                        );
                    })}
                </div>
            </div>

            {/* Inputs + run */}
            <AnimatePresence mode="wait">
                {selectedTool && (
                    <motion.div
                        key={selectedTool.name}
                        initial={{ opacity: 0, y: 6 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0 }}
                        className="border-t border-zinc-800/60 pt-4 space-y-3"
                    >
                        {selectedTool.inputs.map((field) => {
                            const isChannelField = field.key === 'channel' && selectedTool.integration === 'slack';
                            const hasError = !!fieldErrors[field.key];
                            const clearError = () => {
                                if (hasError) setFieldErrors((p) => ({ ...p, [field.key]: '' }));
                            };
                            return (
                                <div key={field.key}>
                                    <label className="text-zinc-500 text-[11px] block mb-1">{field.label}</label>
                                    {isChannelField ? (() => {
                                        const selectedChannel = slackChannels?.find((c) => c.id === inputs[field.key]);
                                        const needsInstall = selectedChannel && !selectedChannel.is_member;
                                        return (
                                            <div ref={channelDropdownRef} className="relative">
                                                {/* Trigger button */}
                                                <button
                                                    type="button"
                                                    onClick={() => !loadingChannels && setChannelDropdownOpen((v) => !v)}
                                                    disabled={loadingChannels}
                                                    className={cn(
                                                        'w-full flex items-center gap-2 bg-zinc-800/60 border rounded-lg px-3 py-1.5 text-xs focus:outline-none font-mono text-left transition-colors',
                                                        hasError ? 'border-red-500/60' : needsInstall ? 'border-amber-500/40' : 'border-zinc-700/60 hover:border-zinc-600',
                                                        loadingChannels && 'opacity-50 cursor-wait'
                                                    )}
                                                >
                                                    {loadingChannels ? (
                                                        <span className="text-zinc-500 flex-1">Loading channels…</span>
                                                    ) : selectedChannel ? (
                                                        <>
                                                            <Hash size={10} className="text-zinc-500 shrink-0" />
                                                            <span className="text-zinc-200 flex-1 truncate">{selectedChannel.name}</span>
                                                            {needsInstall && <AlertTriangle size={10} className="text-amber-400 shrink-0" />}
                                                        </>
                                                    ) : (
                                                        <span className="text-zinc-500 flex-1">Select a channel</span>
                                                    )}
                                                    <ChevronDown size={10} className={cn('text-zinc-600 shrink-0 transition-transform', channelDropdownOpen && 'rotate-180')} />
                                                </button>

                                                {/* Dropdown panel */}
                                                {channelDropdownOpen && (
                                                    <div className="absolute z-50 left-0 right-0 mt-1 bg-zinc-900 border border-zinc-700/60 rounded-lg shadow-xl overflow-hidden max-h-64 overflow-y-auto">
                                                        {memberChannels.length > 0 && (
                                                            <>
                                                                <div className="flex items-center gap-1.5 px-2.5 py-1.5 text-[9px] uppercase tracking-wider text-zinc-500 bg-zinc-800/40 border-b border-zinc-800">
                                                                    <div className="w-1.5 h-1.5 rounded-full bg-emerald-400" />
                                                                    Bot installed · ready to send
                                                                </div>
                                                                {memberChannels.map((ch) => (
                                                                    <button
                                                                        key={ch.id}
                                                                        type="button"
                                                                        onClick={() => { setInputs((p) => ({ ...p, [field.key]: ch.id })); clearError(); setChannelDropdownOpen(false); }}
                                                                        className={cn(
                                                                            'w-full flex items-center gap-2 px-2.5 py-2 text-left hover:bg-zinc-800/60 transition-colors',
                                                                            inputs[field.key] === ch.id && 'bg-zinc-800/60'
                                                                        )}
                                                                    >
                                                                        <Hash size={10} className="text-zinc-600 shrink-0" />
                                                                        <span className="text-zinc-300 text-xs flex-1 truncate">{ch.name}</span>
                                                                        {inputs[field.key] === ch.id && <CheckCircle2 size={10} className="text-emerald-400 shrink-0" />}
                                                                    </button>
                                                                ))}
                                                            </>
                                                        )}
                                                        {nonMemberChannels.length > 0 && (
                                                            <>
                                                                <div className="flex items-center gap-1.5 px-2.5 py-1.5 text-[9px] uppercase tracking-wider text-zinc-500 bg-zinc-800/40 border-t border-b border-zinc-800">
                                                                    <AlertTriangle size={9} className="text-amber-500/60" />
                                                                    Install bot first
                                                                </div>
                                                                {nonMemberChannels.map((ch) => (
                                                                    <button
                                                                        key={ch.id}
                                                                        type="button"
                                                                        onClick={() => { setInputs((p) => ({ ...p, [field.key]: ch.id })); clearError(); setChannelDropdownOpen(false); }}
                                                                        className={cn(
                                                                            'w-full flex items-center gap-2 px-2.5 py-2 text-left hover:bg-zinc-800/40 transition-colors',
                                                                            inputs[field.key] === ch.id && 'bg-zinc-800/40'
                                                                        )}
                                                                    >
                                                                        <Hash size={10} className="text-zinc-500 shrink-0" />
                                                                        <span className="text-zinc-500 text-xs flex-1 truncate">{ch.name}</span>
                                                                        <AlertTriangle size={9} className="text-amber-500/50 shrink-0" />
                                                                    </button>
                                                                ))}
                                                            </>
                                                        )}
                                                    </div>
                                                )}

                                                {/* Inline install CTA */}
                                                {needsInstall && (
                                                    <div className="mt-1.5 flex items-center gap-2 px-2.5 py-2 rounded-lg border border-amber-500/20 bg-amber-500/5">
                                                        <AlertTriangle size={11} className="text-amber-400 shrink-0" />
                                                        <span className="text-amber-400/80 text-[10px] flex-1 leading-relaxed">
                                                            Bot not in <span className="font-medium">#{selectedChannel.name}</span> — install it first.
                                                        </span>
                                                        <button
                                                            type="button"
                                                            onClick={() => installChannelInline(selectedChannel.id, selectedChannel.name)}
                                                            disabled={installingChannel}
                                                            className="flex items-center gap-1 text-[10px] px-2 py-1 rounded bg-amber-500/15 hover:bg-amber-500/25 text-amber-400 transition-colors shrink-0 disabled:opacity-50"
                                                        >
                                                            {installingChannel ? <Loader2 size={9} className="animate-spin" /> : <Hash size={9} />}
                                                            Install bot
                                                        </button>
                                                    </div>
                                                )}
                                            </div>
                                        );
                                    })() : (
                                        <input
                                            value={inputs[field.key] ?? ''}
                                            onChange={(e) => { setInputs((p) => ({ ...p, [field.key]: e.target.value })); clearError(); }}
                                            placeholder={field.placeholder}
                                            className={cn(
                                                'w-full bg-zinc-800/60 border rounded-lg px-3 py-1.5 text-zinc-200 text-xs placeholder-zinc-600 focus:outline-none font-mono',
                                                hasError ? 'border-red-500/60 focus:border-red-500' : 'border-zinc-700/60 focus:border-zinc-500'
                                            )}
                                        />
                                    )}
                                    {hasError && (
                                        <p className="text-red-400 text-[10px] mt-1">{fieldErrors[field.key]}</p>
                                    )}
                                </div>
                            );
                        })}

                        <button
                            onClick={callTool}
                            disabled={calling}
                            className="w-full flex items-center justify-center gap-2 py-2.5 rounded-lg text-sm font-medium text-white transition-all"
                            style={{ background: calling ? '#3f3f46' : color }}
                        >
                            {calling ? <Loader2 size={14} className="animate-spin" /> : <Play size={14} />}
                            {calling ? 'Calling tool...' : `Call ${selectedTool.name}`}
                        </button>
                    </motion.div>
                )}
            </AnimatePresence>

            {/* Result */}
            <AnimatePresence>
                {result && (
                    <motion.div
                        initial={{ opacity: 0, y: 8 }}
                        animate={{ opacity: 1, y: 0 }}
                        className="rounded-lg border border-emerald-500/20 bg-emerald-500/5 p-3"
                    >
                        <div className="flex items-center gap-2 mb-2">
                            <CheckCircle2 size={13} className="text-emerald-400" />
                            <span className="text-emerald-400 text-xs font-medium">Tool call result</span>
                            <span className="text-zinc-600 text-[10px] ml-auto">{result.latency_ms}ms</span>
                        </div>
                        <pre className="text-[11px] font-mono text-zinc-400 overflow-x-auto leading-relaxed">
                            {JSON.stringify(result.result ?? result, null, 2)}
                        </pre>
                    </motion.div>
                )}
                {error && (
                    <motion.div
                        initial={{ opacity: 0, y: 8 }}
                        animate={{ opacity: 1, y: 0 }}
                        className="rounded-lg border border-red-500/20 bg-red-500/5 p-3"
                    >
                        <p className="text-red-400 text-xs font-medium mb-1">Tool call failed</p>
                        <p className="text-zinc-400 text-[11px] font-mono">{error}</p>
                    </motion.div>
                )}
            </AnimatePresence>
        </div>
    );
}

type ChatMsg =
    | { role: 'user'; text: string }
    | { role: 'thinking'; steps: string[]; visibleSteps: number }
    | { role: 'result'; tool: string; data: any; error?: string };

const SUGGESTIONS = [
    'Search my notes about onboarding',
    'Find pages related to Q1 planning',
    'Look up meeting notes',
];

function resolveTool(message: string): { tool: string | null; input: Record<string, string>; steps: string[] } {
    const STOP_WORDS = /\b(search|find|show|get|list|my|notion|pages?|notes?|about|in|for|the|on|look\s+up|just|give|that|has|with|which|where|titled?|named?|called|a|an|and|or|is|are|it|its|me|us|what|all|any|some|one|ones?|results?|return|returns?|how|why|who|when|do|does|did|have|had|will|would|could|should|can|may|might|must|i|you|we|they|many|much|few|more|most|currently|now|today|recently|still|yet|already|want|need|please|check|tell|see|count|number|make|help)\b/gi;
    const query = message.replace(STOP_WORDS, '').replace(/\s{2,}/g, ' ').trim();

    // If nothing meaningful is left after stripping, don't fire a search
    if (query.length < 3) {
        return { tool: null, input: { query: '' }, steps: [] };
    }

    return {
        tool: 'notion-search',
        input: { query },
        steps: [
            'Analysing intent…',
            'Intent: search Notion pages',
            `Tool selected: notion-search`,
            `Arguments: { query: "${query.slice(0, 50)}" }`,
            'Calling Notion MCP via Nango proxy…',
        ]
    };
}


function MCPResultView({ providerId, data }: { providerId: string; data: any }) {
    if (providerId === 'notion-mcp') {
        // Notion wraps the payload as a JSON string inside content[0].text
        let parsed: any = null;
        try {
            const text = data?.content?.[0]?.text ?? data?.text ?? data;
            parsed = typeof text === 'string' ? JSON.parse(text) : text;
        } catch {
            parsed = null;
        }
        const results: any[] = parsed?.results ?? [];
        if (parsed !== null) {
            if (results.length > 0) return <NotionResultCards results={results} />;
            return (
                <div className="rounded-xl rounded-tl-sm bg-zinc-900 border border-zinc-800/60 px-4 py-5 flex flex-col items-center gap-2 text-center">
                    <FileText size={18} className="text-zinc-600" />
                    <p className="text-zinc-400 text-xs font-medium">No pages found</p>
                    <p className="text-zinc-600 text-[11px]">Try a different search term</p>
                </div>
            );
        }
    }

    // Fallback: raw JSON
    return (
        <div className="rounded-xl rounded-tl-sm bg-zinc-900 border border-zinc-800/60 px-3 py-2">
            <pre className="text-[10px] font-mono text-zinc-400 overflow-x-auto leading-relaxed max-h-48">
                {JSON.stringify(data, null, 2)}
            </pre>
        </div>
    );
}

function NotionResultCards({ results }: { results: any[] }) {
    return (
        <div className="space-y-1.5">
            <p className="text-zinc-500 text-[10px] uppercase tracking-wider mb-2">
                {results.length} result{results.length !== 1 ? 's' : ''} from Notion
            </p>
            {results.map((r) => {
                const rawUrl = r.url as string | undefined;
                const notionUrl = rawUrl?.startsWith('http')
                    ? rawUrl
                    : `https://www.notion.so/${(r.id ?? '').replace(/-/g, '')}`;
                const relTime = r.timestamp
                    ? new Intl.RelativeTimeFormat('en', { numeric: 'auto' }).format(
                        Math.round((new Date(r.timestamp).getTime() - Date.now()) / (1000 * 60 * 60 * 24)),
                        'day'
                      )
                    : null;

                return (
                    <motion.a
                        key={r.id}
                        href={notionUrl}
                        target="_blank"
                        rel="noreferrer"
                        initial={{ opacity: 0, y: 4 }}
                        animate={{ opacity: 1, y: 0 }}
                        className="group flex items-start gap-2.5 px-3 py-2.5 rounded-lg border border-zinc-800/60 bg-zinc-900/60 hover:border-zinc-700 hover:bg-zinc-800/60 transition-all"
                    >
                        <div className="w-5 h-5 rounded flex items-center justify-center shrink-0 mt-0.5 bg-zinc-800">
                            <FileText size={10} className="text-zinc-400" />
                        </div>
                        <div className="min-w-0 flex-1">
                            <div className="flex items-center gap-1.5 mb-0.5">
                                <p className="text-zinc-200 text-xs font-medium truncate">{r.title || '(Untitled)'}</p>
                                <ExternalLink size={9} className="text-zinc-600 group-hover:text-zinc-400 transition-colors shrink-0" />
                            </div>
                            {r.highlight && (
                                <p className="text-zinc-500 text-[10px] leading-relaxed line-clamp-2">
                                    {r.highlight}
                                </p>
                            )}
                        </div>
                        {relTime && (
                            <span className="text-zinc-600 text-[9px] shrink-0 mt-0.5">{relTime}</span>
                        )}
                    </motion.a>
                );
            })}
        </div>
    );
}

function ThirdPartyMCPDemo({ providers, connectedMap, onConnect, connecting, color, userId }: any) {
    const [selectedProvider, setSelectedProvider] = useState<string | null>(null);
    const [messages, setMessages] = useState<ChatMsg[]>([]);
    const [draft, setDraft] = useState('');
    const [busy, setBusy] = useState(false);
    const bottomRef = useRef<HTMLDivElement>(null);
    const inputRef = useRef<HTMLInputElement>(null);

    // Auto-scroll on new messages
    useEffect(() => {
        bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
    }, [messages]);

    const selectProvider = (id: string) => {
        setSelectedProvider(id);
        setMessages([]);
        setDraft('');
        setTimeout(() => inputRef.current?.focus(), 100);
    };

    const send = async (text: string) => {
        if (!text.trim() || !selectedProvider || busy) return;
        setBusy(true);
        setDraft('');

        const { tool, input, steps } = resolveTool(text.trim());

        // If intent is too vague to search, show a hint inline
        if (!tool) {
            setMessages(prev => [...prev,
                { role: 'user', text: text.trim() },
                { role: 'result', tool: 'notion-search', data: null, error: 'This interface searches your Notion pages by topic. Try: "search notes about onboarding" or "find Q1 planning".' }
            ]);
            setBusy(false);
            return;
        }

        // Add user message + thinking placeholder
        const thinkingMsg: ChatMsg = { role: 'thinking', steps, visibleSteps: 0 };
        setMessages(prev => [...prev, { role: 'user', text: text.trim() }, thinkingMsg]);

        // Reveal thinking steps one by one
        for (let i = 1; i <= steps.length; i++) {
            await new Promise(r => setTimeout(r, 380));
            setMessages(prev => prev.map((m, idx) =>
                idx === prev.length - 1 && m.role === 'thinking'
                    ? { ...m, visibleSteps: i }
                    : m
            ));
        }

        // Make real API call
        try {
            const res = await apiFetch(`/mcp/tool`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ providerConfigKey: selectedProvider, tool, input, userId })
            });
            const json = await res.json();
            if (!res.ok) throw new Error(json.error);
            setMessages(prev => [...prev, { role: 'result', tool, data: json.result }]);
        } catch (err: any) {
            setMessages(prev => [...prev, { role: 'result', tool, data: null, error: err?.message }]);
        } finally {
            setBusy(false);
        }
    };

    const providerConfig = providers.find((p: any) => p.id === selectedProvider);
    const suggestions = SUGGESTIONS;

    return (
        <div className="space-y-3">
            {/* Provider picker */}
            <div className="space-y-2">
                {providers.map((p: any) => {
                    const connected = connectedMap.has(p.id);
                    const active = selectedProvider === p.id;
                    return (
                        <div
                            key={p.id}
                            className={cn(
                                'flex items-center gap-3 px-3 py-2.5 rounded-lg border transition-all',
                                connected ? 'cursor-pointer' : 'cursor-default',
                                active ? 'border-zinc-600 bg-zinc-800' : 'border-zinc-800/60 bg-zinc-900/40 hover:border-zinc-700/60'
                            )}
                            onClick={() => connected && selectProvider(p.id)}
                        >
                            <div className="w-7 h-7 rounded flex items-center justify-center shrink-0" style={{ background: p.bgColor }}>
                                <NangoLogo integrationId={p.id} className="w-4 h-4" fallback={p.name[0]} />
                            </div>
                            <div className="flex-1 min-w-0">
                                <p className="text-zinc-200 text-sm font-medium">{p.name}</p>
                                <p className="text-zinc-500 text-[10px]">PKCE + dynamic OAuth — no client secret</p>
                            </div>
                            {connected ? (
                                <div className="flex items-center gap-1 text-[10px] text-emerald-400">
                                    <div className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                                    Connected
                                </div>
                            ) : (
                                <button
                                    onClick={(e) => { e.stopPropagation(); onConnect(p.id); }}
                                    disabled={connecting === p.id}
                                    className="flex items-center gap-1 text-[11px] text-zinc-400 hover:text-white px-2 py-1 rounded bg-zinc-800 border border-zinc-700/50 transition-all"
                                >
                                    {connecting === p.id ? <Loader2 size={10} className="animate-spin" /> : <Link2 size={10} />}
                                    Connect
                                </button>
                            )}
                        </div>
                    );
                })}
            </div>

            {/* Chat interface — only shown when a provider is selected */}
            <AnimatePresence mode="wait">
                {selectedProvider && providerConfig && (
                    <motion.div
                        key={selectedProvider}
                        initial={{ opacity: 0, y: 8 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0 }}
                        className="border border-zinc-800/60 rounded-xl overflow-hidden"
                    >
                        {/* Chat header */}
                        <div className="flex items-center gap-2 px-3 py-2 border-b border-zinc-800/60 bg-zinc-900/60">
                            <Bot size={13} style={{ color }} />
                            <span className="text-zinc-300 text-xs font-medium">AI Agent — {providerConfig.name}</span>
                            <span className="text-zinc-600 text-[10px] ml-auto">Type in plain English</span>
                        </div>

                        {/* Messages */}
                        <div className="h-56 overflow-y-auto px-3 py-3 space-y-3 bg-zinc-950/40">
                            {messages.length === 0 && (
                                <div className="h-full flex flex-col items-center justify-center gap-3">
                                    <p className="text-zinc-600 text-xs text-center">Try asking something in plain English</p>
                                    <div className="flex flex-wrap gap-1.5 justify-center">
                                        {suggestions.map((s) => (
                                            <button
                                                key={s}
                                                onClick={() => send(s)}
                                                className="text-[11px] text-zinc-400 hover:text-white px-2.5 py-1 rounded-full border border-zinc-700/60 hover:border-zinc-500 bg-zinc-800/40 transition-all"
                                            >
                                                {s}
                                            </button>
                                        ))}
                                    </div>
                                </div>
                            )}

                            {messages.map((msg, i) => (
                                <div key={i}>
                                    {msg.role === 'user' && (
                                        <div className="flex justify-end">
                                            <div className="bg-zinc-700/60 rounded-xl rounded-tr-sm px-3 py-2 max-w-[80%]">
                                                <p className="text-zinc-200 text-xs">{msg.text}</p>
                                            </div>
                                        </div>
                                    )}

                                    {msg.role === 'thinking' && (
                                        <div className="flex items-start gap-2">
                                            <div className="w-5 h-5 rounded-full flex items-center justify-center shrink-0 mt-0.5" style={{ background: color + '20' }}>
                                                <Bot size={10} style={{ color }} />
                                            </div>
                                            <div className="bg-zinc-900 border border-zinc-800/60 rounded-xl rounded-tl-sm px-3 py-2 space-y-1 min-w-0">
                                                {msg.steps.slice(0, msg.visibleSteps).map((step, si) => (
                                                    <motion.p
                                                        key={si}
                                                        initial={{ opacity: 0, x: -4 }}
                                                        animate={{ opacity: 1, x: 0 }}
                                                        className={cn(
                                                            'text-[11px] font-mono',
                                                            si === 0 ? 'text-zinc-400' :
                                                            step.startsWith('Tool') ? 'text-indigo-400' :
                                                            step.startsWith('Arguments') ? 'text-amber-400/80' :
                                                            step.startsWith('Intent') ? 'text-zinc-300' :
                                                            'text-zinc-500'
                                                        )}
                                                    >
                                                        {si > 0 ? '→ ' : ''}{step}
                                                    </motion.p>
                                                ))}
                                                {msg.visibleSteps < msg.steps.length && (
                                                    <span className="inline-flex gap-0.5">
                                                        {[0,1,2].map(d => (
                                                            <span key={d} className="w-1 h-1 rounded-full bg-zinc-500 animate-bounce" style={{ animationDelay: `${d * 150}ms` }} />
                                                        ))}
                                                    </span>
                                                )}
                                            </div>
                                        </div>
                                    )}

                                    {msg.role === 'result' && (
                                        <div className="flex items-start gap-2">
                                            <div className="w-5 h-5 rounded-full flex items-center justify-center shrink-0 mt-0.5" style={{ background: color + '20' }}>
                                                <CheckCircle2 size={10} style={{ color }} />
                                            </div>
                                            <div className="flex-1 min-w-0">
                                                {msg.error ? (
                                                    <div className="rounded-xl rounded-tl-sm px-3 py-2 bg-red-500/10 border border-red-500/20">
                                                        <p className="text-red-400 text-[11px]">{msg.error}</p>
                                                    </div>
                                                ) : (
                                                    <MCPResultView providerId={selectedProvider!} data={msg.data} />
                                                )}
                                            </div>
                                        </div>
                                    )}
                                </div>
                            ))}
                            <div ref={bottomRef} />
                        </div>

                        {/* Input */}
                        <div className="flex items-center gap-2 px-3 py-2.5 border-t border-zinc-800/60 bg-zinc-900/40">
                            <input
                                ref={inputRef}
                                value={draft}
                                onChange={(e) => setDraft(e.target.value)}
                                onKeyDown={(e) => e.key === 'Enter' && !e.shiftKey && send(draft)}
                                placeholder={`Ask about your ${providerConfig.name}…`}
                                disabled={busy}
                                className="flex-1 bg-transparent text-zinc-200 text-xs placeholder-zinc-600 focus:outline-none disabled:opacity-50"
                            />
                            <button
                                onClick={() => send(draft)}
                                disabled={!draft.trim() || busy}
                                className="flex items-center gap-1 text-[11px] px-2.5 py-1.5 rounded-lg font-medium text-white transition-all disabled:opacity-40"
                                style={{ background: color }}
                            >
                                {busy ? <Loader2 size={11} className="animate-spin" /> : <Send size={11} />}
                                {busy ? '' : 'Send'}
                            </button>
                        </div>
                    </motion.div>
                )}
            </AnimatePresence>
        </div>
    );
}


// `enabled` marks integrations that are fully wired up in this demo.
// Others are shown but disabled (coming soon).
const AGENT_INTEGRATIONS: { id: string; label: string; placeholder: string; enabled: boolean }[] = [
    { id: 'slack', label: 'Slack', placeholder: 'Send "hello world" to channel C1234567890', enabled: true }
];

type AgentStep =
    | { type: 'connection_check'; status: string; message: string }
    | { type: 'llm_request'; model: string; prompt: string; tools: string[] }
    | { type: 'llm_text'; text: string }
    | { type: 'tool_call'; tool: string; nangoAction: string; arguments: any }
    | { type: 'tool_result'; tool: string; result: any }
    | { type: 'tool_error'; tool: string; error: string }
    | { type: 'final_response'; text: string };

const STEP_ICONS: Record<AgentStep['type'], any> = {
    connection_check: CircleCheck,
    llm_request: Bot,
    llm_text: Bot,
    tool_call: Wrench,
    tool_result: CheckCircle2,
    tool_error: Terminal,
    final_response: Sparkles
};

const STEP_COLORS: Record<AgentStep['type'], string> = {
    connection_check: '#10b981',
    llm_request: '#6366f1',
    llm_text: '#6366f1',
    tool_call: '#f97316',
    tool_result: '#10b981',
    tool_error: '#ef4444',
    final_response: '#10b981'
};

function StepRow({ step }: { step: AgentStep }) {
    const Icon = STEP_ICONS[step.type];
    const color = STEP_COLORS[step.type];

    const label = (() => {
        switch (step.type) {
            case 'connection_check': return step.message;
            case 'llm_request': return `Calling ${step.model} with ${step.tools.length} tool(s)…`;
            case 'llm_text': return `Model: "${step.text.slice(0, 80)}${step.text.length > 80 ? '…' : ''}"`;
            case 'tool_call': return `Tool call → ${step.tool}(${JSON.stringify(step.arguments).slice(0, 60)})`;
            case 'tool_result': return `nango.triggerAction("${step.tool}") succeeded`;
            case 'tool_error': return `Tool error: ${step.error}`;
            case 'final_response': return step.text ? `Model: "${step.text.slice(0, 80)}${step.text.length > 80 ? '…' : ''}"` : 'Done';
        }
    })();

    const detail = (() => {
        if (step.type === 'tool_result') return JSON.stringify(step.result, null, 2);
        if (step.type === 'final_response' && step.text.length > 80) return step.text;
        return null;
    })();

    return (
        <motion.div
            initial={{ opacity: 0, x: -8 }}
            animate={{ opacity: 1, x: 0 }}
            className="flex items-start gap-2.5"
        >
            <div className="w-5 h-5 rounded-full flex items-center justify-center shrink-0 mt-0.5" style={{ background: color + '20' }}>
                <Icon size={10} style={{ color }} />
            </div>
            <div className="min-w-0 flex-1">
                <p className="text-zinc-300 text-[11px] font-mono leading-relaxed">{label}</p>
                {detail && (
                    <pre className="text-zinc-500 text-[10px] font-mono mt-1 overflow-x-auto max-h-32 leading-relaxed">
                        {detail}
                    </pre>
                )}
            </div>
        </motion.div>
    );
}

function AnyLLMDemo({ color, userId, connectedMap }: { color: string; userId: string; connectedMap: Map<string, string> }) {
    const [selectedIntegration, setSelectedIntegration] = useState<string | null>(() => {
        try { return localStorage.getItem('mcp_agent_integration') ?? null; } catch { return null; }
    });
    const [prompt, setPrompt] = useState('');
    const [running, setRunning] = useState(false);
    const [turns, setTurns] = useState<{ userText: string; steps: AgentStep[] }[]>(() => {
        try { return JSON.parse(localStorage.getItem('mcp_agent_turns') ?? '[]'); } catch { return []; }
    });
    const [conversationMessages, setConversationMessages] = useState<{ role: string; content: string }[] | null>(() => {
        try { return JSON.parse(localStorage.getItem('mcp_agent_messages') ?? 'null'); } catch { return null; }
    });
    const [followUp, setFollowUp] = useState('');
    const bottomRef = useRef<HTMLDivElement>(null);
    const followUpRef = useRef<HTMLInputElement>(null);

    useEffect(() => {
        bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
    }, [turns, running]);

    useEffect(() => {
        try { localStorage.setItem('mcp_agent_integration', selectedIntegration ?? ''); } catch {}
    }, [selectedIntegration]);

    useEffect(() => {
        try { localStorage.setItem('mcp_agent_turns', JSON.stringify(turns)); } catch {}
    }, [turns]);

    useEffect(() => {
        try { localStorage.setItem('mcp_agent_messages', JSON.stringify(conversationMessages)); } catch {}
    }, [conversationMessages]);

    const runAgent = async (userText: string, messages?: { role: string; content: string }[]) => {
        if (!selectedIntegration || running) return;
        setRunning(true);

        const body: any = { providerConfigKey: selectedIntegration, userId };
        if (messages) {
            body.messages = [...messages, { role: 'user', content: userText }];
        } else {
            body.prompt = userText;
        }

        try {
            const res = await apiFetch(`/agent/run`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(body)
            });
            const json = await res.json();
            if (!res.ok) throw new Error(json.error ?? 'Agent run failed');
            setTurns((prev) => [...prev, { userText, steps: json.steps ?? [] }]);
            setConversationMessages(json.messages ?? null);
            setTimeout(() => followUpRef.current?.focus(), 100);
        } catch (err: any) {
            setTurns((prev) => [...prev, { userText, steps: [{ type: 'tool_error', tool: 'agent', error: err?.message ?? 'Agent run failed' }] }]);
            setConversationMessages(null);
        } finally {
            setRunning(false);
        }
    };

    const run = () => {
        if (!prompt.trim()) return;
        setTurns([]);
        setConversationMessages(null);
        const p = prompt.trim();
        setPrompt('');
        runAgent(p);
    };

    const sendFollowUp = () => {
        if (!followUp.trim() || !conversationMessages) return;
        const text = followUp.trim();
        setFollowUp('');
        runAgent(text, conversationMessages);
    };

    const lastSteps = turns[turns.length - 1]?.steps ?? [];
    const awaitingFollowUp = conversationMessages && !running && lastSteps.some((s) => s.type === 'final_response' || s.type === 'llm_text');

    const activeCfg = AGENT_INTEGRATIONS.find((i) => i.id === selectedIntegration);

    return (
        <div className="space-y-4">
            {/* Integration picker */}
            <div>
                <p className="text-zinc-500 text-[11px] mb-2 uppercase tracking-wider">Select integration</p>
                <div className="flex flex-wrap gap-2">
                    {AGENT_INTEGRATIONS.map((intg) => {
                        const selectable = intg.enabled && connectedMap.has(intg.id);
                        const active = selectedIntegration === intg.id;
                        return (
                            <button
                                key={intg.id}
                                onClick={() => { if (selectable) { setSelectedIntegration(intg.id); setTurns([]); setPrompt(''); setConversationMessages(null); setFollowUp(''); } }}
                                disabled={!selectable}
                                className={cn(
                                    'flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg border text-xs transition-all',
                                    !selectable && 'opacity-40 cursor-not-allowed',
                                    active
                                        ? 'border-emerald-500/40 bg-emerald-500/10 text-emerald-300'
                                        : selectable
                                            ? 'border-zinc-700/60 bg-zinc-800/40 text-zinc-300 hover:border-zinc-600'
                                            : 'border-zinc-800/40 bg-zinc-900/20 text-zinc-600'
                                )}
                            >
                                <NangoLogo integrationId={intg.id} className="w-3.5 h-3.5 shrink-0" fallback={intg.label[0]} />
                                {intg.label}
                                {selectable && !active && <div className="w-1 h-1 rounded-full bg-emerald-400" />}
                            </button>
                        );
                    })}
                </div>
            </div>

            {/* Prompt input */}
            {selectedIntegration && (
                <motion.div
                    key={selectedIntegration}
                    initial={{ opacity: 0, y: 4 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="space-y-2"
                >
                    <label className="text-zinc-500 text-[11px] uppercase tracking-wider">Prompt</label>
                    <div className="flex gap-2">
                        <input
                            value={prompt}
                            onChange={(e) => setPrompt(e.target.value)}
                            onKeyDown={(e) => e.key === 'Enter' && run()}
                            placeholder={activeCfg?.placeholder}
                            disabled={running}
                            className="flex-1 bg-zinc-800/60 border border-zinc-700/60 rounded-lg px-3 py-2 text-zinc-200 text-xs placeholder-zinc-600 focus:outline-none focus:border-zinc-500"
                        />
                        <button
                            onClick={run}
                            disabled={running || !prompt.trim()}
                            className="flex items-center gap-1.5 px-3 py-2 rounded-lg text-xs font-medium text-white transition-all shrink-0"
                            style={{ background: running || !prompt.trim() ? '#3f3f46' : color }}
                        >
                            {running ? <Loader2 size={12} className="animate-spin" /> : <Sparkles size={12} />}
                            {running ? 'Running…' : 'Run Agent'}
                        </button>
                    </div>
                </motion.div>
            )}

            {/* Conversation turns */}
            {turns.length > 0 && (
                <div className="rounded-xl border border-zinc-800/60 bg-zinc-950/60 overflow-hidden">
                    <div className="px-4 py-2.5 border-b border-zinc-800/60 flex items-center gap-1.5">
                        <Terminal size={10} className="text-zinc-500" />
                        <span className="text-zinc-500 text-[11px] uppercase tracking-wider">Agent trace</span>
                    </div>
                    <div className="p-4 space-y-4">
                        {turns.map((turn, ti) => (
                            <div key={ti} className="space-y-2.5">
                                {/* User message bubble */}
                                <div className="flex justify-end">
                                    <div className="bg-zinc-700/50 rounded-xl rounded-tr-sm px-3 py-1.5 max-w-[80%]">
                                        <p className="text-zinc-200 text-[11px]">{turn.userText}</p>
                                    </div>
                                </div>
                                {/* Steps */}
                                <AnimatePresence>
                                    {turn.steps.map((step, i) => (
                                        <StepRow key={i} step={step} />
                                    ))}
                                </AnimatePresence>
                                {ti < turns.length - 1 && <div className="border-t border-zinc-800/40 pt-2" />}
                            </div>
                        ))}

                        {/* Running indicator */}
                        {running && (
                            <div className="flex items-center gap-2">
                                <div className="w-5 h-5 rounded-full flex items-center justify-center shrink-0" style={{ background: color + '20' }}>
                                    <Loader2 size={10} style={{ color }} className="animate-spin" />
                                </div>
                                <span className="text-zinc-500 text-[11px] font-mono">Thinking…</span>
                            </div>
                        )}

                        <div ref={bottomRef} />
                    </div>

                    {/* Follow-up input */}
                    {awaitingFollowUp && (
                        <div className="flex items-center gap-2 px-3 py-2.5 border-t border-zinc-800/60 bg-zinc-900/40">
                            <CornerDownLeft size={11} className="text-zinc-600 shrink-0" />
                            <input
                                ref={followUpRef}
                                value={followUp}
                                onChange={(e) => setFollowUp(e.target.value)}
                                onKeyDown={(e) => e.key === 'Enter' && sendFollowUp()}
                                placeholder="Reply to the agent…"
                                className="flex-1 bg-transparent text-zinc-200 text-xs placeholder-zinc-600 focus:outline-none"
                            />
                            <button
                                onClick={sendFollowUp}
                                disabled={!followUp.trim()}
                                className="flex items-center gap-1 text-[11px] px-2.5 py-1.5 rounded-lg font-medium text-white transition-all disabled:opacity-40 shrink-0"
                                style={{ background: color }}
                            >
                                <Send size={10} />
                                Send
                            </button>
                        </div>
                    )}
                </div>
            )}

            {!selectedIntegration && (
                <p className="text-zinc-600 text-xs text-center py-4">
                    Connect Slack on the{' '}
                    <a href="/connect" className="text-zinc-400 underline underline-offset-2 hover:text-zinc-200 transition-colors">
                        Connect
                    </a>{' '}
                    page, then select it above to run the agent.
                </p>
            )}
        </div>
    );
}
