import type { ReactNode } from 'react';
import { createContext, useContext, useState } from 'react';
import { Sidebar } from './Sidebar';
import { UserSelector } from './UserSelector';
import type { AppUser } from './UserSelector';
import { useAuth } from '../../hooks/useAuth';

interface UserContextValue {
    user: AppUser;
    logout: () => void;
}

const UserContext = createContext<UserContextValue | null>(null);

export function useUser() {
    const ctx = useContext(UserContext);
    if (!ctx) throw new Error('useUser must be used within UserProvider');
    return ctx;
}

export function UserProvider({ children }: { children: ReactNode }) {
    const { user, logout } = useAuth();
    // user may be null during SSR/initial load — gate in _app.tsx
    if (!user) return <>{children}</>;
    return (
        <UserContext.Provider value={{ user, logout }}>
            {children}
        </UserContext.Provider>
    );
}

interface Props {
    children: ReactNode;
    title?: string;
    description?: string;
    actions?: ReactNode;
}

export function Layout({ children, title, description, actions }: Props) {
    const { user, logout } = useUser();
    const [collapsed, setCollapsed] = useState(false);

    return (
        <div className="flex h-screen w-screen bg-zinc-950 overflow-hidden">
            <Sidebar collapsed={collapsed} onToggle={() => setCollapsed(c => !c)} />
            <div className="flex-1 flex flex-col min-w-0">
                {/* Top bar */}
                <header className="flex items-center justify-between px-6 py-3.5 border-b border-zinc-800/60 bg-zinc-950/80 backdrop-blur-sm shrink-0">
                    <div>
                        {title && (
                            <h1 className="text-zinc-100 font-semibold text-base leading-none">{title}</h1>
                        )}
                        {description && (
                            <p className="text-zinc-500 text-xs mt-1">{description}</p>
                        )}
                    </div>
                    <div className="flex items-center gap-3">
                        {actions}
                        <UserSelector user={user} onLogout={logout} />
                    </div>
                </header>

                {/* Page content */}
                <main className="flex-1 overflow-auto">
                    {children}
                </main>
            </div>
        </div>
    );
}
