'use client';

import { useState, useEffect, useCallback, useRef } from 'react';

/**
 * Custom hook to manage exam state and logic
 * Separates heavy state management from the view layer
 */
export const useExamLogic = () => {
    const [activeQuestions, setActiveQuestions] = useState([]);
    const [userAnswers, setUserAnswers] = useState({});
    const [feedbacks, setFeedbacks] = useState({});
    const [currentQIndex, setCurrentQIndex] = useState(0);
    const [skippedQuestions, setSkippedQuestions] = useState(new Set());
    const [followUpChats, setFollowUpChats] = useState({});
    const [quoteDrafts, setQuoteDrafts] = useState({});
    const [insertContent, setInsertContent] = useState(null);
    const [parsedMarkScheme, setParsedMarkScheme] = useState({});
    const [paperFilePaths, setPaperFilePaths] = useState(null);
    const [paperId, setPaperId] = useState(null);
    const restoredSessionRef = useRef(false);

    // Persist to LocalStorage
    const saveSession = useCallback((phase) => {
        if (typeof window === 'undefined') return;
        if (phase === 'exam' && activeQuestions.length > 0) {
            try {
                window.localStorage.setItem('gcse_marker_state', JSON.stringify({
                    activeQuestions,
                    userAnswers,
                    feedbacks,
                    insertContent,
                    currentQIndex,
                    skippedQuestions: Array.from(skippedQuestions),
                    followUpChats,
                    paperFilePaths,
                    paperId,
                    timestamp: Date.now()
                }));
            } catch (err) {
                console.error('Failed to persist session', err);
            }
        }
    }, [activeQuestions, userAnswers, feedbacks, insertContent, currentQIndex, skippedQuestions, followUpChats, paperFilePaths, paperId]);

    // Helper function to apply parsed session data to state
    const applySessionData = useCallback((parsed) => {
        setActiveQuestions(parsed.activeQuestions);
        setUserAnswers(parsed.userAnswers || {});
        setFeedbacks(parsed.feedbacks || {});
        setInsertContent(parsed.insertContent);
        setCurrentQIndex(parsed.currentQIndex || 0);
        if (parsed.skippedQuestions) setSkippedQuestions(new Set(parsed.skippedQuestions));
        if (parsed.followUpChats) setFollowUpChats(parsed.followUpChats);
        if (parsed.paperFilePaths) setPaperFilePaths(parsed.paperFilePaths);
        if (parsed.paperId) setPaperId(parsed.paperId);
        restoredSessionRef.current = true;
    }, []);

    // Restore session from LocalStorage
    const restoreSession = useCallback(() => {
        if (typeof window === 'undefined' || restoredSessionRef.current) return null;

        const saved = window.localStorage.getItem('gcse_marker_state');
        if (!saved) return null;

        try {
            const parsed = JSON.parse(saved);
            if (parsed.activeQuestions && parsed.activeQuestions.length > 0) {
                applySessionData(parsed);
                return parsed;
            }
        } catch (err) {
            console.error('Failed to restore saved session', err);
        }
        return null;
    }, [applySessionData]);

    // Clear saved session
    const clearSession = useCallback(() => {
        if (typeof window === 'undefined') return;
        window.localStorage.removeItem('gcse_marker_state');
    }, []);

    // Check if a session exists for a specific paper
    const checkSessionForPaper = useCallback((paperIdentifier) => {
        if (typeof window === 'undefined') return false;
        const saved = window.localStorage.getItem('gcse_marker_state');
        if (!saved) return false;
        
        try {
            const parsed = JSON.parse(saved);
            return parsed.paperId === paperIdentifier && parsed.activeQuestions && parsed.activeQuestions.length > 0;
        } catch (err) {
            return false;
        }
    }, []);

    // Restore session for a specific paper
    const restoreSessionForPaper = useCallback((paperIdentifier) => {
        if (typeof window === 'undefined') return null;
        const saved = window.localStorage.getItem('gcse_marker_state');
        if (!saved) return null;

        try {
            const parsed = JSON.parse(saved);
            if (parsed.paperId === paperIdentifier && parsed.activeQuestions && parsed.activeQuestions.length > 0) {
                applySessionData(parsed);
                return parsed;
            }
        } catch (err) {
            console.error('Failed to restore session for paper', err);
        }
        return null;
    }, [applySessionData]);

    // Memoized answer change handler - prevents re-creation on every render
    const handleAnswerChange = useCallback((questionId, value) => {
        setUserAnswers(prev => ({ ...prev, [questionId]: value }));
    }, []);

    // Move to next question
    const moveToNext = useCallback(() => {
        if (currentQIndex < activeQuestions.length - 1) {
            const nextIdx = currentQIndex + 1;
            setCurrentQIndex(nextIdx);
            return {
                index: nextIdx,
                pageNumber: activeQuestions[nextIdx]?.pageNumber || null
            };
        }
        return { index: -1, pageNumber: null };
    }, [currentQIndex, activeQuestions]);

    // Skip current question
    const skipQuestion = useCallback((questionId) => {
        setSkippedQuestions(prev => {
            const newSet = new Set(prev);
            newSet.add(questionId);
            return newSet;
        });
        return moveToNext();
    }, [moveToNext]);

    // Un-skip a question (when user submits an answer for a skipped question)
    const unskipQuestion = useCallback((questionId) => {
        setSkippedQuestions(prev => {
            const newSet = new Set(prev);
            newSet.delete(questionId);
            return newSet;
        });
    }, []);

    // Add feedback for a question
    const setQuestionFeedback = useCallback((questionId, feedback) => {
        setFeedbacks(prev => ({ ...prev, [questionId]: feedback }));
    }, []);

    // Add follow-up chat message
    const addFollowUpMessage = useCallback((questionId, message) => {
        setFollowUpChats(prev => ({
            ...prev,
            [questionId]: [...(prev[questionId] || []), message]
        }));
    }, []);

    // Update quote draft
    const updateQuoteDraft = useCallback((questionId, text) => {
        setQuoteDrafts(prev => ({ ...prev, [questionId]: text }));
    }, []);

    // Insert quote into answer
    const insertQuoteIntoAnswer = useCallback((questionId) => {
        const quote = (quoteDrafts[questionId] || '').trim();
        if (!quote) return;

        const existing = userAnswers[questionId] || '';
        const newAnswer = existing ? `${existing}\n\n"${quote}"` : `"${quote}"`;
        setUserAnswers(prev => ({ ...prev, [questionId]: newAnswer }));
        setQuoteDrafts(prev => ({ ...prev, [questionId]: "" }));
    }, [quoteDrafts, userAnswers]);

    // Jump to specific question
    const jumpToQuestion = useCallback((index) => {
        setCurrentQIndex(index);
        return activeQuestions[index]?.pageNumber || null;
    }, [activeQuestions]);

    // Get current question
    const currentQuestion = activeQuestions[currentQIndex] || null;

    // Get current answer
    const currentAnswer = currentQuestion ? userAnswers[currentQuestion.id] : null;

    // Check if question has feedback
    const hasCurrentFeedback = currentQuestion ? !!feedbacks[currentQuestion.id] : false;

    // Calculate summary stats
    const getSummaryStats = useCallback(() => {
        const totalScore = Object.values(feedbacks).reduce((acc, curr) => acc + (curr?.score || 0), 0);
        const totalPossible = activeQuestions.reduce((acc, curr) => acc + (curr?.marks || 0), 0);
        const percentage = totalPossible > 0 ? Math.round((totalScore / totalPossible) * 100) : 0;

        let grade = 'U';
        if (percentage >= 90) grade = '9';
        else if (percentage >= 80) grade = '8';
        else if (percentage >= 70) grade = '7';
        else if (percentage >= 50) grade = '5';
        else if (percentage >= 40) grade = '4';

        const weaknessCounts = Object.values(feedbacks).reduce((acc, fb) => {
            if (fb?.primaryFlaw) acc[fb.primaryFlaw] = (acc[fb.primaryFlaw] || 0) + 1;
            return acc;
        }, {});

        return { totalScore, totalPossible, percentage, grade, weaknessCounts };
    }, [feedbacks, activeQuestions]);

    return {
        // State
        activeQuestions,
        userAnswers,
        feedbacks,
        currentQIndex,
        skippedQuestions,
        followUpChats,
        quoteDrafts,
        insertContent,
        parsedMarkScheme,
        paperFilePaths,
        paperId,

        // Computed
        currentQuestion,
        currentAnswer,
        hasCurrentFeedback,

        // Setters
        setActiveQuestions,
        setUserAnswers,
        setFeedbacks,
        setCurrentQIndex,
        setSkippedQuestions,
        setFollowUpChats,
        setInsertContent,
        setParsedMarkScheme,
        setPaperFilePaths,
        setPaperId,

        // Actions
        handleAnswerChange,
        moveToNext,
        skipQuestion,
        unskipQuestion,
        setQuestionFeedback,
        addFollowUpMessage,
        updateQuoteDraft,
        insertQuoteIntoAnswer,
        jumpToQuestion,
        getSummaryStats,

        // Session management
        saveSession,
        restoreSession,
        clearSession,
        checkSessionForPaper,
        restoreSessionForPaper
    };
};

export default useExamLogic;