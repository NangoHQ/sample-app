import { useState, useCallback, useEffect } from 'react';

const STORAGE_KEY = 'nango_ask_history';
const MAX_CONVOS = 100;

export interface StoredMessage {
    id: string;
    role: 'user' | 'assistant';
    content: string;
    steps?: any[];
    error?: string;
}

export interface Conversation {
    id: string;
    title: string;
    messages: StoredMessage[];
    createdAt: number;
    updatedAt: number;
}

function load(): Conversation[] {
    if (typeof window === 'undefined') return [];
    try {
        const raw = localStorage.getItem(STORAGE_KEY);
        return raw ? JSON.parse(raw) : [];
    } catch {
        return [];
    }
}

function save(convos: Conversation[]) {
    try {
        // Strip steps from stored messages to keep storage lean
        const lean = convos.slice(0, MAX_CONVOS).map((c) => ({
            ...c,
            messages: c.messages.map(({ steps: _steps, ...m }) => m)
        }));
        localStorage.setItem(STORAGE_KEY, JSON.stringify(lean));
    } catch {}
}

export function useConversations() {
    const [conversations, setConversations] = useState<Conversation[]>([]);
    const [activeId, setActiveId] = useState<string | null>(null);
    const [mounted, setMounted] = useState(false);

    useEffect(() => {
        const convos = load();
        setConversations(convos);
        setActiveId(convos[0]?.id ?? null);
        setMounted(true);
    }, []);

    const createNew = useCallback((): string => {
        const id = crypto.randomUUID();
        const convo: Conversation = {
            id,
            title: 'New chat',
            messages: [],
            createdAt: Date.now(),
            updatedAt: Date.now()
        };
        setConversations((prev) => {
            const next = [convo, ...prev];
            save(next);
            return next;
        });
        setActiveId(id);
        return id;
    }, []);

    const selectConversation = useCallback((id: string) => {
        setActiveId(id);
    }, []);

    const updateMessages = useCallback((id: string, messages: StoredMessage[]) => {
        setConversations((prev) => {
            const next = prev.map((c) => {
                if (c.id !== id) return c;
                const firstUserMsg = messages.find((m) => m.role === 'user')?.content ?? '';
                const title =
                    c.title === 'New chat' && firstUserMsg
                        ? firstUserMsg.slice(0, 42) + (firstUserMsg.length > 42 ? '…' : '')
                        : c.title;
                return { ...c, title, messages, updatedAt: Date.now() };
            });
            save(next);
            return next;
        });
    }, []);

    const deleteConversation = useCallback((id: string) => {
        setConversations((prev) => {
            const next = prev.filter((c) => c.id !== id);
            save(next);
            setActiveId((current) => {
                if (current !== id) return current;
                return next[0]?.id ?? null;
            });
            return next;
        });
    }, []);

    const activeConversation = conversations.find((c) => c.id === activeId) ?? null;

    return {
        conversations,
        activeId,
        activeConversation,
        mounted,
        createNew,
        selectConversation,
        updateMessages,
        deleteConversation
    };
}

export function relativeTime(ts: number): string {
    const diff = Date.now() - ts;
    if (diff < 60_000) return 'just now';
    if (diff < 3_600_000) return `${Math.floor(diff / 60_000)}m ago`;
    if (diff < 86_400_000) return `${Math.floor(diff / 3_600_000)}h ago`;
    if (diff < 7 * 86_400_000) return `${Math.floor(diff / 86_400_000)}d ago`;
    return new Date(ts).toLocaleDateString(undefined, { month: 'short', day: 'numeric' });
}
