// @ts-nocheck
'use client';

import React, { useState, useEffect, useCallback } from 'react';
import Link from 'next/link';
import {
    CheckCircle, RefreshCw, BarChart2, Lightbulb, GraduationCap, Sparkles, Save, Trash2, SkipForward, Eye, Key, Brain, BookOpen, ImageIcon, ArrowLeft, Clock, Zap, AlertTriangle
} from 'lucide-react';

// Import Shadcn UI components
import { Button } from '@/app/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from '@/app/components/ui/card';
import { Badge } from '@/app/components/ui/badge';
import { Progress } from '@/app/components/ui/progress';
import { Input } from '@/app/components/ui/input';
import { Label } from '@/app/components/ui/label';

// Import modular components
import { PDFViewer, AdaptiveInput, MarkdownText, FileUploadZone, FeedbackBlock, PaperLibrary } from '../../components';

// Import custom hooks and services
import useExamLogic from '../../hooks/useExamLogic';
import { AIService, evaluateAnswerLocally, buildHintFromScheme, buildExplanationFromFeedback, buildFollowUpReply, buildStudyPlan, checkRegex, stringifyAnswer } from '../../services/AIService';
import { PaperStorage } from '../../services/PaperStorage';
import { useAuth, useStudentId } from '../../components/AuthProvider';
import { ensureSubjectForStudent, logQuestionAttemptSafe } from '../../services/studentOS';

export default function GCSEMarkerApp() {
    // Phase management
    const [phase, setPhase] = useState('upload');
    const [files, setFiles] = useState({ paper: null, scheme: null, insert: null });
    const [error, setError] = useState(null);
    const [parsingStatus, setParsingStatus] = useState('');

    // Student OS identity + attempt logging
    const { user, signInAnonymously } = useAuth();
    const studentId = useStudentId();
    const [paperMeta, setPaperMeta] = useState(null);
    const [subjectId, setSubjectId] = useState(null);

    // PDF viewer state
    const [activePdfTab, setActivePdfTab] = useState('paper');
    const [pdfPage, setPdfPage] = useState(1);
    const [pdfScale, setPdfScale] = useState(1.5);

    // API keys
    const [customApiKey, setCustomApiKey] = useState("");
    const [hackClubApiKey, setHackClubApiKey] = useState("");
    const [hasSavedSession, setHasSavedSession] = useState(false);
    const [hasServerKey, setHasServerKey] = useState(true);
    const [hasHackClubServerKey, setHasHackClubServerKey] = useState(true);
    const canUseHackClub = Boolean(hackClubApiKey || hasHackClubServerKey);

    // Loading states
    const [loadingFeedback, setLoadingFeedback] = useState(false);
    const [hintData, setHintData] = useState({ loading: false, text: null });
    const [explanationData, setExplanationData] = useState({ loading: false, text: null });
    const [studyPlan, setStudyPlan] = useState({ loading: false, content: null });
    const [sendingFollowUp, setSendingFollowUp] = useState(false);
    const [timeElapsed, setTimeElapsed] = useState(0);
    const [isSaving, setIsSaving] = useState(false);

    // Use custom exam logic hook
    const exam = useExamLogic();

    // Load API keys from localStorage, check server keys
    useEffect(() => {
        if (typeof window === 'undefined') return;
        // studentId handled by hook
        const storedKey = window.localStorage.getItem('openrouter_api_key');
        if (storedKey) setCustomApiKey(storedKey);
        const storedHackKey = window.localStorage.getItem('hackclub_api_key');
        if (storedHackKey) setHackClubApiKey(storedHackKey);
        const savedData = window.localStorage.getItem('gcse_marker_state');
        if (savedData) setHasSavedSession(true);
        AIService.checkServerKey().then(hasKey => setHasServerKey(hasKey));
        AIService.checkHackClubServerKey().then(hasKey => setHasHackClubServerKey(hasKey));
    }, []);

    // Auto-restore session on mount
    useEffect(() => {
        const restored = exam.restoreSession();
        if (restored) {
            setHasSavedSession(true);
            setPhase('exam');

            // Restore files if URLs are available
            if (restored.paperFilePaths && (!files.paper || files.paper !== null)) {
                setParsingStatus("Restoring paper from session...");
                const fetchFiles = async () => {
                    try {
                        const load = async (url, name) => {
                            if (!url) return null;
                            const res = await fetch(url);
                            const blob = await res.blob();
                            return new File([blob], name || "paper.pdf", { type: 'application/pdf' });
                        };

                        const [p, s, i] = await Promise.all([
                            load(restored.paperFilePaths.paper, "paper.pdf"),
                            restored.paperFilePaths.scheme ? load(restored.paperFilePaths.scheme, "scheme.pdf") : null,
                            restored.paperFilePaths.insert ? load(restored.paperFilePaths.insert, "insert.pdf") : null
                        ]);

                        // Attach metadata to restored paper if available from restore
                        if (p && restored.activeQuestions) {
                            p.parsedQuestions = restored.activeQuestions;
                        }

                        setFiles({ paper: p, scheme: s, insert: i });
                    } catch (e) {
                        console.error("Failed to restore paper files:", e);
                    } finally {
                        setParsingStatus("");
                    }
                };
                fetchFiles();
            }
        }
    }, [exam.restoreSession]);

    // Persist session on changes
    useEffect(() => {
        exam.saveSession(phase);
        if (phase === 'exam' && exam.activeQuestions.length > 0) setHasSavedSession(true);
    }, [exam.activeQuestions, exam.userAnswers, exam.feedbacks, exam.currentQIndex, phase, exam.saveSession]);

    // Timer
    useEffect(() => {
        let timer;
        if (phase === 'exam') timer = setInterval(() => setTimeElapsed(p => p + 1), 1000);
        return () => clearInterval(timer);
    }, [phase]);

    // Save API keys
    const updateApiKey = (k) => { setCustomApiKey(k); if (typeof window !== 'undefined') window.localStorage.setItem('openrouter_api_key', k); };
    const updateHackClubKey = (k) => { setHackClubApiKey(k); if (typeof window !== 'undefined') window.localStorage.setItem('hackclub_api_key', k); };

    const clearSaveData = () => {
        exam.clearSession();
        setHasSavedSession(false);
        window.location.reload();
    };

    const resumeSavedSession = () => {
        const restored = exam.restoreSession();
        if (restored) { setHasSavedSession(true); setPhase('exam'); }
    };

    const jumpToPdfPage = useCallback((pageNumber, type = 'paper') => {
        setActivePdfTab(type);
        setPdfPage(pageNumber);
    }, []);

    const advanceToQuestionPage = useCallback((index) => {
        if (index < exam.activeQuestions.length && exam.activeQuestions[index].pageNumber) {
            setActivePdfTab('paper');
            setPdfPage(exam.activeQuestions[index].pageNumber);
        }
    }, [exam.activeQuestions]);

    const onAnswerChange = useCallback((val) => {
        if (exam.currentQuestion) {
            exam.handleAnswerChange(exam.currentQuestion.id, val);
        }
    }, [exam.currentQuestion, exam.handleAnswerChange]);

    const handleSavePaper = async () => {
        if (!files.paper) return;
        setIsSaving(true);
        try {
            // Ensure auth and capture the result
            let authResult = null;
            if (!user) {
                authResult = await signInAnonymously();
                if (authResult.error) throw new Error("Could not sign in anonymously: " + authResult.error.message);
            }

            // Determine effectiveStudentId in priority order:
            // 1. From sign-in result if available
            // 2. From current auth state via supabase.auth.getUser()
            // 3. From hook value as fallback
            let effectiveStudentId = studentId;

            // Try sign-in result first
            if (authResult?.data?.user?.id) {
                effectiveStudentId = authResult.data.user.id;
            } else if (!user) {
                // If we attempted sign-in but didn't get user data, or user was null
                const { data } = await import('../../services/supabaseClient').then(m => m.supabase.auth.getUser());
                if (data?.user?.id) effectiveStudentId = data.user.id;
            }

            await PaperStorage.uploadPaper(files.paper, files.scheme, files.insert, {
                name: files.paper.name.replace('.pdf', ''),
                year: new Date().getFullYear()
            }, effectiveStudentId);
            alert("Paper saved to library!");
        } catch (e) {
            console.error(e);
            alert("Failed to save paper: " + e.message);
        } finally {
            setIsSaving(false);
        }
    };

    const handleSelectPaper = async (paperData) => {
        setParsingStatus("Loading paper from library...");
        try {
            const loadFile = async (data) => {
                if (!data) return null;
                const res = await fetch(data.url);
                const blob = await res.blob();
                const file = new File([blob], data.name, { type: 'application/pdf' });
                file.fromLibrary = true;
                if (data.parsedQuestions) file.parsedQuestions = data.parsedQuestions;
                if (data.parsedMarkScheme) file.parsedMarkScheme = data.parsedMarkScheme;
                if (data.metadata) file.parsedMetadata = data.metadata;
                return file;
            };
            const [p, s, i] = await Promise.all([
                loadFile(paperData.paper),
                loadFile(paperData.scheme),
                loadFile(paperData.insert)
            ]);
            setFiles({ paper: p, scheme: s, insert: i });

            // Save paths for session restoration
            exam.setPaperFilePaths({
                paper: paperData.paper.url,
                scheme: paperData.scheme?.url,
                insert: paperData.insert?.url
            });
        } catch (e) {
            console.error(e);
            alert("Failed to load paper.");
        } finally {
            setParsingStatus("");
        }
    };

    const handleStartParsing = async () => {
        if (!files.paper) return;
        setPhase('parsing');
        setError(null);
        exam.setActiveQuestions([]);

        try {
            setParsingStatus('AI analyzing exam paper...');
            let questions = [];
            let metadata = {};

            // 1. Check for duplicate upload (if not explicitly from library) to save API calls
            if (!files.paper.fromLibrary) {
                try {
                    setParsingStatus('Checking for existing analysis...');
                    // Ensure auth for check
                    if (!user) await signInAnonymously();

                    const duplicate = await PaperStorage.checkForDuplicate(files.paper, studentId);
                    if (duplicate && duplicate.parsed_questions) {
                        console.log("Found duplicate paper with cached data, reusing:", duplicate.id);
                        files.paper.fromLibrary = true;
                        files.paper.parsedQuestions = duplicate.parsed_questions;
                        files.paper.parsedMarkScheme = duplicate.parsed_mark_scheme;
                        files.paper.parsedMetadata = {
                            subject: duplicate.subject,
                            board: duplicate.board,
                            year: duplicate.year,
                            season: duplicate.season,
                            section: duplicate.section,
                            ...duplicate // keep other fields
                        };
                    }
                } catch (dupErr) {
                    console.warn("Duplicate check failed:", dupErr);
                }
            }

            // 2. Check for cached questions (from library OR duplicate check)
            if (files.paper.fromLibrary && files.paper.parsedQuestions) {
                console.log("Using cached questions");
                setParsingStatus('Restoring previous analysis...');
                questions = files.paper.parsedQuestions;
                metadata = files.paper.parsedMetadata || {};
            } else {
                setParsingStatus('AI analyzing exam paper (API Call)...');
                const res = await AIService.extractQuestions(files.paper, files.insert, customApiKey, null, studentId);
                questions = res.questions;
                metadata = res.metadata;
            }

            setPaperMeta(metadata || null);

            const sid = studentId;
            if (sid && metadata?.subject) {
                try {
                    const subj = await ensureSubjectForStudent(sid, { name: metadata.subject, exam_board: metadata.board });
                    if (subj?.id) setSubjectId(subj.id);
                } catch (e) {
                    console.warn('ensureSubjectForStudent failed:', e);
                }
            }
            if (questions.length === 0) throw new Error('No questions were extracted.');

            if (files.insert) {
                setParsingStatus('Processing source material...');
                try {
                    // Logic could be added here to cache insert content too if needed usually less heavy
                    const insertContent = await AIService.extractInsertContent(files.insert, customApiKey, null, studentId);
                    exam.setInsertContent(insertContent);
                } catch (e) { console.error('Insert extraction failed:', e); }
            }

            let markScheme = {};
            if (files.paper.fromLibrary && files.paper.parsedMarkScheme) {
                console.log("Using cached mark scheme from library");
                markScheme = files.paper.parsedMarkScheme;
                exam.setParsedMarkScheme(markScheme);
            } else if (files.scheme) {
                setParsingStatus('Parsing mark scheme...');
                try {
                    markScheme = await AIService.parseMarkScheme(files.scheme, customApiKey, null, studentId);
                    exam.setParsedMarkScheme(markScheme);
                } catch (e) { console.error('Mark scheme parsing failed:', e); }
            }

            setParsingStatus('Loading questions...');
            for (let i = 0; i < questions.length; i++) {
                await new Promise(r => setTimeout(r, 50));
                exam.setActiveQuestions(prev => [...prev, questions[i]]);
            }

            setParsingStatus('Ready!');

            if (!files.paper.fromLibrary) {
                setParsingStatus('Saving to cloud library...');
                try {
                    // Ensure auth for auto-save and capture the result
                    let authResult = null;
                    if (!user) {
                        authResult = await signInAnonymously();
                    }

                    // Determine effectiveStudentId in priority order:
                    // 1. From sign-in result if available
                    // 2. From current auth state via supabase.auth.getUser()
                    // 3. From hook value as fallback
                    let effectiveStudentId = studentId;

                    // Try sign-in result first
                    if (authResult?.data?.user?.id) {
                        effectiveStudentId = authResult.data.user.id;
                    } else if (!user) {
                        // If we attempted sign-in but didn't get user data, or user was null
                        const { data } = await import('../../services/supabaseClient').then(m => m.supabase.auth.getUser());
                        if (data?.user?.id) effectiveStudentId = data.user.id;
                    }

                    const savedRecord = await PaperStorage.uploadPaper(files.paper, files.scheme, files.insert, {
                        name: files.paper.name.replace(/\.pdf$/i, ''),
                        ...metadata,
                        parsed_questions: questions,
                        parsed_mark_scheme: markScheme
                    }, effectiveStudentId);

                    // Save file paths (public URLs) for session persistence
                    if (savedRecord) {
                        const getUrl = (path) => path ? PaperStorage.getPublicUrl(path) : null;
                        exam.setPaperFilePaths({
                            paper: getUrl(savedRecord.pdf_path),
                            scheme: getUrl(savedRecord.scheme_path),
                            insert: getUrl(savedRecord.insert_path)
                        });
                    }
                } catch (storageErr) {
                    console.error("Failed to auto-save paper:", storageErr);
                }
            }

            await new Promise(r => setTimeout(r, 300));
            setPhase('exam');
            if (questions[0]?.pageNumber) setPdfPage(questions[0].pageNumber);
        } catch (err) {
            setError(err.message);
            setPhase('upload');
        }
    };

    const handleSubmitAnswer = async () => {
        const q = exam.currentQuestion;
        const answer = exam.userAnswers[q.id];

        let hasContent = false;
        if (q.type === 'graph_drawing') hasContent = answer && (answer.points?.length > 0 || answer.lines?.length > 0);
        else hasContent = Array.isArray(answer) ? answer.flat().some(cell => cell && String(cell).trim() !== '') : (answer !== undefined && answer !== null && String(answer).trim() !== '');
        if (!hasContent) return;

        if (exam.skippedQuestions.has(q.id)) exam.unskipQuestion(q.id);

        if (q.markingRegex && (typeof answer === 'string' || typeof answer === 'number')) {
            if (checkRegex(q.markingRegex, String(answer).trim())) {
                const autoFeedback = { score: q.marks, totalMarks: q.marks, text: "Correct! (Auto-verified)", rewrite: `**${answer}**` };
                exam.setQuestionFeedback(q.id, autoFeedback);
                const sid = studentId;
                if (sid && subjectId) {
                    logQuestionAttemptSafe({
                        student_id: sid,
                        subject_id: subjectId,
                        question_id: String(q.id),
                        question_text: q.question,
                        answer_text: stringifyAnswer(answer),
                        marks_awarded: q.marks,
                        marks_total: q.marks,
                        primary_flaw: null,
                        feedback_md: autoFeedback.text,
                        model_answer_md: autoFeedback.rewrite,
                        source: 'auto_regex',
                    });
                }
                return;
            }
        }

        setLoadingFeedback(true);
        setExplanationData({ loading: false, text: null });

        try {
            const scheme = exam.parsedMarkScheme[q.id];
            const keyToUse = hackClubApiKey || null;
            if (!canUseHackClub) throw new Error("Hack Club API key missing for marking.");

            const feedback = await AIService.markQuestion(q, answer, scheme, keyToUse, customApiKey, null, studentId, paperMeta?.level);
            exam.setQuestionFeedback(q.id, feedback);

            const sid = studentId;
            if (sid && subjectId) {
                logQuestionAttemptSafe({
                    student_id: sid,
                    subject_id: subjectId,
                    question_id: String(q.id),
                    question_text: q.question,
                    answer_text: stringifyAnswer(answer),
                    marks_awarded: Number(feedback?.score ?? 0),
                    marks_total: Number(q.marks ?? feedback?.totalMarks ?? 0),
                    primary_flaw: feedback?.primaryFlaw || null,
                    feedback_md: feedback?.text || null,
                    model_answer_md: feedback?.rewrite || null,
                    source: 'ai',
                });
            }
        } catch (err) {
            const scheme = exam.parsedMarkScheme[q.id];
            const fallback = evaluateAnswerLocally(q, answer, scheme);
            const message = err?.message?.includes("Hack Club") ? "Add a Hack Club API key for marking. Local estimate:" : "Marking failed. Local estimate:";
            exam.setQuestionFeedback(q.id, { score: Math.min(fallback.score || 0, q.marks), totalMarks: q.marks, text: `${message} ${fallback.text}`, rewrite: fallback.rewrite });

            const sid = studentId;
            if (sid && subjectId) {
                logQuestionAttemptSafe({
                    student_id: sid,
                    subject_id: subjectId,
                    question_id: String(q.id),
                    question_text: q.question,
                    answer_text: stringifyAnswer(answer),
                    marks_awarded: Math.min(Number(fallback?.score ?? 0), Number(q.marks ?? 0)),
                    marks_total: Number(q.marks ?? 0),
                    primary_flaw: null,
                    feedback_md: `${message} ${fallback.text}`,
                    model_answer_md: fallback.rewrite || null,
                    source: 'fallback',
                });
            }
        }
        setLoadingFeedback(false);
    };

    const handleSkip = () => {
        const result = exam.skipQuestion(exam.currentQuestion.id);
        if (result.index !== -1) advanceToQuestionPage(result.index);
        else setPhase('summary');
    };

    const handleNext = () => {
        setHintData({ loading: false, text: null });
        setExplanationData({ loading: false, text: null });
        const result = exam.moveToNext();
        if (result.index !== -1) advanceToQuestionPage(result.index);
        else setPhase('summary');
    };

    const handleGetHint = async () => {
        const q = exam.currentQuestion;
        setHintData({ loading: true, text: null });
        const scheme = exam.parsedMarkScheme[q.id];
        const keyToUse = hackClubApiKey || null;

        if (!canUseHackClub) {
            setHintData({ loading: false, text: buildHintFromScheme(q, scheme) });
            return;
        }
        try {
            const response = await AIService.getHint(q, scheme, keyToUse, studentId);
            setHintData({ loading: false, text: response });
        } catch (e) {
            setHintData({ loading: false, text: buildHintFromScheme(q, scheme) });
        }
    };

    const handleExplainFeedback = async () => {
        const q = exam.currentQuestion;
        const answer = exam.userAnswers[q.id];
        const feedback = exam.feedbacks[q.id];
        setExplanationData({ loading: true, text: null });
        const scheme = exam.parsedMarkScheme[q.id];
        const keyToUse = hackClubApiKey || null;

        if (!canUseHackClub) {
            setExplanationData({ loading: false, text: buildExplanationFromFeedback(q, answer, feedback, scheme) });
            return;
        }
        try {
            const response = await AIService.explainFeedback(q, answer, feedback, scheme, keyToUse, studentId);
            setExplanationData({ loading: false, text: response });
        } catch (e) {
            setExplanationData({ loading: false, text: buildExplanationFromFeedback(q, answer, feedback, scheme) });
        }
    };

    const handleFollowUp = async (userText) => {
        const q = exam.currentQuestion;
        const currentChat = exam.followUpChats[q.id] || [];
        exam.addFollowUpMessage(q.id, { role: 'user', text: userText });
        setSendingFollowUp(true);

        const feedback = exam.feedbacks[q.id] || {};
        const keyToUse = hackClubApiKey || null;

        if (!canUseHackClub) {
            const response = buildFollowUpReply(userText, q, feedback);
            exam.addFollowUpMessage(q.id, { role: 'ai', text: response });
            setSendingFollowUp(false);
            return;
        }
        try {
            const newChat = [...currentChat, { role: 'user', text: userText }];
            const response = await AIService.followUp(q, exam.userAnswers[q.id], feedback, newChat, keyToUse, studentId);
            exam.addFollowUpMessage(q.id, { role: 'ai', text: response });
        } catch (e) {
            exam.addFollowUpMessage(q.id, { role: 'ai', text: buildFollowUpReply(userText, q, feedback) });
        }
        setSendingFollowUp(false);
    };

    const handleGenerateStudyPlan = async (percentage) => {
        setStudyPlan({ loading: true, content: null });
        const stats = exam.getSummaryStats();
        const keyToUse = hackClubApiKey || null;

        if (!canUseHackClub) {
            setStudyPlan({ loading: false, content: buildStudyPlan(percentage, stats.weaknessCounts) });
            return;
        }
        try {
            const response = await AIService.generateStudyPlan(percentage, stats.weaknessCounts, exam.activeQuestions.length, keyToUse, studentId);
            setStudyPlan({ loading: false, content: response });
        } catch (e) {
            setStudyPlan({ loading: false, content: buildStudyPlan(percentage, stats.weaknessCounts) });
        }
    };

    const formatTime = (s) => `${Math.floor(s / 60)}:${(s % 60).toString().padStart(2, '0')}`;

    // === RENDER PHASES ===

    if (phase === 'upload') {
        return (
            <div className="min-h-screen bg-background p-6 flex items-center justify-center">
                <div className="max-w-2xl w-full">
                    {/* Back Link */}
                    <Link href="/dashboard" className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-primary mb-6 transition-colors">
                        <ArrowLeft className="h-4 w-4" />
                        Back to Dashboard
                    </Link>

                    <Card className="card-shadow relative">
                        {hasSavedSession && (
                            <div className="absolute top-4 right-4 animate-fade-in">
                                <Button onClick={resumeSavedSession} variant="outline" size="sm" className="gap-2 text-success border-success/30 hover:bg-success/10">
                                    <Save className="w-4 h-4" /> Resume Session
                                </Button>
                            </div>
                        )}

                        <CardHeader className="text-center pb-2">
                            <div className="inline-flex items-center justify-center w-14 h-14 rounded-xl bg-primary/10 mx-auto mb-4">
                                <GraduationCap className="h-7 w-7 text-primary" />
                            </div>
                            <CardTitle className="text-2xl">AI GCSE Marker</CardTitle>
                            <CardDescription>Upload your past papers and get instant AI feedback</CardDescription>
                        </CardHeader>

                        <CardContent className="space-y-6">
                            {error && (
                                <div className="bg-destructive/10 border border-destructive/30 rounded-lg p-4 text-destructive text-sm">
                                    {error}
                                </div>
                            )}

                            <div className="space-y-2">
                                <Label htmlFor="apiKey">OpenRouter API Key{hasServerKey ? ' (optional override)' : ''}</Label>
                                <div className="relative">
                                    <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                                        <Key className="h-4 w-4 text-muted-foreground" />
                                    </div>
                                    <Input
                                        id="apiKey"
                                        type="password"
                                        value={customApiKey}
                                        onChange={(e) => updateApiKey(e.target.value)}
                                        className="pl-10"
                                        placeholder="Enter your OpenRouter API Key"
                                    />
                                </div>
                                <p className="text-xs text-muted-foreground">
                                    {hasServerKey
                                        ? "Server key detected. Add your own key if requests fail or you want to override."
                                        : <>Get your key at <a href="https://openrouter.ai/keys" target="_blank" rel="noopener noreferrer" className="text-primary hover:underline">openrouter.ai/keys</a></>
                                    }
                                </p>
                            </div>

                            {!hasHackClubServerKey && (
                                <div className="space-y-2">
                                    <Label htmlFor="hackClubKey">Hack Club API Key (Marking)</Label>
                                    <div className="relative">
                                        <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                                            <Key className="h-4 w-4 text-muted-foreground" />
                                        </div>
                                        <Input
                                            id="hackClubKey"
                                            type="password"
                                            value={hackClubApiKey}
                                            onChange={(e) => updateHackClubKey(e.target.value)}
                                            className="pl-10"
                                            placeholder="Enter Hack Club key for marking"
                                        />
                                    </div>
                                </div>
                            )}

                            <div className="space-y-3">
                                <FileUploadZone label="Question Paper" file={files.paper} onUpload={(f) => setFiles(prev => ({ ...prev, paper: f }))} />
                                <div className="grid grid-cols-2 gap-4">
                                    <FileUploadZone label="Mark Scheme" file={files.scheme} onUpload={(f) => setFiles(prev => ({ ...prev, scheme: f }))} />
                                    <FileUploadZone label="Insert / Source" file={files.insert} onUpload={(f) => setFiles(prev => ({ ...prev, insert: f }))} />
                                </div>
                                {files.paper && (
                                    <div className="flex justify-end">
                                        <Button variant="ghost" size="sm" onClick={handleSavePaper} disabled={isSaving} className="gap-1 text-primary">
                                            {isSaving ? <RefreshCw className="w-3 h-3 animate-spin" /> : <Save className="w-3 h-3" />} Save to Library
                                        </Button>
                                    </div>
                                )}
                            </div>

                            <div className="border-t pt-6">
                                <PaperLibrary onSelectPaper={handleSelectPaper} />
                            </div>
                        </CardContent>

                        <CardFooter>
                            <Button
                                disabled={!files.paper || (!hasServerKey && !customApiKey)}
                                onClick={handleStartParsing}
                                className="w-full gap-2"
                                size="lg"
                            >
                                <Sparkles className="h-5 w-5" />
                                Start AI Analysis
                            </Button>
                        </CardFooter>
                    </Card>
                </div>
            </div>
        );
    }

    if (phase === 'parsing') {
        return (
            <div className="min-h-screen bg-background text-foreground flex flex-col items-center justify-center p-6">
                <Card className="card-shadow p-8 text-center max-w-md">
                    <div className="flex items-center justify-center gap-3 text-primary mb-4">
                        <RefreshCw className="w-8 h-8 animate-spin" />
                    </div>
                    <h2 className="text-xl font-semibold mb-2">{parsingStatus}</h2>
                    <p className="text-muted-foreground text-sm">This may take a moment...</p>
                </Card>
            </div>
        );
    }

    if (phase === 'exam' && exam.currentQuestion) {
        const question = exam.currentQuestion;
        const hasFeedback = !!exam.feedbacks[question.id];
        const progressPercent = ((exam.currentQIndex + 1) / exam.activeQuestions.length) * 100;
        const stats = exam.getSummaryStats();

        if (!files.paper) {
            return (
                <div className="min-h-screen bg-background flex flex-col items-center justify-center p-6">
                    <Card className="max-w-md w-full p-8 text-center space-y-6 card-shadow border-warning/20">
                        <div className="mx-auto w-16 h-16 bg-warning/10 rounded-full flex items-center justify-center text-warning animate-pulse">
                            <AlertTriangle className="w-8 h-8" />
                        </div>
                        <div className="space-y-2">
                            <h3 className="text-xl font-bold">Connection to Paper Lost</h3>
                            <p className="text-muted-foreground">
                                We've restored your progress, but the PDF file needs to be re-loaded.
                                Please select the paper again from your library.
                            </p>
                        </div>
                        <Button
                            onClick={() => setPhase('upload')}
                            size="lg"
                            className="w-full gap-2 font-semibold shadow-lg shadow-primary/20"
                        >
                            <BookOpen className="w-4 h-4" />
                            Select Paper from Library
                        </Button>
                    </Card>
                </div>
            );
        }

        return (
            <div className="min-h-screen bg-background flex flex-col h-screen overflow-hidden">
                {/* Header */}
                <header className="bg-card border-b px-6 py-3 flex justify-between items-center shadow-sm z-10">
                    <div className="flex items-center gap-4">
                        <Badge variant="default" className="font-semibold">
                            GCSE Mock
                        </Badge>
                        <h2 className="text-foreground font-medium hidden sm:block truncate max-w-[200px]">
                            {files.paper?.name || "Mock Paper"}
                        </h2>
                    </div>
                    <div className="flex items-center gap-6">
                        <div className="flex items-center gap-2 text-sm">
                            <Clock className="h-4 w-4 text-muted-foreground" />
                            <span className="font-mono font-bold text-foreground">{formatTime(timeElapsed)}</span>
                        </div>
                        <div className="flex items-center gap-2 text-sm border-l pl-4 text-muted-foreground font-medium">
                            Marks:
                            <span className="font-mono font-bold text-foreground ml-1">
                                {stats.totalScore}/{stats.totalPossible}
                            </span>
                        </div>
                        <div className="flex items-center gap-2 border-l pl-4">
                            <span className="text-sm font-medium text-muted-foreground">Q</span>
                            <span className="text-sm font-bold text-foreground">{exam.currentQIndex + 1}/{exam.activeQuestions.length}</span>
                        </div>
                        <Button variant="ghost" size="icon" onClick={clearSaveData} className="text-muted-foreground hover:text-destructive">
                            <Trash2 className="w-4 h-4" />
                        </Button>
                    </div>
                </header>

                {/* Progress bar */}
                <div className="bg-card border-b px-6 py-2">
                    <Progress value={progressPercent} className="h-1.5" />
                </div>

                <main className="flex-1 flex overflow-hidden h-[calc(100vh-96px)]">
                    {/* PDF Viewer */}
                    <PDFViewer
                        file={activePdfTab === 'paper' ? files.paper : files.insert}
                        pageNumber={pdfPage}
                        scale={pdfScale}
                        onPageChange={setPdfPage}
                        onScaleChange={setPdfScale}
                        activePdfTab={activePdfTab}
                        onTabChange={setActivePdfTab}
                        hasInsert={!!files.insert}
                    />

                    {/* Right Panel: Exam Interface */}
                    <div className="flex-1 flex flex-col overflow-y-auto bg-card relative">
                        <div className="max-w-3xl mx-auto w-full p-6 md:p-10 pb-32">
                            <div className="mb-8 relative">
                                <div className="flex items-center justify-between mb-4">
                                    <div className="flex gap-2 flex-wrap">
                                        <Badge variant="secondary">{question.section}</Badge>
                                        <Badge variant="outline" className="text-primary border-primary/30">
                                            {question.marks} Marks
                                        </Badge>
                                    </div>
                                    {!hasFeedback && (
                                        <Button
                                            variant="ghost"
                                            size="sm"
                                            onClick={handleGetHint}
                                            disabled={hintData.loading || hintData.text}
                                            className="gap-2 text-warning-foreground hover:bg-warning/10"
                                        >
                                            {hintData.loading ? <RefreshCw className="w-4 h-4 animate-spin" /> : <Lightbulb className="w-4 h-4" />}
                                            {hintData.text ? "Hint Used" : "Get Hint"}
                                        </Button>
                                    )}
                                </div>

                                <div className="flex justify-between items-start gap-4">
                                    <h1 className="text-xl md:text-2xl font-bold text-foreground leading-tight">
                                        <span className="text-muted-foreground mr-2">{question.id}.</span>
                                        <MarkdownText text={question.question} />

                                    </h1>
                                    {question.pageNumber && (
                                        <Button
                                            variant="secondary"
                                            size="sm"
                                            onClick={() => jumpToPdfPage(question.pageNumber)}
                                            className="flex-shrink-0 gap-1"
                                        >
                                            <Eye className="w-4 h-4" />
                                            Page {question.pageNumber}
                                        </Button>
                                    )}
                                </div>

                                {question.relatedFigure && (
                                    <Card className="mt-4 border-accent/30 bg-accent/5">
                                        <CardContent className="p-4 flex justify-between items-center">
                                            <div className="flex items-center gap-3">
                                                <ImageIcon className="w-5 h-5 text-accent" />
                                                <div>
                                                    <p className="text-sm font-semibold">Figure Referenced</p>
                                                    <p className="text-xs text-muted-foreground">{question.relatedFigure}</p>
                                                </div>
                                            </div>
                                            {question.figurePage && (
                                                <Button variant="outline" size="sm" onClick={() => jumpToPdfPage(question.figurePage)}>
                                                    View Figure (Pg {question.figurePage})
                                                </Button>
                                            )}
                                        </CardContent>
                                    </Card>
                                )}

                                {hintData.text && (
                                    <Card className="mt-4 border-warning/30 bg-warning/5">
                                        <CardContent className="p-3 flex gap-3">
                                            <Sparkles className="w-5 h-5 text-warning shrink-0 mt-0.5" />
                                            <div className="text-sm"><MarkdownText text={hintData.text} /></div>
                                        </CardContent>
                                    </Card>
                                )}
                            </div>

                            <div className={`transition-opacity duration-300 ${hasFeedback ? 'opacity-60 pointer-events-none' : 'opacity-100'}`}>
                                <AdaptiveInput
                                    key={question.id}
                                    type={question.type}
                                    options={question.options}
                                    listCount={question.listCount}
                                    tableStructure={question.tableStructure}
                                    graphConfig={question.graphConfig}
                                    value={exam.userAnswers[question.id]}
                                    onChange={onAnswerChange}
                                />
                                {question.type === 'long_text' && (
                                    <Card className="mt-4 bg-secondary/50">
                                        <CardContent className="p-4">
                                            <div className="flex items-center justify-between mb-2">
                                                <div className="flex items-center gap-2 text-sm font-semibold">
                                                    <BookOpen className="w-4 h-4 text-primary" /> Quote Scratchpad
                                                </div>
                                                <span className="text-xs text-muted-foreground">Paste lines from the PDF, then insert.</span>
                                            </div>
                                            <textarea
                                                className="w-full h-20 p-3 rounded-md border bg-background focus:ring-2 focus:ring-primary focus:border-primary text-sm"
                                                placeholder="Copy a key quote or stage direction here..."
                                                value={exam.quoteDrafts[question.id] || ''}
                                                onChange={(e) => exam.updateQuoteDraft(question.id, e.target.value)}
                                            />
                                            <div className="flex justify-end mt-2">
                                                <Button
                                                    size="sm"
                                                    onClick={() => exam.insertQuoteIntoAnswer(question.id)}
                                                    disabled={!exam.quoteDrafts[question.id]?.trim()}
                                                >
                                                    Insert Quote into Answer
                                                </Button>
                                            </div>
                                        </CardContent>
                                    </Card>
                                )}
                            </div>

                            {!hasFeedback && (
                                <div className="mt-8 flex justify-end gap-3">
                                    <Button variant="outline" onClick={handleSkip} className="gap-2">
                                        Skip <SkipForward className="w-4 h-4" />
                                    </Button>
                                    <Button
                                        onClick={handleSubmitAnswer}
                                        disabled={!exam.userAnswers[question.id] || loadingFeedback}
                                        className="gap-2"
                                        size="lg"
                                    >
                                        {loadingFeedback ? (
                                            <><RefreshCw className="w-5 h-5 animate-spin" /> Marking...</>
                                        ) : (
                                            <><CheckCircle className="w-5 h-5" /> Submit Answer</>
                                        )}
                                    </Button>
                                </div>
                            )}

                            <FeedbackBlock
                                feedback={exam.feedbacks[question.id]}
                                onNext={handleNext}
                                onExplain={handleExplainFeedback}
                                explaining={explanationData.loading}
                                explanation={explanationData.text}
                                questionId={question.id}
                                onFollowUp={handleFollowUp}
                                followUpChat={exam.followUpChats[question.id]}
                                sendingFollowUp={sendingFollowUp}
                            />
                        </div>

                        {/* Question Navigation */}
                        <div className="sticky bottom-0 bg-card border-t p-4 shadow-[0_-4px_6px_-1px_rgba(0,0,0,0.05)]">
                            <div className="flex gap-2 overflow-x-auto pb-2 scrollbar-thin scrollbar-thumb-muted">
                                {exam.activeQuestions.map((q, idx) => {
                                    const isDone = !!exam.feedbacks[q.id];
                                    const isSkipped = exam.skippedQuestions.has(q.id);
                                    const isCurrent = exam.currentQIndex === idx;

                                    let variant = "secondary";
                                    let className = "";

                                    if (isCurrent) {
                                        variant = "default";
                                        className = "ring-2 ring-primary/30";
                                    } else if (isDone) {
                                        const feedback = exam.feedbacks[q.id];
                                        const isWrong = feedback && feedback.score < q.marks;
                                        if (isWrong) {
                                            className = "bg-destructive/10 text-destructive border-destructive/30 hover:bg-destructive/20";
                                        } else {
                                            className = "bg-success/10 text-success border-success/30 hover:bg-success/20";
                                        }
                                    } else if (isSkipped) {
                                        className = "bg-warning/10 text-warning-foreground border-warning/30 hover:bg-warning/20";
                                    }

                                    return (
                                        <Button
                                            key={q.id}
                                            variant={isCurrent ? "default" : "outline"}
                                            size="icon"
                                            onClick={() => { exam.setCurrentQIndex(idx); advanceToQuestionPage(idx); }}
                                            className={`flex-shrink-0 w-10 h-10 font-bold ${className}`}
                                        >
                                            {q.id}
                                        </Button>
                                    );
                                })}
                            </div>
                        </div>
                    </div>
                </main>
            </div>
        );
    }

    if (phase === 'summary') {
        const stats = exam.getSummaryStats();
        const weaknessList = Object.entries(stats.weaknessCounts).sort((a, b) => b[1] - a[1]);

        return (
            <div className="min-h-screen bg-background flex items-center justify-center p-6">
                <div className="max-w-4xl w-full">
                    <Card className="card-shadow overflow-hidden">
                        <div className="flex flex-col md:flex-row">
                            {/* Left: Score */}
                            <div className="md:w-1/3 bg-primary p-8 text-primary-foreground flex flex-col justify-between relative overflow-hidden">
                                <div className="absolute inset-0 opacity-10" style={{ backgroundImage: 'radial-gradient(circle at 20px 20px, white 2px, transparent 0)', backgroundSize: '40px 40px' }}></div>
                                <div className="relative z-10">
                                    <h2 className="text-2xl font-bold mb-1">Result Summary</h2>
                                    <p className="opacity-80">GCSE Mock Paper</p>
                                </div>
                                <div className="relative z-10 text-center py-10">
                                    <div className="w-32 h-32 rounded-full border-8 border-primary-foreground/30 mx-auto flex items-center justify-center mb-4 bg-primary-foreground/10">
                                        <span className="text-5xl font-bold">{stats.grade}</span>
                                    </div>
                                    <p className="font-bold text-xl uppercase tracking-widest">Grade</p>
                                </div>
                                <div className="relative z-10 space-y-2">
                                    <div className="flex justify-between border-b border-primary-foreground/30 pb-2">
                                        <span>Raw Marks</span>
                                        <span className="font-bold">{stats.totalScore} / {stats.totalPossible}</span>
                                    </div>
                                    <div className="flex justify-between">
                                        <span>Percentage</span>
                                        <span className="font-bold">{stats.percentage}%</span>
                                    </div>
                                </div>
                            </div>

                            {/* Right: Details */}
                            <div className="md:w-2/3 p-8 md:p-12 overflow-y-auto max-h-[90vh]">
                                <div className="flex items-center gap-2 mb-6">
                                    <BarChart2 className="w-6 h-6 text-primary" />
                                    <h3 className="text-2xl font-bold">Performance Breakdown</h3>
                                </div>

                                <div className="space-y-3 mb-8">
                                    {weaknessList.length ? weaknessList.map(([name, count]) => (
                                        <div key={name} className="flex items-center justify-between bg-secondary/50 border rounded-lg px-4 py-3">
                                            <div className="text-sm font-semibold">{name}</div>
                                            <Badge variant="secondary">{count}×</Badge>
                                        </div>
                                    )) : (
                                        <p className="text-sm text-muted-foreground">Not enough data to detect repeated weaknesses.</p>
                                    )}
                                </div>

                                <Card className="bg-secondary/30">
                                    <CardContent className="p-6">
                                        <div className="flex items-center justify-between mb-4">
                                            <h4 className="font-bold flex items-center gap-2">
                                                <GraduationCap className="w-5 h-5 text-primary" /> Next Steps
                                            </h4>
                                            {!studyPlan.content && (
                                                <Button
                                                    size="sm"
                                                    onClick={() => handleGenerateStudyPlan(stats.percentage)}
                                                    disabled={studyPlan.loading}
                                                    className="gap-2"
                                                >
                                                    {studyPlan.loading ? <RefreshCw className="w-3 h-3 animate-spin" /> : <Sparkles className="w-3 h-3" />}
                                                    Generate Study Plan
                                                </Button>
                                            )}
                                        </div>
                                        {studyPlan.loading && (
                                            <div className="text-muted-foreground text-sm flex items-center gap-2 animate-pulse">
                                                <Brain className="w-4 h-4" /> Analyzing your weaknesses...
                                            </div>
                                        )}
                                        {studyPlan.content ? (
                                            <div className="prose prose-sm text-muted-foreground">
                                                <MarkdownText text={studyPlan.content} />
                                            </div>
                                        ) : (!studyPlan.loading && (
                                            <p className="text-sm text-muted-foreground italic">
                                                Click the button above to auto-generate a revision strategy.
                                            </p>
                                        ))}
                                    </CardContent>
                                </Card>

                                <div className="mt-8 flex justify-end gap-3">
                                    <Link href="/dashboard">
                                        <Button variant="outline" className="gap-2">
                                            <ArrowLeft className="w-4 h-4" /> Dashboard
                                        </Button>
                                    </Link>
                                    <Button onClick={() => window.location.reload()}>
                                        Upload Another Paper
                                    </Button>
                                </div>
                            </div>
                        </div>
                    </Card>
                </div>
            </div>
        );
    }

    return null;
}
