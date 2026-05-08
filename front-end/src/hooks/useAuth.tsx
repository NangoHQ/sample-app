import { useState, useEffect, useCallback, createContext, useContext } from 'react';
import type { ReactNode } from 'react';
import { baseUrl } from '../utils';

export interface AuthUser {
    id: string;
    email: string;
    displayName: string;
}

interface AuthContextValue {
    user: AuthUser | null;
    token: string | null;
    loading: boolean;
    isAuthenticated: boolean;
    login: (email: string, password: string) => Promise<AuthUser>;
    register: (email: string, password: string, displayName: string) => Promise<AuthUser>;
    logout: () => void;
}

const AUTH_KEY = 'nango_auth_v1';

function loadStored(): { token: string; user: AuthUser } | null {
    if (typeof window === 'undefined') return null;
    try {
        const raw = localStorage.getItem(AUTH_KEY);
        return raw ? JSON.parse(raw) : null;
    } catch {
        return null;
    }
}

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
    const [token, setToken] = useState<string | null>(null);
    const [user, setUser] = useState<AuthUser | null>(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const stored = loadStored();
        if (stored) {
            setToken(stored.token);
            setUser(stored.user);
        }
        setLoading(false);
    }, []);

    const save = useCallback((token: string, user: AuthUser) => {
        localStorage.setItem(AUTH_KEY, JSON.stringify({ token, user }));
        setToken(token);
        setUser(user);
    }, []);

    const register = useCallback(async (email: string, password: string, displayName: string) => {
        const res = await fetch(`${baseUrl}/auth/register`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ email, password, displayName })
        });
        const data = await res.json();
        if (!res.ok) throw new Error(data.error || 'Registration failed');
        return data.user as AuthUser;
    }, []);

    const login = useCallback(async (email: string, password: string) => {
        const res = await fetch(`${baseUrl}/auth/login`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ email, password })
        });
        const data = await res.json();
        if (!res.ok) throw new Error(data.error || 'Login failed');
        save(data.token, data.user);
        return data.user as AuthUser;
    }, [save]);

    const logout = useCallback(() => {
        localStorage.removeItem(AUTH_KEY);
        setToken(null);
        setUser(null);
    }, []);

    return (
        <AuthContext.Provider value={{ user, token, loading, isAuthenticated: !!user, login, register, logout }}>
            {children}
        </AuthContext.Provider>
    );
}

export function useAuth() {
    const ctx = useContext(AuthContext);
    if (!ctx) throw new Error('useAuth must be used within AuthProvider');
    return ctx;
}
