import { toast } from 'sonner';
import { ExternalLink, Copy, CheckCircle2 } from 'lucide-react';
import { useState } from 'react';

interface NangoToastOptions {
    title: string;
    description: string;
    code: string;
    docsUrl: string;
    docsLabel: string;
    duration?: number;
}

function CopyButton({ text }: { text: string }) {
    const [copied, setCopied] = useState(false);
    return (
        <button
            onClick={() => {
                navigator.clipboard.writeText(text).catch(() => {});
                setCopied(true);
                setTimeout(() => setCopied(false), 1500);
            }}
            className="flex items-center gap-1 text-[10px] text-zinc-500 hover:text-zinc-300 transition-colors shrink-0"
        >
            {copied ? <CheckCircle2 size={10} className="text-emerald-400" /> : <Copy size={10} />}
            {copied ? 'Copied' : 'copy'}
        </button>
    );
}

function NangoToastContent({ title, description, code, docsUrl, docsLabel, onDismiss }: NangoToastOptions & { onDismiss: () => void }) {
    return (
        <div
            className="w-[340px] rounded-xl border border-zinc-700/60 bg-zinc-900 shadow-2xl shadow-black/40 overflow-hidden cursor-default"
            onClick={(e) => e.stopPropagation()}
        >
            {/* Header */}
            <div className="flex items-start gap-2.5 px-3.5 py-3 border-b border-zinc-800/60">
                <div className="w-5 h-5 rounded-full bg-emerald-500/20 flex items-center justify-center shrink-0 mt-0.5">
                    <CheckCircle2 size={11} className="text-emerald-400" />
                </div>
                <div className="flex-1 min-w-0">
                    <p className="text-zinc-100 text-xs font-semibold">{title}</p>
                    <p className="text-zinc-400 text-[11px] mt-0.5 leading-relaxed">{description}</p>
                </div>
                <button onClick={onDismiss} className="text-zinc-600 hover:text-zinc-400 transition-colors text-[11px] shrink-0 mt-0.5">✕</button>
            </div>

            {/* Code snippet */}
            <div className="px-3.5 py-2.5 bg-zinc-950/60">
                <div className="flex items-center justify-between mb-1">
                    <span className="text-[9px] uppercase tracking-wider text-zinc-600">Nango SDK call</span>
                    <CopyButton text={code} />
                </div>
                <code className="text-[11px] font-mono text-indigo-300 leading-relaxed block">{code}</code>
            </div>

            {/* Docs link */}
            <div className="px-3.5 py-2 border-t border-zinc-800/60 flex items-center justify-between">
                <a
                    href={docsUrl}
                    target="_blank"
                    rel="noreferrer"
                    className="flex items-center gap-1.5 text-[11px] text-indigo-400 hover:text-indigo-300 transition-colors"
                >
                    <ExternalLink size={10} />
                    {docsLabel}
                </a>
                <span className="text-zinc-700 text-[10px]">docs.nango.dev</span>
            </div>
        </div>
    );
}

export const nangoToast = {
    connected: (providerConfigKey: string, connectionId: string) => {
        toast.custom(
            (id) => (
                <NangoToastContent
                    title={`Connected to ${providerConfigKey}`}
                    description="OAuth token stored by Nango and auto-refreshed forever — your server never sees it."
                    code={`await nango.getConnection('${providerConfigKey}', connectionId)`}
                    docsUrl="https://nango.dev/docs/implementation-guides/platform/auth/implement-api-auth"
                    docsLabel="How connections work →"
                    onDismiss={() => toast.dismiss(id)}
                />
            ),
            { duration: 8000 }
        );
    },

    disconnected: (providerConfigKey: string) => {
        toast.success(`Disconnected from ${providerConfigKey}`);
    },

    proxy: (endpoint: string) => {
        toast.custom(
            (id) => (
                <NangoToastContent
                    title="Proxied via Nango"
                    description="Nango injected the OAuth token automatically — no credentials on your frontend."
                    code={`await nango.proxy({ providerConfigKey, endpoint: '${endpoint}' })`}
                    docsUrl="https://nango.dev/docs/implementation-guides/platform/proxy/implement-requests-proxy"
                    docsLabel="How the proxy works →"
                    onDismiss={() => toast.dismiss(id)}
                />
            ),
            { duration: 6000 }
        );
    },

    syncTriggered: (integration: string) => {
        toast.custom(
            (id) => (
                <NangoToastContent
                    title="Sync triggered"
                    description="Nango will run this in the background and push fresh records to your store."
                    code={`await nango.triggerSync('${integration}', [syncName], connectionId)`}
                    docsUrl="https://nango.dev/docs/implementation-guides/use-cases/syncs/implement-a-sync"
                    docsLabel="How syncs work →"
                    onDismiss={() => toast.dismiss(id)}
                />
            ),
            { duration: 6000 }
        );
    }
};
