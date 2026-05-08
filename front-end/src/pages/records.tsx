import { useState, useRef, useEffect } from 'react';
import { useQuery } from '@tanstack/react-query';
import { motion, AnimatePresence } from 'framer-motion';
import {
    Database, Sparkles, Loader2, Calendar, Users, MapPin,
    Video, Bot, Terminal, CheckCircle2, AlertCircle, RefreshCw,
    ExternalLink, Clock, Mic, MicOff
} from 'lucide-react';
import { toast } from 'sonner';
import { Layout, useUser } from '../components/layout/Layout';
import { NangoLogo } from '../components/NangoLogo';
import { Badge } from '../components/ui/Badge';
import { apiFetch, cn } from '../utils';

const GCAL_COLOR = '#1a73e8';

const EXAMPLE_PROMPTS = [
    'Which meetings have no agenda and could be an email?',
    'How heavy is my week? When should I do deep work?',
    'Summarise my schedule for the next 7 days',
    'Which recurring meetings am I attending most often?',
    'Find any back-to-back meetings I should know about'
];

type AnalyzeStep =
    | { type: 'records_fetch'; count: number; model: string; source: string }
    | { type: 'llm_request'; model: string; prompt: string; eventCount: number }
    | { type: 'answer'; text: string }
    | { type: 'error'; message: string };

function formatDate(dateTime?: string, date?: string) {
    const d = dateTime ? new Date(dateTime) : date ? new Date(date) : null;
    if (!d) return '—';
    const today = new Date();
    const tomorrow = new Date(today); tomorrow.setDate(today.getDate() + 1);
    if (d.toDateString() === today.toDateString()) return 'Today';
    if (d.toDateString() === tomorrow.toDateString()) return 'Tomorrow';
    return d.toLocaleDateString([], { weekday: 'short', month: 'short', day: 'numeric' });
}

function formatTime(dateTime?: string, date?: string) {
    if (dateTime) return new Date(dateTime).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    if (date) return 'All day';
    return '';
}

export default function RecordsPage() {
    const { user } = useUser();

    const { data: connections } = useQuery({
        queryKey: ['connections'],
        queryFn: async () => {
            const res = await apiFetch(`/connections`);
            if (!res.ok) return [];
            return (await res.json()).connections as { providerConfigKey: string; connectionId: string; broken: boolean }[];
        }
    });

    const gcalConn = connections?.find((c) => c.providerConfigKey === 'google-calendar');

    const { data: recordsData, isLoading: loadingRecords, refetch, dataUpdatedAt } = useQuery({
        queryKey: ['gcal-records'],
        enabled: !!gcalConn,
        queryFn: async () => {
            const res = await apiFetch(`/records?integrationId=google-calendar&model=GoogleCalendarEvent&limit=100`);
            if (!res.ok) return { records: [] };
            return res.json() as Promise<{ records: any[] }>;
        },
        staleTime: 30_000
    });

    const records = recordsData?.records ?? [];

    const [prompt, setPrompt] = useState('');
    const [analyzing, setAnalyzing] = useState(false);
    const [steps, setSteps] = useState<AnalyzeStep[]>([]);
    const [answer, setAnswer] = useState<string | null>(null);
    const bottomRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
    }, [steps]);

    const recognitionRef = useRef<any>(null);
    const [listening, setListening] = useState(false);

    useEffect(() => { return () => { recognitionRef.current?.abort(); }; }, []);

    const toggleListening = () => {
        const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
        if (!SpeechRecognition) {
            toast.error('Speech recognition not supported', { description: 'Try Chrome or Edge' });
            return;
        }

        if (listening) {
            recognitionRef.current?.abort();
            setListening(false);
            return;
        }

        const recognition = new SpeechRecognition();
        recognition.continuous = false;
        recognition.interimResults = true;
        recognition.lang = 'en-US';

        let finalTranscript = '';

        recognition.onresult = (event: any) => {
            let interim = '';
            for (let i = event.resultIndex; i < event.results.length; i++) {
                if (event.results[i].isFinal) {
                    finalTranscript += event.results[i][0].transcript;
                } else {
                    interim += event.results[i][0].transcript;
                }
            }
            setPrompt(finalTranscript + interim);
        };

        recognition.onend = () => {
            setListening(false);
            if (finalTranscript.trim()) {
                analyze(finalTranscript.trim());
            }
        };

        recognition.onerror = (event: any) => {
            if (event.error !== 'aborted') {
                toast.error('Speech recognition error', { description: event.error });
            }
            setListening(false);
        };

        recognitionRef.current = recognition;
        finalTranscript = '';
        recognition.start();
        setListening(true);
    };

    const analyze = async (text?: string) => {
        const p = (text ?? prompt).trim();
        if (!p || analyzing) return;
        setAnalyzing(true);
        setSteps([]);
        setAnswer(null);
        setPrompt('');

        try {
            const res = await apiFetch(`/records/analyze`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ prompt: p, userId: user.id })
            });
            const json = await res.json();
            if (!res.ok) throw new Error(json.error ?? 'Analysis failed');
            setSteps(json.steps ?? []);
            if (json.answer) setAnswer(json.answer);
        } catch (err: any) {
            setSteps([{ type: 'error', message: err?.message ?? 'Analysis failed' }]);
        } finally {
            setAnalyzing(false);
        }
    };

    return (
        <Layout
            title="Records + AI"
            description="Synced Nango records analysed by AI — no extra API calls needed"
        >
            <div className="flex h-full min-h-0">
                {/* ── Left: Records table ──────────────────────────────── */}
                <div className="w-[420px] shrink-0 border-r border-zinc-800/60 flex flex-col">
                    {/* Header */}
                    <div className="flex items-center gap-2 px-4 py-3 border-b border-zinc-800/60">
                        <Database size={12} className="text-zinc-500" />
                        <span className="text-zinc-400 text-xs font-medium">Nango Records Store</span>
                        <div className="ml-auto flex items-center gap-2">
                            {records.length > 0 && (
                                <span className="text-zinc-600 text-[10px]">{records.length} events</span>
                            )}
                            <button onClick={() => refetch()} className="text-zinc-600 hover:text-zinc-300 transition-colors">
                                <RefreshCw size={10} />
                            </button>
                        </div>
                    </div>

                    {/* Nango callout */}
                    <div className="mx-3 mt-3 mb-2 px-3 py-2.5 rounded-lg border border-indigo-500/20 bg-indigo-500/5">
                        <div className="flex items-start gap-2">
                            <NangoLogo integrationId="google-calendar" className="w-3.5 h-3.5 mt-0.5 shrink-0" fallback="G" />
                            <div>
                                <p className="text-indigo-300 text-[11px] font-medium">Synced by Nango in the background</p>
                                <p className="text-zinc-500 text-[10px] mt-0.5 leading-relaxed">
                                    These records come from <code className="text-indigo-400 font-mono">nango.getRecords()</code> — no API call needed.
                                    {dataUpdatedAt ? ` Last fetched ${new Date(dataUpdatedAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}.` : ''}
                                </p>
                                <a
                                    href="https://nango.dev/docs/implementation-guides/use-cases/syncs/implement-a-sync"
                                    target="_blank"
                                    rel="noreferrer"
                                    className="inline-flex items-center gap-1 text-indigo-400 text-[10px] mt-1 hover:text-indigo-300 transition-colors"
                                >
                                    How Nango records work <ExternalLink size={8} />
                                </a>
                            </div>
                        </div>
                    </div>

                    {/* Records list */}
                    <div className="flex-1 overflow-y-auto px-3 pb-3 space-y-1.5">
                        {!gcalConn ? (
                            <div className="flex flex-col items-center justify-center h-full text-center px-4">
                                <Calendar size={24} className="text-zinc-700 mb-3" />
                                <p className="text-zinc-500 text-sm font-medium mb-1">No Google Calendar connection</p>
                                <p className="text-zinc-600 text-xs">Connect on the Calendar page first.</p>
                            </div>
                        ) : loadingRecords ? (
                            <div className="space-y-2 pt-2">
                                {[...Array(6)].map((_, i) => (
                                    <div key={i} className="animate-pulse rounded-lg bg-zinc-800/40 h-14" />
                                ))}
                            </div>
                        ) : records.length === 0 ? (
                            <div className="flex flex-col items-center justify-center h-full text-center px-4">
                                <RefreshCw size={20} className="text-zinc-700 mb-3" />
                                <p className="text-zinc-500 text-sm font-medium mb-1">Sync in progress</p>
                                <p className="text-zinc-600 text-xs leading-relaxed">
                                    Nango is syncing your events. Check back in a moment or trigger a sync from the Calendar page.
                                </p>
                            </div>
                        ) : (
                            records.map((record) => {
                                const d = record.data as any;
                                const dateLabel = formatDate(d.start?.dateTime, d.start?.date);
                                const timeLabel = formatTime(d.start?.dateTime, d.start?.date);
                                const hasDescription = !!d.description?.trim();
                                return (
                                    <div
                                        key={record.id}
                                        className="rounded-lg border border-zinc-800/50 bg-zinc-900/30 px-3 py-2.5 hover:border-zinc-700/60 transition-colors"
                                    >
                                        <div className="flex items-start gap-2">
                                            <div className="w-1 h-full min-h-[2rem] rounded-full shrink-0 mt-0.5" style={{ background: GCAL_COLOR }} />
                                            <div className="min-w-0 flex-1">
                                                <div className="flex items-start gap-1.5">
                                                    <p className="text-zinc-200 text-xs font-medium truncate flex-1">{d.summary || '(No title)'}</p>
                                                    {!hasDescription && (
                                                        <span className="text-[9px] px-1.5 py-0.5 rounded bg-amber-500/10 text-amber-400/80 border border-amber-500/20 shrink-0 whitespace-nowrap">no agenda</span>
                                                    )}
                                                </div>
                                                <div className="flex items-center gap-2 mt-0.5 flex-wrap">
                                                    <span className="text-zinc-500 text-[10px]">{dateLabel}</span>
                                                    {timeLabel && <span className="text-zinc-600 text-[10px]">· {timeLabel}</span>}
                                                    {d.attendees?.length > 0 && (
                                                        <span className="flex items-center gap-0.5 text-zinc-600 text-[10px]">
                                                            <Users size={8} /> {d.attendees.length}
                                                        </span>
                                                    )}
                                                    {d.hangoutLink && <Video size={8} className="text-zinc-700" />}
                                                    {d.location && <MapPin size={8} className="text-zinc-700" />}
                                                </div>
                                            </div>
                                        </div>
                                        {/* Nango metadata */}
                                        <div className="mt-1.5 pt-1.5 border-t border-zinc-800/40 flex items-center gap-2">
                                            <Clock size={8} className="text-zinc-700" />
                                            <span className="text-zinc-700 text-[9px] font-mono">
                                                synced {new Date(record.updatedAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                            </span>
                                            <span className="text-zinc-800 text-[9px] font-mono ml-auto truncate">{record.externalId?.slice(0, 12)}…</span>
                                        </div>
                                    </div>
                                );
                            })
                        )}
                    </div>
                </div>

                {/* ── Right: AI Analysis ───────────────────────────────── */}
                <div className="flex-1 min-w-0 flex flex-col p-6">
                    <div className="flex items-center gap-2 mb-1">
                        <Sparkles size={14} style={{ color: GCAL_COLOR }} />
                        <h3 className="text-zinc-200 text-sm font-medium">Meeting Intelligence</h3>
                        <Badge variant="blue" size="xs">LLM</Badge>
                        <Badge variant="purple" size="xs">Nango Records</Badge>
                    </div>
                    <p className="text-zinc-500 text-xs mb-5">
                        Ask anything about your synced calendar events. The AI reads directly from the Nango records store — no extra Google API call needed.
                    </p>

                    <div className="flex-1 flex flex-col max-w-2xl">
                        {/* Example prompts */}
                        <div className="mb-4">
                            <p className="text-zinc-600 text-[10px] uppercase tracking-wider mb-2">Try an example</p>
                            <div className="flex flex-wrap gap-1.5">
                                {EXAMPLE_PROMPTS.map((ex) => (
                                    <button
                                        key={ex}
                                        onClick={() => analyze(ex)}
                                        disabled={analyzing || !gcalConn || records.length === 0}
                                        className="text-[11px] text-zinc-400 hover:text-white px-2.5 py-1 rounded-full border border-zinc-700/60 hover:border-zinc-500 bg-zinc-800/40 transition-all disabled:opacity-40"
                                    >
                                        {ex}
                                    </button>
                                ))}
                            </div>
                        </div>

                        {/* Prompt input */}
                        <div className="mb-4">
                            <p className="text-zinc-500 text-xs mb-1.5">Or type your own — or use the mic</p>
                            <div className="flex gap-2">
                                <div className="relative flex-1">
                                    <input
                                        value={prompt}
                                        onChange={(e) => setPrompt(e.target.value)}
                                        onKeyDown={(e) => e.key === 'Enter' && analyze()}
                                        placeholder={listening ? 'Listening… speak your question' : 'e.g. Which meetings overlap or are back-to-back?'}
                                        disabled={analyzing || !gcalConn || records.length === 0}
                                        className={cn(
                                            'w-full bg-zinc-800/60 border rounded-xl px-3.5 py-2.5 text-zinc-200 text-sm placeholder-zinc-600 focus:outline-none disabled:opacity-50 transition-colors',
                                            listening ? 'border-red-500/50 focus:border-red-500/70' : 'border-zinc-700/60 focus:border-zinc-600'
                                        )}
                                    />
                                    {listening && (
                                        <span className="absolute right-3 top-1/2 -translate-y-1/2 flex gap-0.5 items-end h-3">
                                            {[0, 1, 2].map((i) => (
                                                <span
                                                    key={i}
                                                    className="w-0.5 bg-red-400 rounded-full animate-pulse"
                                                    style={{ height: `${50 + i * 25}%`, animationDelay: `${i * 0.15}s` }}
                                                />
                                            ))}
                                        </span>
                                    )}
                                </div>
                                <button
                                    onClick={toggleListening}
                                    disabled={analyzing || !gcalConn || records.length === 0}
                                    title={listening ? 'Stop recording' : 'Voice input'}
                                    className={cn(
                                        'flex items-center justify-center w-10 rounded-xl border transition-all shrink-0 disabled:opacity-40',
                                        listening
                                            ? 'bg-red-500/15 border-red-500/40 text-red-400'
                                            : 'bg-zinc-800/60 border-zinc-700/60 text-zinc-400 hover:text-zinc-200 hover:border-zinc-600'
                                    )}
                                >
                                    {listening ? <MicOff size={14} /> : <Mic size={14} />}
                                </button>
                                <button
                                    onClick={() => analyze()}
                                    disabled={!prompt.trim() || analyzing || !gcalConn || records.length === 0}
                                    className="flex items-center gap-1.5 px-4 py-2.5 rounded-xl text-sm font-medium text-white transition-all shrink-0 disabled:opacity-40"
                                    style={{ background: analyzing || !prompt.trim() ? '#3f3f46' : GCAL_COLOR }}
                                >
                                    {analyzing ? <Loader2 size={13} className="animate-spin" /> : <Sparkles size={13} />}
                                    {analyzing ? 'Analysing…' : 'Analyse'}
                                </button>
                            </div>
                        </div>

                        {/* Trace + answer */}
                        <AnimatePresence>
                            {steps.length > 0 && (
                                <motion.div
                                    initial={{ opacity: 0, y: 8 }}
                                    animate={{ opacity: 1, y: 0 }}
                                    className="rounded-xl border border-zinc-800/60 bg-zinc-950/60 overflow-hidden"
                                >
                                    {/* Trace header */}
                                    <div className="flex items-center gap-1.5 px-4 py-2.5 border-b border-zinc-800/60 bg-zinc-900/40">
                                        <Terminal size={10} className="text-zinc-500" />
                                        <span className="text-zinc-500 text-[11px] uppercase tracking-wider">What happened</span>
                                    </div>

                                    <div className="p-4 space-y-3">
                                        {steps.map((step, i) => (
                                            <TraceStep key={i} step={step} />
                                        ))}
                                        <div ref={bottomRef} />
                                    </div>

                                    {/* Answer */}
                                    {answer && (
                                        <div className="px-4 pb-4 pt-0">
                                            <div className="rounded-xl border p-4" style={{ borderColor: `${GCAL_COLOR}30`, background: `${GCAL_COLOR}08` }}>
                                                <div className="flex items-center gap-2 mb-2.5">
                                                    <div className="w-5 h-5 rounded-full flex items-center justify-center shrink-0" style={{ background: `${GCAL_COLOR}20` }}>
                                                        <Bot size={10} style={{ color: GCAL_COLOR }} />
                                                    </div>
                                                    <span className="text-zinc-300 text-xs font-medium">AI Analysis</span>
                                                </div>
                                                <p className="text-zinc-300 text-sm leading-relaxed whitespace-pre-wrap">{answer}</p>
                                            </div>
                                        </div>
                                    )}
                                </motion.div>
                            )}
                        </AnimatePresence>

                        {/* How it works callout */}
                        {steps.length === 0 && (
                            <div className="mt-2 rounded-xl border border-zinc-800/60 bg-zinc-900/40 p-4">
                                <p className="text-zinc-500 text-[10px] uppercase tracking-wider mb-2.5">How it works</p>
                                <pre className="text-[11px] font-mono text-zinc-400 leading-relaxed overflow-x-auto whitespace-pre">{`// 1. Nango syncs events in the background (every 15 min)
const records = await nango.getRecords({
  providerConfigKey: 'google-calendar',
  model: 'GoogleCalendarEvent'
});

// 2. Pass records as context to any LLM
const answer = await llm.chat([
  { role: 'system', content: \`You have \${records.length} events\` },
  { role: 'user', content: userPrompt }
]);`}</pre>
                            </div>
                        )}
                    </div>
                </div>
            </div>
        </Layout>
    );
}

function TraceStep({ step }: { step: AnalyzeStep }) {
    if (step.type === 'records_fetch') {
        return (
            <motion.div initial={{ opacity: 0, x: -8 }} animate={{ opacity: 1, x: 0 }} className="flex items-start gap-2.5">
                <div className="w-5 h-5 rounded-full flex items-center justify-center shrink-0 mt-0.5 bg-indigo-500/20">
                    <Database size={10} className="text-indigo-400" />
                </div>
                <div>
                    <p className="text-zinc-300 text-[11px] font-mono">
                        Fetched <span className="text-indigo-400">{step.count}</span> records from Nango records store
                    </p>
                    <p className="text-zinc-600 text-[10px] mt-0.5">
                        model: <span className="text-zinc-500 font-mono">{step.model}</span> · source: <span className="text-zinc-500 font-mono">{step.source}</span>
                    </p>
                </div>
            </motion.div>
        );
    }

    if (step.type === 'llm_request') {
        return (
            <motion.div initial={{ opacity: 0, x: -8 }} animate={{ opacity: 1, x: 0 }} className="flex items-start gap-2.5">
                <div className="w-5 h-5 rounded-full flex items-center justify-center shrink-0 mt-0.5 bg-purple-500/20">
                    <Bot size={10} className="text-purple-400" />
                </div>
                <div>
                    <p className="text-zinc-300 text-[11px] font-mono">
                        Calling <span className="text-purple-400">{step.model}</span> with {step.eventCount} events as context…
                    </p>
                    <p className="text-zinc-600 text-[10px] mt-0.5 italic">"{step.prompt.slice(0, 80)}{step.prompt.length > 80 ? '…' : ''}"</p>
                </div>
            </motion.div>
        );
    }

    if (step.type === 'answer') {
        return (
            <motion.div initial={{ opacity: 0, x: -8 }} animate={{ opacity: 1, x: 0 }} className="flex items-start gap-2.5">
                <div className="w-5 h-5 rounded-full flex items-center justify-center shrink-0 mt-0.5 bg-emerald-500/20">
                    <CheckCircle2 size={10} className="text-emerald-400" />
                </div>
                <p className="text-zinc-300 text-[11px] font-mono">LLM response received</p>
            </motion.div>
        );
    }

    if (step.type === 'error') {
        return (
            <motion.div initial={{ opacity: 0, x: -8 }} animate={{ opacity: 1, x: 0 }} className="flex items-start gap-2.5">
                <div className="w-5 h-5 rounded-full flex items-center justify-center shrink-0 mt-0.5 bg-red-500/20">
                    <AlertCircle size={10} className="text-red-400" />
                </div>
                <p className="text-red-400 text-[11px] font-mono">{step.message}</p>
            </motion.div>
        );
    }

    return null;
}
