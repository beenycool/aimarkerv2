import { useState, useCallback, useRef } from 'react';
import {
    PersistedExamState,
    ExamQuestion,
    PaperFilePaths,
    serializeSession,
} from '@/app/types/exam-session';

export function useExamSessionState() {
    const [activeQuestions, setActiveQuestions] = useState<ExamQuestion[]>([]);
    const [userAnswers, setUserAnswers] = useState<Record<string, any>>({});
    const [feedbacks, setFeedbacks] = useState<Record<string, any>>({});
    const [currentQIndex, setCurrentQIndex] = useState(0);
    const [skippedQuestions, setSkippedQuestions] = useState<Set<string>>(new Set());
    const [followUpChats, setFollowUpChats] = useState<Record<string, any[]>>({});
    const [quoteDrafts, setQuoteDrafts] = useState<Record<string, string>>({});
    const [insertContent, setInsertContent] = useState<any | null>(null);
    const [parsedMarkScheme, setParsedMarkScheme] = useState<Record<string, any>>({});
    const [paperFilePaths, setPaperFilePaths] = useState<PaperFilePaths | null>(null);
    const [paperId, setPaperId] = useState<string | null>(null);
    const restoredSessionRef = useRef(false);

    const getStateSnapshot = useCallback(() => ({
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
    }), [activeQuestions, userAnswers, feedbacks, insertContent, currentQIndex, skippedQuestions, followUpChats, paperFilePaths, paperId, parsedMarkScheme, quoteDrafts]);

    const getSerializedSnapshot = useCallback(() => {
        return serializeSession(getStateSnapshot());
    }, [getStateSnapshot]);

    const applySessionData = useCallback((parsed: PersistedExamState) => {
        setActiveQuestions(parsed.activeQuestions);
        setUserAnswers(parsed.userAnswers || {});
        setFeedbacks(parsed.feedbacks || {});
        setInsertContent(parsed.insertContent);
        setCurrentQIndex(parsed.currentQIndex || 0);
        if (parsed.skippedQuestions) setSkippedQuestions(new Set(parsed.skippedQuestions));
        if (parsed.followUpChats) setFollowUpChats(parsed.followUpChats);
        if (parsed.paperFilePaths) setPaperFilePaths(parsed.paperFilePaths);
        if (parsed.paperId) setPaperId(parsed.paperId);
        if (parsed.parsedMarkScheme) setParsedMarkScheme(parsed.parsedMarkScheme);
        if (parsed.quoteDrafts) setQuoteDrafts(parsed.quoteDrafts);
        restoredSessionRef.current = true;
    }, []);

    return {
        // State values
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

        // Setters
        setActiveQuestions,
        setUserAnswers,
        setFeedbacks,
        setCurrentQIndex,
        setSkippedQuestions,
        setFollowUpChats,
        setQuoteDrafts,
        setInsertContent,
        setParsedMarkScheme,
        setPaperFilePaths,
        setPaperId,

        // Snapshot / restore helpers
        restoredSessionRef,
        getSerializedSnapshot,
        applySessionData,
    };
}

export type ExamSessionState = ReturnType<typeof useExamSessionState>;
