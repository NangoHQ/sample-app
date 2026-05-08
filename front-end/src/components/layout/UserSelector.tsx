import { useState, useRef, useEffect } from 'react';
import { ChevronDown, LogOut, User } from 'lucide-react';

export interface AppUser {
    id: string;
    email: string;
    displayName: string;
}

interface Props {
    user: AppUser;
    onLogout: () => void;
}

export function UserSelector({ user, onLogout }: Props) {
    const [open, setOpen] = useState(false);
    const ref = useRef<HTMLDivElement>(null);

    useEffect(() => {
        function handleClick(e: MouseEvent) {
            if (ref.current && !ref.current.contains(e.target as Node)) {
                setOpen(false);
            }
        }
        document.addEventListener('mousedown', handleClick);
        return () => document.removeEventListener('mousedown', handleClick);
    }, []);

    const initials = user.displayName
        .split(' ')
        .map((w) => w[0])
        .join('')
        .toUpperCase()
        .slice(0, 2);

    return (
        <div className="relative" ref={ref}>
            <button
                onClick={() => setOpen((o) => !o)}
                className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-zinc-800/60 hover:bg-zinc-800 border border-zinc-700/50 transition-all text-sm"
            >
                <div className="w-6 h-6 rounded-full bg-gradient-to-br from-indigo-500 to-violet-600 flex items-center justify-center text-[10px] font-bold text-white shrink-0">
                    {initials}
                </div>
                <span className="text-zinc-200 font-medium max-w-[120px] truncate">{user.displayName}</span>
                <ChevronDown size={13} className="text-zinc-500" />
            </button>

            {open && (
                <div className="absolute right-0 top-full mt-1.5 w-56 bg-zinc-900 border border-zinc-700/60 rounded-xl shadow-xl shadow-black/40 py-1.5 z-50">
                    {/* Profile info */}
                    <div className="px-3 py-2.5 border-b border-zinc-800">
                        <div className="flex items-center gap-2.5">
                            <div className="w-8 h-8 rounded-full bg-gradient-to-br from-indigo-500 to-violet-600 flex items-center justify-center text-xs font-bold text-white shrink-0">
                                {initials}
                            </div>
                            <div className="min-w-0">
                                <p className="text-zinc-200 text-xs font-medium truncate">{user.displayName}</p>
                                <p className="text-zinc-500 text-[10px] truncate">{user.email}</p>
                            </div>
                        </div>
                    </div>

                    {/* Actions */}
                    <div className="py-1">
                        <button
                            onClick={() => { onLogout(); setOpen(false); }}
                            className="w-full flex items-center gap-2.5 px-3 py-2 hover:bg-zinc-800 transition-colors text-left text-zinc-400 hover:text-zinc-200"
                        >
                            <LogOut size={13} />
                            <span className="text-xs">Sign out</span>
                        </button>
                    </div>
                </div>
            )}
        </div>
    );
}
