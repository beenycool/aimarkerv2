'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import { useStudentId } from '../components/AuthProvider';
import {
    listSubjects,
    pickTopWeaknesses,
    weaknessCountsFromAttempts,
    listQuestionAttempts,
    getOrCreateSettings
} from '../services/studentOS';

export interface StudentData {
    name: string;
    subjects: { id: string; name: string }[];
    weaknesses: { label: string; count: number }[];
}

export interface TimerState {
    minutes: number;
    seconds: number;
    isRunning: boolean;
    isPaused: boolean;
    sessionsCompleted: number;
    isBreak: boolean;
}

export interface SpacedRepetitionItem {
    topic: string;
    nextReview: Date;
    interval: number; // days
    easeFactor: number;
}

/**
 * Custom hook for study technique features
 */
export function useStudyTechniques() {
    const studentId = useStudentId();
    const [studentData, setStudentData] = useState<StudentData>({
        name: 'Student',
        subjects: [],
        weaknesses: []
    });
    const [loading, setLoading] = useState(true);
    const [hackClubKey, setHackClubKey] = useState<string | null>(null);

    // Pomodoro Timer State
    const [timerState, setTimerState] = useState<TimerState>({
        minutes: 25,
        seconds: 0,
        isRunning: false,
        isPaused: false,
        sessionsCompleted: 0,
        isBreak: false
    });
    const timerRef = useRef<NodeJS.Timeout | null>(null);
    const audioRef = useRef<HTMLAudioElement | null>(null);

    // Initialize audio
    useEffect(() => {
        if (typeof window !== 'undefined') {
            audioRef.current = new Audio('data:audio/wav;base64,UklGRnoGAABXQVZFZm10IBAAAAABAAEAQB8AAEAfAAABAAgAZGF0YQ==');
        }
    }, []);

    // Load student data
    // studentId is now handled by the hook
    // no separate useEffect needed to set it

    useEffect(() => {
        if (!studentId) return;

        const loadData = async () => {
            setLoading(true);
            try {
                // Load settings for name and API key
                const settings = await getOrCreateSettings(studentId);
                const name = settings?.student_name || 'Student';
                setHackClubKey(settings?.hackclub_key || null);

                // Load subjects
                const subjects = await listSubjects(studentId);

                // Load weaknesses
                const attempts = await listQuestionAttempts(studentId, { limit: 200 });
                const counts = weaknessCountsFromAttempts(attempts || []);
                const topWeaknesses = pickTopWeaknesses(counts, 5);

                setStudentData({
                    name,
                    subjects: subjects || [],
                    weaknesses: topWeaknesses
                });
            } catch (error) {
                console.error('Failed to load student data:', error);
            } finally {
                setLoading(false);
            }
        };

        loadData();
    }, [studentId]);

    // Pomodoro Timer Functions
    const startTimer = useCallback(() => {
        setTimerState(prev => ({ ...prev, isRunning: true, isPaused: false }));
    }, []);

    const pauseTimer = useCallback(() => {
        setTimerState(prev => ({ ...prev, isRunning: false, isPaused: true }));
    }, []);

    const resetTimer = useCallback((isBreak = false) => {
        const minutes = isBreak ? 5 : 25;
        setTimerState(prev => ({
            ...prev,
            minutes,
            seconds: 0,
            isRunning: false,
            isPaused: false,
            isBreak
        }));
    }, []);

    const playNotification = useCallback(() => {
        if (audioRef.current) {
            audioRef.current.play().catch(() => { });
        }
        // Also try browser notification
        if ('Notification' in window && Notification.permission === 'granted') {
            new Notification('Pomodoro Timer', {
                body: timerState.isBreak ? 'Break over! Time to focus.' : 'Session complete! Take a break.',
                icon: '/favicon.ico'
            });
        }
    }, [timerState.isBreak]);

    // Timer tick effect
    useEffect(() => {
        if (timerState.isRunning) {
            timerRef.current = setInterval(() => {
                setTimerState(prev => {
                    if (prev.seconds === 0) {
                        if (prev.minutes === 0) {
                            // Timer complete
                            playNotification();
                            const newSessionCount = prev.isBreak ? prev.sessionsCompleted : prev.sessionsCompleted + 1;
                            const shouldLongBreak = newSessionCount > 0 && newSessionCount % 4 === 0;
                            return {
                                ...prev,
                                minutes: prev.isBreak ? 25 : (shouldLongBreak ? 15 : 5),
                                seconds: 0,
                                isRunning: false,
                                isPaused: false,
                                sessionsCompleted: newSessionCount,
                                isBreak: !prev.isBreak
                            };
                        }
                        return { ...prev, minutes: prev.minutes - 1, seconds: 59 };
                    }
                    return { ...prev, seconds: prev.seconds - 1 };
                });
            }, 1000);
        }

        return () => {
            if (timerRef.current) {
                clearInterval(timerRef.current);
            }
        };
    }, [timerState.isRunning, playNotification]);

    // Request notification permission
    const requestNotificationPermission = useCallback(async () => {
        if ('Notification' in window && Notification.permission === 'default') {
            await Notification.requestPermission();
        }
    }, []);

    // Spaced Repetition Algorithm (SM-2)
    const calculateNextReview = useCallback((
        quality: number, // 0-5 rating of recall quality
        currentInterval: number,
        easeFactor: number
    ): { interval: number; easeFactor: number } => {
        let newInterval: number;
        let newEaseFactor = easeFactor;

        if (quality < 3) {
            // Failed recall - reset to start
            newInterval = 1;
        } else {
            if (currentInterval === 0) {
                newInterval = 1;
            } else if (currentInterval === 1) {
                newInterval = 6;
            } else {
                newInterval = Math.round(currentInterval * easeFactor);
            }
        }

        // Update ease factor
        newEaseFactor = easeFactor + (0.1 - (5 - quality) * (0.08 + (5 - quality) * 0.02));
        if (newEaseFactor < 1.3) newEaseFactor = 1.3;

        return { interval: newInterval, easeFactor: newEaseFactor };
    }, []);

    // Generate AI content for techniques
    const generateAIContent = useCallback(async (
        techniqueType: string
    ): Promise<string> => {
        const { name, subjects, weaknesses } = studentData;

        const subjectStr = subjects.length > 0
            ? subjects.map(s => s.name).join(', ')
            : 'general GCSE subjects';

        const weaknessStr = weaknesses.length > 0
            ? weaknesses.slice(0, 3).map(w => w.label).join(', ')
            : 'various topics';

        const prompts: Record<string, string> = {
            'active-recall': `Generate 3 active recall prompts for a GCSE student named ${name} studying ${subjectStr}. Focus on ${weaknessStr}. Format: numbered list, each max 15 words. Be specific to GCSE content.`,
            'elaboration': `Generate 3 Socratic questions to help ${name} deepen understanding of ${weaknessStr} in ${subjectStr}. Format: numbered list, each max 20 words. Ask "why" and "how" questions.`,
            'interleaving': `Suggest 3 topic combinations for interleaving study for ${name}. Subjects: ${subjectStr}. Find connections between topics. Format: numbered list with brief explanation.`,
            'practice-testing': `Generate 5 quick practice questions for ${name} on ${weaknessStr}. Mix of difficulty. Format: numbered list, each question max 20 words. GCSE level.`
        };

        const prompt = prompts[techniqueType] || prompts['active-recall'];

        try {
            const response = await fetch('/api/hackclub', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    messages: [
                        { role: 'system', content: 'You are a helpful GCSE study coach. Be concise and encouraging.' },
                        { role: 'user', content: prompt }
                    ],
                    apiKey: hackClubKey,
                    model: 'qwen/qwen3-32b',
                    temperature: 0.7
                })
            });

            const data = await response.json();
            if (!response.ok) throw new Error(data.error);
            return data.content;
        } catch (error) {
            console.error('AI generation error:', error);
            // Return fallback content
            return getFallbackContent(techniqueType, weaknessStr);
        }
    }, [studentData, hackClubKey]);

    return {
        studentId,
        studentData,
        loading,
        timerState,
        startTimer,
        pauseTimer,
        resetTimer,
        requestNotificationPermission,
        calculateNextReview,
        generateAIContent
    };
}

function getFallbackContent(techniqueType: string, topics: string): string {
    const fallbacks: Record<string, string> = {
        'active-recall': `1. Without looking at notes, explain the key concepts of ${topics}\n2. Draw a diagram showing how ${topics} connects to related ideas\n3. Write down 5 key terms and their definitions for ${topics}`,
        'elaboration': `1. Why is ${topics} important in the wider context?\n2. How would you explain ${topics} to someone younger?\n3. What real-world examples connect to ${topics}?`,
        'interleaving': `1. Try mixing maths problem-solving with science calculations\n2. Alternate between literature analysis and history source work\n3. Switch between vocabulary revision and writing practice`,
        'practice-testing': `1. Define the key terms for this topic\n2. Explain the main process or concept\n3. Give an example from memory\n4. What are the common mistakes to avoid?\n5. How does this connect to other topics?`
    };
    return fallbacks[techniqueType] || fallbacks['active-recall'];
}

export default useStudyTechniques;
