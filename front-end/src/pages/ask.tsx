import { useState, useRef, useEffect, useCallback } from 'react';
import { useQuery } from '@tanstack/react-query';
import {
    SendHorizontal, Sparkles, Wrench, AlertCircle, Bot,
    SquarePen, Trash2, MessageSquare
} from 'lucide-react';
import { Layout } from '../components/layout/Layout';
import { apiFetch } from '../utils';
import { useConversations, relativeTime } from '../hooks/useConversations';
import type { StoredMessage } from '../hooks/useConversations';


type ApiMessage = { role: string; content: string };

type AgentStep =
    | { type: 'llm_request'; model: string; prompt: string }
    | { type: 'llm_text'; text: string }
    | { type: 'tool_call'; integration: string; method: string; endpoint: string }
    | { type: 'tool_result'; integration: string; endpoint: string; result: any }
    | { type: 'tool_error'; integration: string; endpoint: string; error: string }
    | { type: 'final_response'; text: string };

type ChatMessage = StoredMessage & { steps?: AgentStep[] };


const INTEGRATION_LABELS: Record<string, string> = {
    slack: 'Slack',
    'google-drive': 'Google Drive',
    'google-calendar': 'Google Calendar',
    linear: 'Linear',
    github: 'GitHub',
    hubspot: 'HubSpot',
    'one-drive': 'OneDrive',
    'one-drive-personal': 'OneDrive Personal',
    notion: 'Notion',
};

function labelFor(key: string) {
    return INTEGRATION_LABELS[key] ?? key;
}

function toolsUsed(steps: AgentStep[]): { endpoint: string; integration: string }[] {
    return steps
        .filter((s): s is Extract<AgentStep, { type: 'tool_call' }> => s.type === 'tool_call')
        .map((s) => ({ endpoint: s.endpoint, integration: s.integration }));
}

const EXAMPLE_PROMPTS = [
    { text: 'How many users are in our Slack workspace?', integrations: ['slack'] },
    { text: 'What meetings do I have this week?', integrations: ['google-calendar'] },
    { text: 'Create a Linear issue: "Fix login bug" in team ENG', integrations: ['linear'] },
    { text: 'List my recent GitHub pull requests', integrations: ['github'] },
    { text: 'Show my HubSpot deals', integrations: ['hubspot'] },
    { text: 'List files in my Google Drive', integrations: ['google-drive'] },
];


function ToolBadge({ endpoint, integration }: { endpoint: string; integration: string }) {
    const short = endpoint.split('/').filter(Boolean).slice(-2).join('/') || endpoint;
    return (
        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-indigo-500/10 border border-indigo-500/20 text-indigo-300 text-[10px] font-medium">
            <Wrench size={9} />
            {labelFor(integration)} · {short}
        </span>
    );
}

function MessageBubble({ msg }: { msg: ChatMessage }) {
    const isUser = msg.role === 'user';
    const used = msg.steps ? toolsUsed(msg.steps) : [];

    return (
        <div className={`flex gap-3 ${isUser ? 'flex-row-reverse' : 'flex-row'}`}>
            {!isUser && (
                <div className="w-7 h-7 rounded-lg bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center shrink-0 mt-0.5 shadow-lg shadow-indigo-500/20">
                    <Bot size={13} className="text-white" />
                </div>
            )}
            <div className={`flex flex-col gap-1.5 max-w-[80%] ${isUser ? 'items-end' : 'items-start'}`}>
                {used.length > 0 && (
                    <div className="flex flex-wrap gap-1">
                        {used.map((u, i) => (
                            <ToolBadge key={i} endpoint={u.endpoint} integration={u.integration} />
                        ))}
                    </div>
                )}
                {msg.error ? (
                    <div className="flex items-start gap-2 px-4 py-3 rounded-2xl bg-red-500/10 border border-red-500/20 text-red-400 text-sm">
                        <AlertCircle size={14} className="shrink-0 mt-0.5" />
                        <span>{msg.error}</span>
                    </div>
                ) : (
                    <div className={`px-4 py-3 rounded-2xl text-sm leading-relaxed whitespace-pre-wrap ${
                        isUser
                            ? 'bg-indigo-600 text-white rounded-tr-sm'
                            : 'bg-zinc-800/80 text-zinc-100 rounded-tl-sm border border-zinc-700/50'
                    }`}>
                        {msg.content}
                    </div>
                )}
            </div>
        </div>
    );
}

function TypingIndicator() {
    return (
        <div className="flex gap-3">
            <div className="w-7 h-7 rounded-lg bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center shrink-0 shadow-lg shadow-indigo-500/20">
                <Bot size={13} className="text-white" />
            </div>
            <div className="px-4 py-3 rounded-2xl rounded-tl-sm bg-zinc-800/80 border border-zinc-700/50 flex items-center gap-1.5">
                <span className="w-1.5 h-1.5 rounded-full bg-zinc-400 animate-bounce [animation-delay:0ms]" />
                <span className="w-1.5 h-1.5 rounded-full bg-zinc-400 animate-bounce [animation-delay:150ms]" />
                <span className="w-1.5 h-1.5 rounded-full bg-zinc-400 animate-bounce [animation-delay:300ms]" />
            </div>
        </div>
    );
}

function EmptyState({ connectedKeys, onPromptClick }: { connectedKeys: string[]; onPromptClick: (text: string) => void }) {
    const supported = connectedKeys.filter((k) => k in INTEGRATION_LABELS);
    const examples = EXAMPLE_PROMPTS.filter((p) => supported.some((k) => p.integrations.includes(k))).slice(0, 4);

    return (
        <div className="flex flex-col items-center justify-center gap-6 py-12 text-center">
            <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-indigo-500/15 to-purple-600/15 border border-indigo-500/20 flex items-center justify-center">
                <Sparkles size={24} className="text-indigo-400" />
            </div>
            <div className="space-y-1.5">
                <h2 className="text-zinc-200 font-semibold text-lg">Ask anything</h2>
                <p className="text-zinc-500 text-sm max-w-xs">
                    {supported.length > 0
                        ? 'I can take actions across your connected integrations.'
                        : 'Connect integrations from the Overview page to get started.'}
                </p>
            </div>
            {supported.length > 0 && (
                <div className="flex flex-wrap justify-center gap-2 max-w-xs">
                    {supported.map((key) => (
                        <span key={key} className="px-2.5 py-1 rounded-full text-xs font-medium bg-zinc-800 text-zinc-400 border border-zinc-700/60">
                            {labelFor(key)}
                        </span>
                    ))}
                </div>
            )}
            {examples.length > 0 && (
                <div className="flex flex-col gap-2 w-full max-w-sm">
                    {examples.map((p, i) => (
                        <button
                            key={i}
                            onClick={() => onPromptClick(p.text)}
                            className="text-left px-3 py-2.5 rounded-lg bg-zinc-900/60 hover:bg-zinc-800/80 border border-zinc-800 hover:border-zinc-700 text-zinc-400 hover:text-zinc-200 text-xs transition-colors"
                        >
                            {p.text}
                        </button>
                    ))}
                </div>
            )}
        </div>
    );
}


export default function AskPage() {
    const {
        conversations, activeId, activeConversation, mounted,
        createNew, selectConversation, updateMessages, deleteConversation
    } = useConversations();

    const [messages, setMessages] = useState<ChatMessage[]>([]);
    const [input, setInput] = useState('');
    const [loading, setLoading] = useState(false);
    const [hoveredConvoId, setHoveredConvoId] = useState<string | null>(null);

    const bottomRef = useRef<HTMLDivElement>(null);
    const textareaRef = useRef<HTMLTextAreaElement>(null);

    const { data: connections } = useQuery({
        queryKey: ['connections'],
        queryFn: async () => {
            const res = await apiFetch('/connections');
            if (!res.ok) return [];
            return (await res.json()).connections as { providerConfigKey: string }[];
        }
    });

    const connectedKeys = connections?.map((c) => c.providerConfigKey) ?? [];

    // Load messages when active conversation changes
    useEffect(() => {
        setMessages((activeConversation?.messages as ChatMessage[]) ?? []);
    }, [activeId]);

    useEffect(() => {
        bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
    }, [messages, loading]);

    const persistMessages = useCallback((id: string, msgs: ChatMessage[]) => {
        updateMessages(id, msgs);
    }, [updateMessages]);

    const sendMessage = useCallback(async (text?: string) => {
        const finalText = (text ?? input).trim();
        if (!finalText || loading) return;

        // Ensure there's an active conversation
        let convoId = activeId;
        if (!convoId) {
            convoId = createNew();
        }

        const userMsg: ChatMessage = { id: crypto.randomUUID(), role: 'user', content: finalText };
        const nextMessages = [...messages, userMsg];

        setMessages(nextMessages);
        setInput('');
        if (textareaRef.current) textareaRef.current.style.height = 'auto';
        setLoading(true);

        const history: ApiMessage[] = nextMessages.map((m) => ({ role: m.role, content: m.content }));

        try {
            const res = await apiFetch('/agent/run', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ messages: history })
            });

            const data = await res.json();

            if (!res.ok) {
                const errMsg: ChatMessage = {
                    id: crypto.randomUUID(), role: 'assistant', content: '',
                    error: data.error ?? 'Something went wrong'
                };
                const withErr = [...nextMessages, errMsg];
                setMessages(withErr);
                persistMessages(convoId, withErr);
                return;
            }

            const finalStep = (data.steps as AgentStep[])?.find((s) => s.type === 'final_response') as
                | Extract<AgentStep, { type: 'final_response' }>
                | undefined;

            const assistantMsg: ChatMessage = {
                id: crypto.randomUUID(),
                role: 'assistant',
                content: finalStep?.text ?? 'No response received.',
                steps: data.steps
            };
            const withReply = [...nextMessages, assistantMsg];
            setMessages(withReply);
            persistMessages(convoId, withReply);
        } catch {
            const errMsg: ChatMessage = {
                id: crypto.randomUUID(), role: 'assistant', content: '',
                error: 'Failed to reach the server.'
            };
            const withErr = [...nextMessages, errMsg];
            setMessages(withErr);
            persistMessages(convoId, withErr);
        } finally {
            setLoading(false);
        }
    }, [input, loading, messages, activeId, createNew, persistMessages]);

    const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
        if (e.key === 'Enter' && !e.shiftKey) {
            e.preventDefault();
            sendMessage();
        }
    };

    const handleChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
        setInput(e.target.value);
        e.target.style.height = 'auto';
        e.target.style.height = `${Math.min(e.target.scrollHeight, 160)}px`;
    };

    const handleNewChat = () => {
        if (loading) return;
        createNew();
        setInput('');
        if (textareaRef.current) textareaRef.current.style.height = 'auto';
    };

    const handleDelete = (e: React.MouseEvent, id: string) => {
        e.stopPropagation();
        deleteConversation(id);
    };

    return (
        <Layout
            title="Ask AI"
            description="Chat with your connected integrations"
            actions={
                <span className="px-2 py-0.5 rounded text-[10px] font-semibold bg-indigo-500/20 text-indigo-300 border border-indigo-500/30">
                    Beta
                </span>
            }
        >
            <div className="flex h-full">

                {/* ── Conversation history panel ───────────────────────── */}
                <aside className="w-[220px] shrink-0 border-r border-zinc-800/60 flex flex-col bg-zinc-950">
                    <div className="flex items-center justify-between px-3 pt-4 pb-3">
                        <span className="text-xs font-semibold text-zinc-500 uppercase tracking-wider">Chats</span>
                        <button
                            onClick={handleNewChat}
                            title="New chat"
                            className="w-6 h-6 flex items-center justify-center rounded-md text-zinc-500 hover:text-zinc-200 hover:bg-zinc-800 transition-colors"
                        >
                            <SquarePen size={13} />
                        </button>
                    </div>

                    <div className="flex-1 overflow-y-auto px-2 pb-3 space-y-0.5">
                        {mounted && conversations.length === 0 && (
                            <div className="flex flex-col items-center gap-2 py-8 text-center px-3">
                                <MessageSquare size={20} className="text-zinc-700" />
                                <p className="text-zinc-600 text-xs">No chats yet</p>
                            </div>
                        )}
                        {conversations.map((convo) => {
                            const isActive = convo.id === activeId;
                            return (
                                <div
                                    key={convo.id}
                                    className={`group relative flex flex-col gap-0.5 px-2.5 py-2 rounded-lg cursor-pointer transition-colors ${
                                        isActive
                                            ? 'bg-zinc-800 text-zinc-100'
                                            : 'text-zinc-400 hover:bg-zinc-800/50 hover:text-zinc-200'
                                    }`}
                                    onClick={() => !loading && selectConversation(convo.id)}
                                    onMouseEnter={() => setHoveredConvoId(convo.id)}
                                    onMouseLeave={() => setHoveredConvoId(null)}
                                >
                                    <span className="text-xs font-medium leading-snug truncate pr-5">{convo.title}</span>
                                    <span className="text-[10px] text-zinc-600">{relativeTime(convo.updatedAt)}</span>

                                    {/* Delete button */}
                                    {(hoveredConvoId === convo.id || isActive) && (
                                        <button
                                            onClick={(e) => handleDelete(e, convo.id)}
                                            className="absolute right-1.5 top-1/2 -translate-y-1/2 w-5 h-5 flex items-center justify-center rounded text-zinc-600 hover:text-red-400 hover:bg-zinc-700 transition-colors"
                                        >
                                            <Trash2 size={11} />
                                        </button>
                                    )}
                                </div>
                            );
                        })}
                    </div>
                </aside>

                {/* ── Chat area ────────────────────────────────────────── */}
                <div className="flex-1 flex flex-col min-w-0">
                    {/* Messages */}
                    <div className="flex-1 overflow-y-auto">
                        <div className="max-w-3xl mx-auto px-4 py-6 space-y-5">
                            {messages.length === 0 && !loading && (
                                <EmptyState
                                    connectedKeys={connectedKeys}
                                    onPromptClick={(text) => sendMessage(text)}
                                />
                            )}
                            {messages.map((msg) => (
                                <MessageBubble key={msg.id} msg={msg} />
                            ))}
                            {loading && <TypingIndicator />}
                            <div ref={bottomRef} />
                        </div>
                    </div>

                    {/* Input */}
                    <div className="border-t border-zinc-800/60 px-4 py-4 shrink-0">
                        <div className="max-w-3xl mx-auto">
                            <div className="flex items-end gap-3 rounded-xl border px-4 py-3 bg-zinc-900/40 border-zinc-800 focus-within:border-zinc-700 transition-colors">
                                <textarea
                                    ref={textareaRef}
                                    value={input}
                                    onChange={handleChange}
                                    onKeyDown={handleKeyDown}
                                    placeholder="Ask anything about your integrations…"
                                    rows={1}
                                    disabled={loading}
                                    className="flex-1 bg-transparent text-sm text-zinc-100 placeholder-zinc-600 resize-none outline-none leading-relaxed min-h-[22px] max-h-[160px] disabled:opacity-40"
                                />
                                <button
                                    onClick={() => sendMessage()}
                                    disabled={!input.trim() || loading}
                                    className="w-7 h-7 rounded-lg flex items-center justify-center shrink-0 bg-indigo-600 text-white hover:bg-indigo-500 disabled:bg-zinc-800 disabled:text-zinc-600 disabled:cursor-not-allowed transition-colors mb-0.5"
                                >
                                    <SendHorizontal size={14} />
                                </button>
                            </div>
                            <p className="text-zinc-700 text-[10px] text-center mt-2">
                                Enter to send · Shift+Enter for new line
                            </p>
                        </div>
                    </div>
                </div>
            </div>
        </Layout>
    );
}
