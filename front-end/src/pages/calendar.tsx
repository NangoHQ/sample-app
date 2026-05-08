import { useState, useEffect, useRef } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { motion, AnimatePresence } from 'framer-motion';
import {
    Calendar, Sparkles, Link2, Loader2, Clock, ChevronRight,
    CheckCircle2, Zap, Unlink, ExternalLink, Users, MapPin,
    Video, Wrench, Bot, Terminal, RefreshCw, BellOff, Mic, MicOff
} from 'lucide-react';
import { toast } from 'sonner';
import { Layout, useUser } from '../components/layout/Layout';
import { useNangoConnect } from '../hooks/useNangoConnect';
import { useSSE } from '../hooks/useSSE';
import { Badge } from '../components/ui/Badge';
import { NangoLogo } from '../components/NangoLogo';
import { apiFetch, cn } from '../utils';

const GCAL_COLOR = '#1a73e8';


function formatEventTime(dateTime?: string, date?: string): string {
    if (dateTime) {
        return new Date(dateTime).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    }
    if (date) return 'All day';
    return '';
}

function formatEventDate(dateTime?: string, date?: string): string {
    const d = dateTime ? new Date(dateTime) : date ? new Date(date) : null;
    if (!d) return '';
    const today = new Date();
    const tomorrow = new Date(today); tomorrow.setDate(today.getDate() + 1);
    if (d.toDateString() === today.toDateString()) return 'Today';
    if (d.toDateString() === tomorrow.toDateString()) return 'Tomorrow';
    return d.toLocaleDateString([], { weekday: 'short', month: 'short', day: 'numeric' });
}

function eventDuration(start?: string, end?: string): string {
    if (!start || !end) return '';
    const mins = Math.round((new Date(end).getTime() - new Date(start).getTime()) / 60000);
    if (mins < 60) return `${mins}m`;
    const h = Math.floor(mins / 60), m = mins % 60;
    return m ? `${h}h ${m}m` : `${h}h`;
}


export default function CalendarPage() {
    const { user } = useUser();
    const queryClient = useQueryClient();

    const { data: connections, refetch: refetchConnections } = useQuery({
        queryKey: ['connections'],
        queryFn: async () => {
            const res = await apiFetch(`/connections`);
            if (!res.ok) return [];
            return (await res.json()).connections as { providerConfigKey: string; connectionId: string; broken: boolean }[];
        },
        refetchInterval: 5000
    });

    const gcalConn = connections?.find((c) => c.providerConfigKey === 'google-calendar');

    const onConnectionChange = () => {
        refetchConnections();
        queryClient.invalidateQueries({ queryKey: ['connections'] });
    };

    return (
        <Layout
            title="Calendar"
            description="Sync events, schedule with AI, and react to calendar changes via Google Calendar"
        >
            <div className="flex flex-col h-full">
                {/* Provider selector row */}
                <div className="flex items-center gap-2 px-6 pt-5 pb-4 border-b border-zinc-800/60">
                    <div
                        className="flex items-center gap-2 px-3.5 py-2 rounded-lg border text-sm font-medium text-white"
                        style={{ background: `${GCAL_COLOR}15`, borderColor: `${GCAL_COLOR}40` }}
                    >
                        <NangoLogo integrationId="google-calendar" className="w-3.5 h-3.5" fallback="G" />
                        Google Calendar
                        {gcalConn && <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 ml-0.5" />}
                    </div>
                </div>

                <div className="flex-1 min-h-0">
                    {gcalConn ? (
                        <CalendarWorkspace userId={user.id} connectionId={gcalConn.connectionId} onDisconnect={onConnectionChange} />
                    ) : (
                        <CalendarConnectPrompt userId={user.id} onConnect={onConnectionChange} />
                    )}
                </div>
            </div>
        </Layout>
    );
}


function CalendarConnectPrompt({ userId, onConnect }: { userId: string; onConnect: () => void }) {
    const { connect, connecting } = useNangoConnect();
    const isConnecting = connecting === 'google-calendar';

    const handleConnect = () => connect({
        userId,
        providerConfigKey: 'google-calendar',
        onSuccess: onConnect
    });

    return (
        <div className="flex items-center justify-center h-full p-10">
            <div className="max-w-lg w-full">
                <div className="rounded-2xl border border-zinc-800/60 bg-zinc-900/60 p-8">
                    <div className="w-12 h-12 rounded-xl flex items-center justify-center mb-5" style={{ background: `${GCAL_COLOR}20` }}>
                        <NangoLogo integrationId="google-calendar" className="w-7 h-7" fallback="G" />
                    </div>
                    <h3 className="text-zinc-100 font-semibold text-lg mb-2">Connect Google Calendar</h3>
                    <p className="text-zinc-400 text-sm leading-relaxed mb-6">
                        Connect your Google Calendar to sync upcoming events, schedule meetings using natural language, and receive real-time webhook notifications for calendar changes.
                    </p>

                    <div className="grid grid-cols-3 gap-3 mb-6">
                        {[
                            { icon: <Calendar size={15} />, label: 'Syncs', desc: 'Upcoming events synced automatically' },
                            { icon: <Sparkles size={15} />, label: 'AI Schedule', desc: 'Create events from plain English' },
                            { icon: <Zap size={15} />, label: 'Webhooks', desc: 'React to calendar changes live' }
                        ].map(({ icon, label, desc }) => (
                            <div key={label} className="rounded-xl border border-zinc-800/60 bg-zinc-900/40 p-3">
                                <div className="text-zinc-400 mb-1.5">{icon}</div>
                                <p className="text-zinc-200 text-xs font-medium mb-0.5">{label}</p>
                                <p className="text-zinc-500 text-[10px] leading-relaxed">{desc}</p>
                            </div>
                        ))}
                    </div>

                    <button
                        onClick={handleConnect}
                        disabled={isConnecting}
                        className="flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-medium text-white transition-all disabled:opacity-60"
                        style={{ background: GCAL_COLOR }}
                    >
                        {isConnecting ? <Loader2 size={14} className="animate-spin" /> : <Link2 size={14} />}
                        {isConnecting ? 'Connecting...' : 'Connect Google Calendar'}
                    </button>

                    <div className="mt-5 rounded-xl border border-zinc-800/60 bg-zinc-900/40 p-4">
                        <p className="text-zinc-500 text-[10px] uppercase tracking-wider mb-2.5">AI Scheduling</p>
                        <pre className="text-[11px] font-mono text-zinc-400 leading-relaxed overflow-x-auto whitespace-pre">{`// Natural language → calendar event
POST /calendar/schedule
{ "prompt": "Team standup every Mon at 10am for 30 min",
  "userId": "..." }

// Nango handles token refresh automatically`}</pre>
                    </div>
                </div>
            </div>
        </div>
    );
}


type ScheduleStep =
    | { type: 'llm_request'; model: string; prompt: string }
    | { type: 'extracted'; summary: string; startDateTime: string; endDateTime: string; description?: string; attendees?: { email: string }[]; timeZone?: string }
    | { type: 'creating'; summary: string }
    | { type: 'created'; event: any }
    | { type: 'error'; message: string; detail?: string };

const STEP_ICON: Record<ScheduleStep['type'], any> = {
    llm_request: Bot,
    extracted: Sparkles,
    creating: Wrench,
    created: CheckCircle2,
    error: Terminal
};

const STEP_COLOR: Record<ScheduleStep['type'], string> = {
    llm_request: '#6366f1',
    extracted: GCAL_COLOR,
    creating: '#f97316',
    created: '#10b981',
    error: '#ef4444'
};

function ScheduleStepRow({ step }: { step: ScheduleStep }) {
    const Icon = STEP_ICON[step.type];
    const color = STEP_COLOR[step.type];

    const label = (() => {
        switch (step.type) {
            case 'llm_request': return `Calling ${step.model} to extract event details…`;
            case 'extracted':   return `Extracted: "${step.summary}" · ${new Date(step.startDateTime).toLocaleString([], { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })}`;
            case 'creating':    return `Creating "${step.summary}" via Google Calendar API…`;
            case 'created':     return `Event created successfully`;
            case 'error':       return `Error: ${step.message}`;
        }
    })();

    const detail = (() => {
        if (step.type === 'extracted') {
            const dur = eventDuration(step.startDateTime, step.endDateTime);
            const parts = [dur && `${dur} duration`, step.attendees?.length && `${step.attendees.length} attendee(s)`, step.description && `"${step.description.slice(0, 60)}"`].filter(Boolean);
            return parts.length > 0 ? parts.join(' · ') : null;
        }
        if (step.type === 'error' && step.detail) return step.detail;
        return null;
    })();

    return (
        <motion.div initial={{ opacity: 0, x: -8 }} animate={{ opacity: 1, x: 0 }} className="flex items-start gap-2.5">
            <div className="w-5 h-5 rounded-full flex items-center justify-center shrink-0 mt-0.5" style={{ background: color + '20' }}>
                <Icon size={10} style={{ color }} />
            </div>
            <div className="min-w-0 flex-1">
                <p className="text-zinc-300 text-[11px] font-mono leading-relaxed">{label}</p>
                {detail && <p className="text-zinc-500 text-[10px] mt-0.5">{detail}</p>}
            </div>
        </motion.div>
    );
}


const EXAMPLE_PROMPTS = [
    'Team standup tomorrow at 10am for 30 min',
    'Coffee with Sarah next Friday 2–3pm',
    'Focus block today 2–4pm, no attendees',
    'Monthly all-hands first Monday next month at 9am for 1 hour'
];

function CalendarWorkspace({ userId, connectionId, onDisconnect }: { userId: string; connectionId: string; onDisconnect: () => void }) {
    const queryClient = useQueryClient();
    const { disconnect, reconnect, reconnecting: reconnectingProvider } = useNangoConnect();
    const isReconnecting = reconnectingProvider === 'google-calendar';
    const [stoppingWatch, setStoppingWatch] = useState(false);
    const [watchStopped, setWatchStopped] = useState(false);

    const stopWatch = async () => {
        setStoppingWatch(true);
        try {
            const res = await apiFetch(`/calendar/stop-watch`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ userId })
            });
            if (!res.ok) {
                const json = await res.json();
                throw new Error(json.error ?? 'Failed to stop watch');
            }
            setWatchStopped(true);
            toast.success('Watch stopped', { description: 'Google Calendar webhook notifications disabled' });
        } catch (err: any) {
            toast.error('Failed to stop watch', { description: err?.message });
        } finally {
            setStoppingWatch(false);
        }
    };

    const handleReconnect = () => reconnect({ userId, providerConfigKey: 'google-calendar' });
    const [expandedEventId, setExpandedEventId] = useState<string | null>(null);

    const { data: upcomingEvents, isLoading: loadingEvents, refetch: refetchEvents } = useQuery({
        queryKey: ['gcal-events', userId],
        queryFn: async () => {
            const res = await apiFetch(`/records?integrationId=google-calendar&model=GoogleCalendarEvent&limit=50`);
            if (!res.ok) return [];
            const json = await res.json();
            const now = new Date().getTime();
            return (json.records ?? [])
                .map((r: any) => r.data as any)
                .filter((e: any) => {
                    const start = e.start?.dateTime ?? e.start?.date;
                    return start ? new Date(start).getTime() >= now : false;
                })
                .sort((a: any, b: any) => {
                    const aStart = a.start?.dateTime ?? a.start?.date ?? '';
                    const bStart = b.start?.dateTime ?? b.start?.date ?? '';
                    return aStart < bStart ? -1 : 1;
                })
                .slice(0, 15);
        },
        staleTime: 60_000
    });

    const [prompt, setPrompt] = useState('');
    const [scheduling, setScheduling] = useState(false);
    const [scheduleSteps, setScheduleSteps] = useState<ScheduleStep[]>([]);
    const [createdEvent, setCreatedEvent] = useState<any>(null);
    const bottomRef = useRef<HTMLDivElement>(null);

    useEffect(() => { bottomRef.current?.scrollIntoView({ behavior: 'smooth' }); }, [scheduleSteps]);

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
                schedule(finalTranscript.trim());
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

    const schedule = async (text?: string) => {
        const p = (text ?? prompt).trim();
        if (!p || scheduling) return;
        setScheduling(true);
        setScheduleSteps([]);
        setCreatedEvent(null);
        setPrompt('');
        try {
            const res = await apiFetch(`/calendar/schedule`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ prompt: p, userId })
            });
            const json = await res.json();
            if (!res.ok) throw new Error(json.error ?? 'Scheduling failed');
            setScheduleSteps(json.steps ?? []);
            if (json.event) {
                setCreatedEvent(json.event);
                toast.success('Event scheduled!', { description: json.event.summary });
                refetchEvents();
            }
        } catch (err: any) {
            setScheduleSteps([{ type: 'error', message: err?.message ?? 'Scheduling failed' }]);
        } finally {
            setScheduling(false);
        }
    };

    const { events: liveEvents } = useSSE({
        maxEvents: 30,
        onEvent: (event) => {
            if (event.type === 'sync' && event.provider === 'google-calendar') {
                refetchEvents();
                toast.success('Calendar synced', { description: 'Upcoming events updated' });
            }
        }
    });

    const { data: historicalEvents } = useQuery({
        queryKey: ['webhook-events', 'gcal-forward'],
        queryFn: async () => {
            const res = await apiFetch(`/webhook-events?type=forward&provider=google-calendar&limit=20`);
            if (!res.ok) return [];
            return (await res.json()).events as any[];
        },
        staleTime: 30_000
    });

    const calendarEvents = (() => {
        const seen = new Set<string>();
        return [...liveEvents, ...(historicalEvents ?? [])]
            .filter((e) => e.provider?.includes('google-calendar') || e.provider?.includes('gcal'))
            .filter((e) => { if (seen.has(e.id)) return false; seen.add(e.id); return true; });
    })();

    return (
        <div className="flex h-full">
            {/* ── Left: Upcoming events ──────────────────────────────── */}
            <div className="w-60 shrink-0 border-r border-zinc-800/60 flex flex-col bg-zinc-950/30">
                <div className="flex items-center gap-2 px-4 py-3.5 border-b border-zinc-800/60">
                    <Calendar size={12} className="text-zinc-500" />
                    <span className="text-zinc-400 text-xs font-medium">Upcoming</span>
                    {upcomingEvents && (
                        <span className="text-zinc-600 text-[10px] ml-auto">{upcomingEvents.length}</span>
                    )}
                </div>

                <div className="flex items-center gap-2 px-4 py-2.5 border-b border-zinc-800/40">
                    <div className="w-1.5 h-1.5 rounded-full bg-emerald-400" />
                    <span className="text-zinc-500 text-[10px] truncate">Connected · {connectionId.slice(0, 8)}…</span>
                </div>

                <div className="flex-1 overflow-y-auto py-2">
                    {loadingEvents ? (
                        <div className="space-y-2 px-3 py-3">
                            {[...Array(5)].map((_, i) => (
                                <div key={i} className="animate-pulse space-y-1.5">
                                    <div className="h-2 bg-zinc-800 rounded" style={{ width: `${65 + i * 6}%` }} />
                                    <div className="h-1.5 bg-zinc-800/60 rounded w-1/2" />
                                </div>
                            ))}
                        </div>
                    ) : !upcomingEvents?.length ? (
                        <div className="px-4 py-6 text-center">
                            <Calendar size={20} className="text-zinc-700 mx-auto mb-2" />
                            <p className="text-zinc-600 text-[11px] leading-relaxed">No upcoming events found. Schedule one with AI →</p>
                        </div>
                    ) : (
                        upcomingEvents.map((event: any) => {
                            const startDt = event.start?.dateTime;
                            const startD = event.start?.date;
                            const endDt = event.end?.dateTime;
                            const dateLabel = formatEventDate(startDt, startD);
                            const timeLabel = formatEventTime(startDt, startD);
                            const dur = eventDuration(startDt, endDt);
                            return (
                                <div
                                    key={event.id}
                                    className="px-3 py-2.5 border-b border-zinc-800/30 hover:bg-zinc-800/20 transition-colors cursor-default"
                                >
                                    <div className="flex items-start gap-2">
                                        <div className="w-1 h-full min-h-[2rem] rounded-full shrink-0 mt-0.5" style={{ background: GCAL_COLOR }} />
                                        <div className="min-w-0 flex-1">
                                            <p className="text-zinc-200 text-xs font-medium truncate">{event.summary || '(No title)'}</p>
                                            <div className="flex items-center gap-1.5 mt-0.5">
                                                <span className="text-zinc-500 text-[10px]">{dateLabel}</span>
                                                {timeLabel && <span className="text-zinc-600 text-[9px]">· {timeLabel}</span>}
                                                {dur && <span className="text-zinc-700 text-[9px]">· {dur}</span>}
                                            </div>
                                            {event.attendees?.length > 0 && (
                                                <div className="flex items-center gap-1 mt-0.5">
                                                    <Users size={8} className="text-zinc-600" />
                                                    <span className="text-zinc-600 text-[9px]">{event.attendees.length}</span>
                                                </div>
                                            )}
                                            {event.hangoutLink && (
                                                <div className="flex items-center gap-1 mt-0.5">
                                                    <Video size={8} className="text-zinc-600" />
                                                    <span className="text-zinc-600 text-[9px]">Meet</span>
                                                </div>
                                            )}
                                        </div>
                                        {event.htmlLink && (
                                            <a href={event.htmlLink} target="_blank" rel="noreferrer" className="shrink-0 mt-0.5">
                                                <ExternalLink size={9} className="text-zinc-700 hover:text-zinc-400 transition-colors" />
                                            </a>
                                        )}
                                    </div>
                                </div>
                            );
                        })
                    )}
                </div>

                <div className="px-4 py-3 border-t border-zinc-800/40 flex flex-wrap items-center gap-x-3 gap-y-2">
                    <button
                        onClick={() => refetchEvents()}
                        className="flex items-center gap-1.5 text-[11px] text-zinc-600 hover:text-zinc-300 transition-colors"
                    >
                        <RefreshCw size={10} />
                        Refresh
                    </button>
                    <button
                        onClick={handleReconnect}
                        disabled={isReconnecting}
                        className="flex items-center gap-1.5 text-[11px] text-zinc-600 hover:text-zinc-300 transition-colors disabled:opacity-50"
                    >
                        <RefreshCw size={10} className={isReconnecting ? 'animate-spin' : ''} />
                        Reconnect
                    </button>
                    <button
                        onClick={stopWatch}
                        disabled={stoppingWatch || watchStopped}
                        className={`flex items-center gap-1.5 text-[11px] transition-colors disabled:opacity-50 whitespace-nowrap ${watchStopped ? 'text-zinc-700 cursor-default' : 'text-zinc-600 hover:text-amber-400'}`}
                    >
                        <BellOff size={10} className={stoppingWatch ? 'animate-pulse' : ''} />
                        {watchStopped ? 'Watching off' : 'Watch off'}
                    </button>
                    <button
                        onClick={async () => {
                            await disconnect('google-calendar');
                            queryClient.invalidateQueries({ queryKey: ['connections'] });
                            onDisconnect();
                        }}
                        className="flex items-center gap-1.5 text-[11px] text-zinc-600 hover:text-red-400 transition-colors"
                    >
                        <Unlink size={10} />
                        Disconnect
                    </button>
                </div>
            </div>

            {/* ── Center: AI Scheduler ────────────────────────────────── */}
            <div className="flex-1 min-w-0 flex flex-col p-6">
                <div className="flex items-center gap-2 mb-1">
                    <Sparkles size={14} style={{ color: GCAL_COLOR }} />
                    <h3 className="text-zinc-200 text-sm font-medium">AI Scheduler</h3>
                    <Badge variant="blue" size="xs">LLM</Badge>
                </div>
                <p className="text-zinc-500 text-xs mb-5">Describe an event in plain English — the LLM extracts the details and creates it on your calendar.</p>

                <div className="flex-1 flex flex-col max-w-xl">
                    {/* Example prompts */}
                    <div className="mb-4">
                        <p className="text-zinc-600 text-[10px] uppercase tracking-wider mb-2">Try an example</p>
                        <div className="flex flex-wrap gap-1.5">
                            {EXAMPLE_PROMPTS.map((ex) => (
                                <button
                                    key={ex}
                                    onClick={() => schedule(ex)}
                                    disabled={scheduling}
                                    className="text-[11px] text-zinc-400 hover:text-white px-2.5 py-1 rounded-full border border-zinc-700/60 hover:border-zinc-500 bg-zinc-800/40 transition-all disabled:opacity-40"
                                >
                                    {ex}
                                </button>
                            ))}
                        </div>
                    </div>

                    {/* Prompt input */}
                    <div className="mb-3">
                        <p className="text-zinc-500 text-xs mb-1.5">Or type your own — or use the mic</p>
                        <div className="flex gap-2">
                            <div className="relative flex-1">
                                <input
                                    value={prompt}
                                    onChange={(e) => setPrompt(e.target.value)}
                                    onKeyDown={(e) => e.key === 'Enter' && schedule()}
                                    placeholder={listening ? 'Listening… speak your command' : 'e.g. 1:1 with Alex next Tuesday at 3pm for 45 minutes'}
                                    disabled={scheduling}
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
                                disabled={scheduling}
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
                                onClick={() => schedule()}
                                disabled={!prompt.trim() || scheduling}
                                className="flex items-center gap-1.5 px-4 py-2.5 rounded-xl text-sm font-medium text-white transition-all shrink-0 disabled:opacity-40"
                                style={{ background: scheduling || !prompt.trim() ? '#3f3f46' : GCAL_COLOR }}
                            >
                                {scheduling ? <Loader2 size={13} className="animate-spin" /> : <Sparkles size={13} />}
                                {scheduling ? 'Scheduling…' : 'Schedule'}
                            </button>
                        </div>
                    </div>

                    {/* Agent trace */}
                    <AnimatePresence>
                        {scheduleSteps.length > 0 && (
                            <motion.div
                                initial={{ opacity: 0, y: 8 }}
                                animate={{ opacity: 1, y: 0 }}
                                className="rounded-xl border border-zinc-800/60 bg-zinc-950/60 p-4 space-y-3 mb-4"
                            >
                                <p className="text-zinc-500 text-[11px] uppercase tracking-wider flex items-center gap-1.5">
                                    <Terminal size={10} /> Agent trace
                                </p>
                                <div className="space-y-2.5">
                                    {scheduleSteps.map((step, i) => (
                                        <ScheduleStepRow key={i} step={step} />
                                    ))}
                                </div>
                                <div ref={bottomRef} />
                            </motion.div>
                        )}
                    </AnimatePresence>

                    {/* Created event confirmation */}
                    <AnimatePresence>
                        {createdEvent && (
                            <motion.div
                                initial={{ opacity: 0, scale: 0.97 }}
                                animate={{ opacity: 1, scale: 1 }}
                                className="rounded-xl border p-4"
                                style={{ borderColor: `${GCAL_COLOR}30`, background: `${GCAL_COLOR}08` }}
                            >
                                <div className="flex items-start gap-3">
                                    <div className="w-8 h-8 rounded-lg flex items-center justify-center shrink-0" style={{ background: `${GCAL_COLOR}20` }}>
                                        <CheckCircle2 size={15} style={{ color: GCAL_COLOR }} />
                                    </div>
                                    <div className="flex-1 min-w-0">
                                        <p className="text-zinc-100 text-sm font-semibold">{createdEvent.summary}</p>
                                        {createdEvent.start?.dateTime && (
                                            <div className="flex items-center gap-1.5 mt-1">
                                                <Clock size={10} className="text-zinc-500" />
                                                <span className="text-zinc-400 text-xs">
                                                    {new Date(createdEvent.start.dateTime).toLocaleString([], {
                                                        weekday: 'short', month: 'short', day: 'numeric',
                                                        hour: '2-digit', minute: '2-digit'
                                                    })}
                                                    {createdEvent.end?.dateTime && ` → ${new Date(createdEvent.end.dateTime).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}`}
                                                </span>
                                            </div>
                                        )}
                                        {createdEvent.location && (
                                            <div className="flex items-center gap-1.5 mt-0.5">
                                                <MapPin size={10} className="text-zinc-500" />
                                                <span className="text-zinc-400 text-xs">{createdEvent.location}</span>
                                            </div>
                                        )}
                                    </div>
                                    {createdEvent.htmlLink && (
                                        <a href={createdEvent.htmlLink} target="_blank" rel="noreferrer"
                                            className="flex items-center gap-1 text-[11px] px-2.5 py-1.5 rounded-lg border transition-all shrink-0"
                                            style={{ borderColor: `${GCAL_COLOR}30`, color: GCAL_COLOR }}
                                        >
                                            <ExternalLink size={10} /> Open
                                        </a>
                                    )}
                                </div>
                            </motion.div>
                        )}
                    </AnimatePresence>

                    {/* Code snippet */}
                    {scheduleSteps.length === 0 && !createdEvent && (
                        <div className="mt-4 rounded-xl border border-zinc-800/60 bg-zinc-900/40 p-4">
                            <p className="text-zinc-500 text-[10px] uppercase tracking-wider mb-2.5">How it works</p>
                            <pre className="text-[11px] font-mono text-zinc-400 leading-relaxed overflow-x-auto whitespace-pre">{`// 1. LLM extracts event details
const event = await llm.extract(prompt);
// → { summary, startDateTime, endDateTime }

// 2. Create via Nango proxy
await nango.proxy({
  method: 'POST',
  providerConfigKey: 'google-calendar',
  endpoint: '/calendar/v3/calendars/primary/events',
  data: event
});`}</pre>
                        </div>
                    )}
                </div>
            </div>

            {/* ── Right: Calendar webhook events ─────────────────────── */}
            <div className="w-80 shrink-0 border-l border-zinc-800/60 flex flex-col bg-zinc-950/30">
                <div className="flex items-center gap-2 px-4 py-3.5 border-b border-zinc-800/60">
                    <Zap size={12} className="text-blue-400" />
                    <span className="text-zinc-400 text-xs font-medium">Calendar Events</span>
                    <div className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse ml-auto" />
                </div>

                <div className="flex-1 overflow-y-auto p-3 space-y-2">
                    <AnimatePresence initial={false}>
                        {calendarEvents.length === 0 ? (
                            <div className="text-center mt-10 px-3">
                                <Calendar size={20} className="text-zinc-700 mx-auto mb-2" />
                                <p className="text-zinc-600 text-[11px] leading-relaxed">
                                    Google Calendar forward webhooks will appear here — event created, updated, or deleted notifications in real-time.
                                </p>
                            </div>
                        ) : (
                            calendarEvents.map((event) => {
                                const isExpanded = expandedEventId === event.id;
                                // event.payload is the Nango envelope; Google Calendar headers are nested at .payload
                                const innerPayload = (event.payload as any)?.payload;
                                const eventAction = innerPayload?.['x-goog-resource-state']  // e.g. "sync", "exists"
                                    ?? innerPayload?.resourceState
                                    ?? innerPayload?.event?.type
                                    ?? 'change';
                                return (
                                    <motion.div
                                        key={event.id}
                                        initial={{ opacity: 0, y: -6 }}
                                        animate={{ opacity: 1, y: 0 }}
                                        className="rounded-lg border overflow-hidden"
                                        style={{ borderColor: `${GCAL_COLOR}30`, background: `${GCAL_COLOR}08` }}
                                    >
                                        <button
                                            onClick={() => setExpandedEventId(isExpanded ? null : event.id)}
                                            className="w-full flex items-center gap-1.5 px-2.5 py-2 text-left transition-colors hover:bg-white/5"
                                        >
                                            {isExpanded ? <ChevronRight size={10} className="text-zinc-500 shrink-0 rotate-90" /> : <ChevronRight size={10} className="text-zinc-500 shrink-0" />}
                                            <Badge variant="blue" size="xs">Forward</Badge>
                                            <span className="text-zinc-400 text-[10px] truncate flex-1">{eventAction}</span>
                                            <span className="text-zinc-600 text-[9px] shrink-0 ml-1">
                                                {new Date(event.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' })}
                                            </span>
                                        </button>
                                        {isExpanded && (
                                            <div className="px-2.5 pb-2.5 border-t" style={{ borderColor: `${GCAL_COLOR}20` }}>
                                                <pre className="text-[10px] font-mono text-zinc-400 leading-relaxed overflow-x-auto max-h-48 mt-2 whitespace-pre">
                                                    {JSON.stringify(event.payload, null, 2)}
                                                </pre>
                                            </div>
                                        )}
                                    </motion.div>
                                );
                            })
                        )}
                    </AnimatePresence>
                </div>
            </div>
        </div>
    );
}
