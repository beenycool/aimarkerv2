import { useCallback, useRef, useEffect, useMemo } from 'react';
import { get, set, del } from 'idb-keyval';
import { createClient } from '@/app/lib/supabase/client';
import { PersistedExamState, deserializeSession } from '@/app/types/exam-session';
import type { ExamSessionState } from './useExamSessionState';

const IDB_KEY = 'gcse_marker_state';

export function useExamSessionPersistence(state: ExamSessionState) {
    const {
        activeQuestions,
        userAnswers,
        feedbacks,
        insertContent,
        currentQIndex,
        skippedQuestions,
        followUpChats,
        paperFilePaths,
        paperId,
        parsedMarkScheme,
        quoteDrafts,
        restoredSessionRef,
        getSerializedSnapshot,
        applySessionData,
    } = state;

    const supabase = useMemo(() => createClient(), []);
    const saveTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

    // Persist to IndexedDB
    const saveSession = useCallback(async (phase: string) => {
        if (typeof window === 'undefined') return;
        if (phase === 'exam' && activeQuestions.length > 0) {
            try {
                await set(IDB_KEY, getSerializedSnapshot());
            } catch (err) {
                console.error('Failed to persist session', err);
            }
        }
    }, [activeQuestions, getSerializedSnapshot]);

    // Sync to Supabase (Cloud) — debounced
    useEffect(() => {
        if (typeof window === 'undefined' || !paperId || !activeQuestions.length) return;

        if (saveTimeoutRef.current) clearTimeout(saveTimeoutRef.current);

        saveTimeoutRef.current = setTimeout(async () => {
            try {
                const { data: { user } } = await supabase.auth.getUser();
                if (!user) return;

                const blob = getSerializedSnapshot();

                const { error } = await supabase.from('active_exam_sessions').upsert({
                    student_id: user.id,
                    paper_id: paperId,
                    state: blob as any,
                    updated_at: new Date().toISOString()
                }, { onConflict: 'student_id, paper_id' });

                if (error) console.error('Cloud sync error:', error);

                saveSession('exam');
            } catch (err) {
                console.error('Cloud sync failed:', err);
            }
        }, 3000);

        return () => {
            if (saveTimeoutRef.current) clearTimeout(saveTimeoutRef.current);
        };
    }, [activeQuestions, userAnswers, feedbacks, insertContent, currentQIndex, skippedQuestions, followUpChats, paperFilePaths, paperId, parsedMarkScheme, quoteDrafts, supabase, saveSession, getSerializedSnapshot]);

    // Restore session from IndexedDB
    const restoreSession = useCallback(async (): Promise<PersistedExamState | null> => {
        if (typeof window === 'undefined' || restoredSessionRef.current) return null;

        try {
            const raw = await get(IDB_KEY);
            const parsed = deserializeSession(raw);
            if (parsed) {
                applySessionData(parsed);
                return parsed;
            }
        } catch (err) {
            console.error('Failed to restore saved session', err);
        }
        return null;
    }, [applySessionData, restoredSessionRef]);

    // Clear saved session (local + cloud)
    const clearSession = useCallback(async () => {
        if (typeof window === 'undefined') return;
        try {
            await del(IDB_KEY);

            const { data: { user } } = await supabase.auth.getUser();
            if (user && paperId) {
                await supabase
                    .from('active_exam_sessions')
                    .delete()
                    .eq('student_id', user.id)
                    .eq('paper_id', paperId);
            }
        } catch (err) {
            console.error('Failed to clear session', err);
        }
    }, [supabase, paperId]);

    // Check if a session exists for a specific paper
    const checkSessionForPaper = useCallback(async (paperIdentifier: string): Promise<boolean> => {
        if (typeof window === 'undefined') return false;

        try {
            const raw = await get(IDB_KEY);
            const parsed = deserializeSession(raw);
            if (parsed && parsed.paperId === paperIdentifier) {
                return true;
            }

            const { data: { user } } = await supabase.auth.getUser();
            if (user) {
                const { data } = await supabase
                    .from('active_exam_sessions')
                    .select('id')
                    .eq('student_id', user.id)
                    .eq('paper_id', paperIdentifier)
                    .single();
                if (data) return true;
            }
            return false;
        } catch {
            return false;
        }
    }, [supabase]);

    // Restore session for a specific paper
    const restoreSessionForPaper = useCallback(async (paperIdentifier: string): Promise<PersistedExamState | null> => {
        if (typeof window === 'undefined') return null;

        try {
            const { data: { user } } = await supabase.auth.getUser();
            let cloudState: PersistedExamState | null = null;
            if (user) {
                const { data } = await supabase
                    .from('active_exam_sessions')
                    .select('state')
                    .eq('student_id', user.id)
                    .eq('paper_id', paperIdentifier)
                    .single();
                if (data?.state) cloudState = deserializeSession(data.state);
            }

            const raw = await get(IDB_KEY);
            const localState = deserializeSession(raw);

            let finalState: PersistedExamState | null = null;
            if (cloudState && localState && localState.paperId === paperIdentifier) {
                finalState = (cloudState.timestamp || 0) > (localState.timestamp || 0) ? cloudState : localState;
            } else if (cloudState) {
                finalState = cloudState;
            } else if (localState && localState.paperId === paperIdentifier) {
                finalState = localState;
            }

            if (finalState) {
                applySessionData(finalState);
                return finalState;
            }
        } catch (err) {
            console.error('Failed to restore session for paper', err);
        }
        return null;
    }, [applySessionData, supabase]);

    return {
        saveSession,
        restoreSession,
        clearSession,
        checkSessionForPaper,
        restoreSessionForPaper,
    };
}
