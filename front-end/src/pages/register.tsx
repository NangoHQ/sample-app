import { useState, useEffect } from 'react';
import { useRouter } from 'next/router';
import Link from 'next/link';
import { Loader2, Mail, Lock, User, Zap, Check, X } from 'lucide-react';
import { toast } from 'sonner';
import { useAuth } from '../hooks/useAuth';

const rules = [
    { label: 'At least 8 characters', test: (p: string) => p.length >= 8 },
    { label: 'Uppercase letter', test: (p: string) => /[A-Z]/.test(p) },
    { label: 'Lowercase letter', test: (p: string) => /[a-z]/.test(p) },
    { label: 'Number', test: (p: string) => /[0-9]/.test(p) },
    { label: 'Special character', test: (p: string) => /[^A-Za-z0-9]/.test(p) },
];

export default function RegisterPage() {
    const router = useRouter();
    const { register, isAuthenticated, loading } = useAuth();
    const [displayName, setDisplayName] = useState('');
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [confirm, setConfirm] = useState('');
    const [passwordTouched, setPasswordTouched] = useState(false);
    const [confirmTouched, setConfirmTouched] = useState(false);
    const [submitting, setSubmitting] = useState(false);

    useEffect(() => {
        if (!loading && isAuthenticated) {
            router.replace('/');
        }
    }, [loading, isAuthenticated, router]);

    const passwordValid = rules.every((r) => r.test(password));
    const passwordsMatch = password === confirm;

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setPasswordTouched(true);
        setConfirmTouched(true);
        if (!passwordValid || !passwordsMatch) return;
        setSubmitting(true);
        try {
            await register(email, password, displayName);
            toast.success('Account created! Please sign in.');
            router.replace('/login');
        } catch (err: any) {
            toast.error(err.message);
        } finally {
            setSubmitting(false);
        }
    };

    if (loading) return null;

    return (
        <div className="min-h-screen bg-zinc-950 flex items-center justify-center p-4">
            <div className="fixed inset-0 overflow-hidden pointer-events-none">
                <div className="absolute top-1/4 left-1/2 -translate-x-1/2 w-[600px] h-[600px] bg-indigo-500/10 rounded-full blur-[120px]" />
            </div>

            <div className="w-full max-w-sm relative">
                <div className="text-center mb-8">
                    <div className="inline-flex items-center gap-2.5 mb-6">
                        <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-indigo-500 to-violet-600 flex items-center justify-center shadow-lg shadow-indigo-500/30">
                            <Zap size={18} className="text-white" />
                        </div>
                        <span className="text-zinc-100 font-bold text-xl tracking-tight">Nango Showcase</span>
                    </div>
                    <h1 className="text-zinc-100 text-2xl font-semibold">Create account</h1>
                    <p className="text-zinc-500 text-sm mt-1">Start exploring Nango integrations</p>
                </div>

                <div className="bg-zinc-900/60 border border-zinc-800/60 rounded-2xl p-6 backdrop-blur-sm">
                    <form onSubmit={handleSubmit} className="space-y-4">
                        <div>
                            <label className="text-zinc-400 text-xs font-medium block mb-1.5">Name</label>
                            <div className="relative">
                                <User size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-500" />
                                <input
                                    type="text"
                                    value={displayName}
                                    onChange={(e) => setDisplayName(e.target.value)}
                                    placeholder="Jane Smith"
                                    required
                                    className="w-full pl-9 pr-3 py-2.5 bg-zinc-800/60 border border-zinc-700/60 rounded-xl text-zinc-200 text-sm placeholder-zinc-600 focus:outline-none focus:border-indigo-500/60 transition-colors"
                                />
                            </div>
                        </div>

                        <div>
                            <label className="text-zinc-400 text-xs font-medium block mb-1.5">Email</label>
                            <div className="relative">
                                <Mail size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-500" />
                                <input
                                    type="email"
                                    value={email}
                                    onChange={(e) => setEmail(e.target.value)}
                                    placeholder="you@nango.dev"
                                    required
                                    className="w-full pl-9 pr-3 py-2.5 bg-zinc-800/60 border border-zinc-700/60 rounded-xl text-zinc-200 text-sm placeholder-zinc-600 focus:outline-none focus:border-indigo-500/60 transition-colors"
                                />
                            </div>
                        </div>

                        <div>
                            <label className="text-zinc-400 text-xs font-medium block mb-1.5">Password</label>
                            <div className="relative">
                                <Lock size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-500" />
                                <input
                                    type="password"
                                    value={password}
                                    onChange={(e) => { setPassword(e.target.value); setPasswordTouched(true); }}
                                    placeholder="Create a strong password"
                                    required
                                    className="w-full pl-9 pr-3 py-2.5 bg-zinc-800/60 border border-zinc-700/60 rounded-xl text-zinc-200 text-sm placeholder-zinc-600 focus:outline-none focus:border-indigo-500/60 transition-colors"
                                />
                            </div>
                            {passwordTouched && (
                                <ul className="mt-2 space-y-1">
                                    {rules.map((rule) => {
                                        const passed = rule.test(password);
                                        return (
                                            <li key={rule.label} className={`flex items-center gap-1.5 text-xs ${passed ? 'text-emerald-400' : 'text-zinc-500'}`}>
                                                {passed
                                                    ? <Check size={11} className="shrink-0" />
                                                    : <X size={11} className="shrink-0" />}
                                                {rule.label}
                                            </li>
                                        );
                                    })}
                                </ul>
                            )}
                        </div>

                        <div>
                            <label className="text-zinc-400 text-xs font-medium block mb-1.5">Confirm password</label>
                            <div className="relative">
                                <Lock size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-500" />
                                <input
                                    type="password"
                                    value={confirm}
                                    onChange={(e) => { setConfirm(e.target.value); setConfirmTouched(true); }}
                                    placeholder="Repeat your password"
                                    required
                                    className={`w-full pl-9 pr-3 py-2.5 bg-zinc-800/60 border rounded-xl text-zinc-200 text-sm placeholder-zinc-600 focus:outline-none transition-colors ${
                                        confirmTouched && confirm
                                            ? passwordsMatch
                                                ? 'border-emerald-500/60 focus:border-emerald-500/80'
                                                : 'border-red-500/60 focus:border-red-500/80'
                                            : 'border-zinc-700/60 focus:border-indigo-500/60'
                                    }`}
                                />
                            </div>
                            {confirmTouched && confirm && !passwordsMatch && (
                                <p className="mt-1.5 text-xs text-red-400 flex items-center gap-1"><X size={11} />Passwords do not match</p>
                            )}
                            {confirmTouched && confirm && passwordsMatch && (
                                <p className="mt-1.5 text-xs text-emerald-400 flex items-center gap-1"><Check size={11} />Passwords match</p>
                            )}
                        </div>

                        <button
                            type="submit"
                            disabled={submitting}
                            className="w-full flex items-center justify-center gap-2 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-sm font-semibold transition-all disabled:opacity-60 mt-2"
                        >
                            {submitting ? <Loader2 size={15} className="animate-spin" /> : null}
                            {submitting ? 'Creating account...' : 'Create account'}
                        </button>
                    </form>
                </div>

                <p className="text-center text-zinc-500 text-sm mt-5">
                    Already have an account?{' '}
                    <Link href="/login" className="text-indigo-400 hover:text-indigo-300 font-medium transition-colors">
                        Sign in
                    </Link>
                </p>
            </div>
        </div>
    );
}
