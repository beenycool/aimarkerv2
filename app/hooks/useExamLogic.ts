import { useCallback, useMemo } from 'react';
import { useExamSessionState } from './useExamSessionState';
import { useExamSessionPersistence } from './useExamSessionPersistence';

const useExamLogic = () => {
    const state = useExamSessionState();
    const persistence = useExamSessionPersistence(state);

    const handleAnswerChange = useCallback((questionId: string, value: any) => {
        state.setUserAnswers(prev => ({ ...prev, [questionId]: value }));
    }, [state.setUserAnswers]);

    const moveToNext = useCallback(() => {
        if (state.currentQIndex < state.activeQuestions.length - 1) {
            const nextIdx = state.currentQIndex + 1;
            state.setCurrentQIndex(nextIdx);
            return { index: nextIdx, pageNumber: state.activeQuestions[nextIdx]?.pageNumber || null };
        }
        return { index: -1, pageNumber: null };
    }, [state.currentQIndex, state.activeQuestions, state.setCurrentQIndex]);

    const skipQuestion = useCallback((questionId: string) => {
        state.setSkippedQuestions(prev => {
            const newSet = new Set(prev);
            newSet.add(questionId);
            return newSet;
        });
        return moveToNext();
    }, [moveToNext, state.setSkippedQuestions]);

    const unskipQuestion = useCallback((questionId: string) => {
        state.setSkippedQuestions(prev => {
            const newSet = new Set(prev);
            newSet.delete(questionId);
            return newSet;
        });
    }, [state.setSkippedQuestions]);

    const setQuestionFeedback = useCallback((questionId: string, feedback: any) => {
        state.setFeedbacks(prev => ({ ...prev, [questionId]: feedback }));
    }, [state.setFeedbacks]);

    const addFollowUpMessage = useCallback((questionId: string, message: any) => {
        state.setFollowUpChats(prev => ({
            ...prev,
            [questionId]: [...(prev[questionId] || []), message]
        }));
    }, [state.setFollowUpChats]);

    const updateQuoteDraft = useCallback((questionId: string, text: string) => {
        state.setQuoteDrafts(prev => ({ ...prev, [questionId]: text }));
    }, [state.setQuoteDrafts]);

    const insertQuoteIntoAnswer = useCallback((questionId: string) => {
        const quote = (state.quoteDrafts[questionId] || '').trim();
        if (!quote) return;
        const existing = state.userAnswers[questionId] || '';
        const newAnswer = existing ? `${existing}\n\n"${quote}"` : `"${quote}"`;
        state.setUserAnswers(prev => ({ ...prev, [questionId]: newAnswer }));
        state.setQuoteDrafts(prev => ({ ...prev, [questionId]: "" }));
    }, [state.quoteDrafts, state.userAnswers, state.setUserAnswers, state.setQuoteDrafts]);

    const clearFeedbackForQuestion = useCallback((questionId: string) => {
        state.setFeedbacks(prev => {
            if (!prev?.[questionId]) return prev;
            const next = { ...prev };
            delete next[questionId];
            return next;
        });
        state.setFollowUpChats(prev => {
            if (!prev?.[questionId]) return prev;
            const next = { ...prev };
            delete next[questionId];
            return next;
        });
        state.setQuoteDrafts(prev => {
            if (!prev?.[questionId]) return prev;
            const next = { ...prev };
            delete next[questionId];
            return next;
        });
    }, [state.setFeedbacks, state.setFollowUpChats, state.setQuoteDrafts]);

    const jumpToQuestion = useCallback((index: number) => {
        state.setCurrentQIndex(index);
        return state.activeQuestions[index]?.pageNumber || null;
    }, [state.activeQuestions, state.setCurrentQIndex]);

    const currentQuestion = state.activeQuestions[state.currentQIndex] || null;
    const currentAnswer = currentQuestion ? state.userAnswers[currentQuestion.id] : null;
    const hasCurrentFeedback = currentQuestion ? !!state.feedbacks[currentQuestion.id] : false;

const getSummaryStats = useCallback(() => {
	// ⚡ Bolt: Replaced multiple O(N) array aggregations and object value extractions with a single-pass loop.
	// Reduces overhead by avoiding intermediate array allocations.
        let totalScore = 0;
        let totalPossible = 0;
        const weaknessCounts: Record<string, number> = {};

for (const question of state.activeQuestions) {
		if (!question) continue;
		totalPossible += (question.marks || 0);

		const fb = state.feedbacks[question.id];
		if (fb) {
			totalScore += (fb.score || 0);
			if (fb.primaryFlaw) {
				weaknessCounts[fb.primaryFlaw] = (weaknessCounts[fb.primaryFlaw] || 0) + 1;
			}
		}
	}
        const percentage = totalPossible > 0 ? Math.round((totalScore / totalPossible) * 100) : 0;

        let grade = 'U';
        if (percentage >= 90) grade = '9';
        else if (percentage >= 80) grade = '8';
        else if (percentage >= 70) grade = '7';
        else if (percentage >= 50) grade = '5';
        else if (percentage >= 40) grade = '4';

        return { totalScore, totalPossible, percentage, grade, weaknessCounts };
    }, [state.feedbacks, state.activeQuestions]);

    return {
        // State
        activeQuestions: state.activeQuestions,
        userAnswers: state.userAnswers,
        feedbacks: state.feedbacks,
        currentQIndex: state.currentQIndex,
        skippedQuestions: state.skippedQuestions,
        followUpChats: state.followUpChats,
        quoteDrafts: state.quoteDrafts,
        insertContent: state.insertContent,
        parsedMarkScheme: state.parsedMarkScheme,
        paperFilePaths: state.paperFilePaths,
        paperId: state.paperId,

        // Computed
        currentQuestion,
        currentAnswer,
        hasCurrentFeedback,
        summaryStats,

        // Setters
        setActiveQuestions: state.setActiveQuestions,
        setUserAnswers: state.setUserAnswers,
        setFeedbacks: state.setFeedbacks,
        setCurrentQIndex: state.setCurrentQIndex,
        setSkippedQuestions: state.setSkippedQuestions,
        setFollowUpChats: state.setFollowUpChats,
        setInsertContent: state.setInsertContent,
        setParsedMarkScheme: state.setParsedMarkScheme,
        setPaperFilePaths: state.setPaperFilePaths,
        setPaperId: state.setPaperId,

        // Actions
        handleAnswerChange,
        moveToNext,
        skipQuestion,
        unskipQuestion,
        setQuestionFeedback,
        addFollowUpMessage,
        updateQuoteDraft,
        insertQuoteIntoAnswer,
clearFeedbackForQuestion,
  jumpToQuestion,

  // Session management
        saveSession: persistence.saveSession,
        restoreSession: persistence.restoreSession,
        clearSession: persistence.clearSession,
        checkSessionForPaper: persistence.checkSessionForPaper,
        restoreSessionForPaper: persistence.restoreSessionForPaper,
    };
};

export default useExamLogic;
