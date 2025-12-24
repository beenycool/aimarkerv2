'use client';

import { createContext, useContext, useEffect, useState, ReactNode, useCallback } from 'react';
import { User, Session } from '@supabase/supabase-js';
import { createClient } from '@/app/lib/supabase/client';

interface AuthContextType {
    user: User | null;
    session: Session | null;
    loading: boolean;
    signIn: (email: string, password: string) => Promise<{ error: Error | null }>;
    signUp: (email: string, password: string) => Promise<{ error: Error | null }>;
    signInAnonymously: () => Promise<{
        data: { user: User | null; session: Session | null } | null;
        error: Error | null;
    }>;
    signOut: () => Promise<void>;
    getEffectiveStudentId: () => string | null;
    isAuthenticated: boolean;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

const ANONYMOUS_STORAGE_KEY = 'gcse_student_id_v1';

/**
 * Get or create an anonymous student ID from localStorage.
 * Used as fallback when user is not authenticated.
 */
function getOrCreateAnonymousId(): string | null {
    if (typeof window === 'undefined') return null;

    let id = window.localStorage.getItem(ANONYMOUS_STORAGE_KEY);
    if (!id) {
        // Prefer crypto UUID when available
        if (window.crypto?.randomUUID) {
            id = window.crypto.randomUUID();
        } else {
            id = `${Date.now()}-${Math.random().toString(16).slice(2)}`;
        }
        window.localStorage.setItem(ANONYMOUS_STORAGE_KEY, id);
    }
    return id;
}

export function AuthProvider({ children }: { children: ReactNode }) {
    const [user, setUser] = useState<User | null>(null);
    const [session, setSession] = useState<Session | null>(null);
    const [loading, setLoading] = useState(true);
    const [supabase] = useState(() => createClient());

    useEffect(() => {
        // Get initial session
        supabase.auth.getSession().then(({ data: { session } }) => {
            setSession(session);
            setUser(session?.user ?? null);
            setLoading(false);
        });

        // Listen for auth changes
        const {
            data: { subscription },
        } = supabase.auth.onAuthStateChange((_event, session) => {
            setSession(session);
            setUser(session?.user ?? null);
            setLoading(false);
        });

        return () => subscription.unsubscribe();
    }, [supabase.auth]);

    const signIn = useCallback(
        async (email: string, password: string) => {
            const { error } = await supabase.auth.signInWithPassword({
                email,
                password,
            });
            return { error: error as Error | null };
        },
        [supabase.auth]
    );

    const signUp = useCallback(
        async (email: string, password: string) => {
            const { error } = await supabase.auth.signUp({
                email,
                password,
                options: {
                    emailRedirectTo: typeof window !== 'undefined'
                        ? `${window.location.origin}/auth/callback`
                        : undefined,
                },
            });
            return { error: error as Error | null };
        },
        [supabase.auth]
    );

    const signInAnonymously = useCallback(async () => {
        const { data, error } = await supabase.auth.signInAnonymously();
        return { data, error: error as Error | null };
    }, [supabase.auth]);

    const signOut = useCallback(async () => {
        await supabase.auth.signOut();
    }, [supabase.auth]);

    /**
     * Returns the effective student ID for database operations.
     * - If authenticated: returns auth.uid()
     * - If anonymous: returns localStorage UUID (allows usage without account)
     */
    const getEffectiveStudentId = useCallback((): string | null => {
        // Prefer authenticated user ID
        if (user?.id) {
            return user.id;
        }

        // Fall back to anonymous localStorage ID
        return getOrCreateAnonymousId();
    }, [user]);

    const isAuthenticated = !!user;

    return (
        <AuthContext.Provider
            value={{
                user,
                session,
                loading,
                signIn,
                signUp,
                signInAnonymously,
                signOut,
                getEffectiveStudentId,
                isAuthenticated,
            }}
        >
            {children}
        </AuthContext.Provider>
    );
}

/**
 * Hook to access auth context.
 * Must be used within an AuthProvider.
 */
export function useAuth() {
    const context = useContext(AuthContext);
    if (!context) {
        throw new Error('useAuth must be used within an AuthProvider');
    }
    return context;
}

/**
 * Hook to get the effective student ID.
 * Convenience wrapper around useAuth().getEffectiveStudentId().
 */
export function useStudentId(): string | null {
    const { getEffectiveStudentId, loading } = useAuth();
    const [studentId, setStudentId] = useState<string | null>(null);

    useEffect(() => {
        if (!loading) {
            setStudentId(getEffectiveStudentId());
        }
    }, [loading, getEffectiveStudentId]);

    return studentId;
}
