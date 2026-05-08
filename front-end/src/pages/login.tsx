import { useState, useEffect } from 'react';
import { useRouter } from 'next/router';
import Link from 'next/link';
import { Loader2, Mail, Lock, Zap } from 'lucide-react';
import { toast } from 'sonner';
import { useAuth } from '../hooks/useAuth';

export default function LoginPage() {
    const router = useRouter();
    const { login, isAuthenticated, loading } = useAuth();
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [submitting, setSubmitting] = useState(false);

    useEffect(() => {
        if (!loading && isAuthenticated) {
            router.replace('/');
        }
    }, [loading, isAuthenticated, router]);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setSubmitting(true);
        try {
            await login(email, password);
            router.replace('/');
        } catch (err: any) {
            toast.error(err.message);
        } finally {
            setSubmitting(false);
        }
    };

    if (loading) return null;

    return (
        <div className="min-h-screen bg-zinc-950 flex items-center justify-center p-4">
            {/* Background glow */}
            <div className="fixed inset-0 overflow-hidden pointer-events-none">
                <div className="absolute top-1/4 left-1/2 -translate-x-1/2 w-[600px] h-[600px] bg-indigo-500/10 rounded-full blur-[120px]" />
            </div>

            <div className="w-full max-w-sm relative">
                {/* Logo */}
                <div className="text-center mb-8">
                    <div className="inline-flex items-center gap-2.5 mb-6">
                        <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-indigo-500 to-violet-600 flex items-center justify-center shadow-lg shadow-indigo-500/30">
                            <Zap size={18} className="text-white" />
                        </div>
                        <span className="text-zinc-100 font-bold text-xl tracking-tight">Nango Showcase</span>
                    </div>
                    <h1 className="text-zinc-100 text-2xl font-semibold">Welcome back</h1>
                    <p className="text-zinc-500 text-sm mt-1">Sign in to your account</p>
                </div>

                {/* Card */}
                <div className="bg-zinc-900/60 border border-zinc-800/60 rounded-2xl p-6 backdrop-blur-sm">
                    <form onSubmit={handleSubmit} className="space-y-4">
                        <div>
                            <label className="text-zinc-400 text-xs font-medium block mb-1.5">Email</label>
                            <div className="relative">
                                <Mail size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-500" />
                                <input
                                    type="email"
                                    value={email}
                                    onChange={(e) => setEmail(e.target.value)}
                                    placeholder="you@example.com"
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
                                    onChange={(e) => setPassword(e.target.value)}
                                    placeholder="••••••••"
                                    required
                                    className="w-full pl-9 pr-3 py-2.5 bg-zinc-800/60 border border-zinc-700/60 rounded-xl text-zinc-200 text-sm placeholder-zinc-600 focus:outline-none focus:border-indigo-500/60 transition-colors"
                                />
                            </div>
                        </div>

                        <button
                            type="submit"
                            disabled={submitting}
                            className="w-full flex items-center justify-center gap-2 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-sm font-semibold transition-all disabled:opacity-60 mt-2"
                        >
                            {submitting ? <Loader2 size={15} className="animate-spin" /> : null}
                            {submitting ? 'Signing in...' : 'Sign in'}
                        </button>
                    </form>
                </div>

                <p className="text-center text-zinc-500 text-sm mt-5">
                    Don't have an account?{' '}
                    <Link href="/register" className="text-indigo-400 hover:text-indigo-300 font-medium transition-colors">
                        Create one
                    </Link>
                </p>
            </div>
        </div>
    );
}
