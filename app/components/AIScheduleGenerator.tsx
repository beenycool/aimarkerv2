'use client';

import { useState, useEffect } from 'react';
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
    DialogDescription,
    DialogFooter,
} from '@/app/components/ui/dialog';
import { Button } from '@/app/components/ui/button';
import { Badge } from '@/app/components/ui/badge';
import { Card, CardContent } from '@/app/components/ui/card';
import { Progress } from '@/app/components/ui/progress';
import {
    Sparkles,
    Brain,
    Target,
    AlertTriangle,
    CheckCircle2,
    Clock,
    Calendar,
    Loader2,
    RefreshCw,
    Zap,
} from 'lucide-react';
import { AIService } from '@/app/services/AIService';
import {
    listSubjects,
    listQuestionAttempts,
    weaknessCountsFromAttempts,
    getOrCreateSettings,
    getStudyStreak,
    getSubjectPerformance,
    getUpcomingAssessments,
    saveSchedule,
    getRecentStudyHistory,
    getTopicPerformance,
    getSessionCompletionStats,
} from '@/app/services/studentOS';

interface Subject {
    id: string;
    name: string;
}

interface GeneratedSession {
    day: string;
    date: string;
    subjectName: string;
    topic: string;
    duration: number;
    priority: 'high' | 'medium' | 'low';
    reason?: string;
    startTime?: string; // e.g., '09:00', '14:30'
}

interface AIScheduleResult {
    analysis: string;
    priorityOrder: string[];
    sessions: GeneratedSession[];
}

interface WeekDate {
    day: string;
    date: number;
    month: string;
    isoDate: string;
}

interface AIScheduleGeneratorProps {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    studentId: string;
    weekDates: WeekDate[];
    onScheduleApplied: () => void;
}

type Step = 'gathering' | 'analyzing' | 'generating' | 'preview' | 'saving' | 'done' | 'error';

export function AIScheduleGenerator({
    open,
    onOpenChange,
    studentId,
    weekDates,
    onScheduleApplied,
}: AIScheduleGeneratorProps) {
    const [step, setStep] = useState<Step>('gathering');
    const [progress, setProgress] = useState(0);
    const [statusMessage, setStatusMessage] = useState('');
    const [insights, setInsights] = useState<string[]>([]);
    const [result, setResult] = useState<AIScheduleResult | null>(null);
    const [error, setError] = useState<string | null>(null);
    const [subjects, setSubjects] = useState<Subject[]>([]);
    const [focusOnExams, setFocusOnExams] = useState(false);
    const [useSearchApi, setUseSearchApi] = useState(false);

    useEffect(() => {
        if (open && studentId) {
            runGeneration();
        } else {
            // Reset state when closed
            setStep('gathering');
            setProgress(0);
            setInsights([]);
            setResult(null);
            setError(null);
        }
    }, [open, studentId]);

    const runGeneration = async () => {
        try {
            // Step 1: Gather data
            setStep('gathering');
            setProgress(10);
            setStatusMessage('Fetching your subjects...');

            const [subs, settings, streak] = await Promise.all([
                listSubjects(studentId),
                getOrCreateSettings(studentId),
                getStudyStreak(studentId),
            ]);
            setSubjects(subs || []);
            addInsight(`📚 Found ${subs?.length || 0} subjects`);
            setProgress(20);

            setStatusMessage('Analyzing your performance...');
            const [attempts, performance, upcomingAssessments] = await Promise.all([
                listQuestionAttempts(studentId, { limit: 300 }),
                getSubjectPerformance(studentId),
                getUpcomingAssessments(studentId),
            ]);
            setProgress(35);

            // Fetch enhanced context data
            setStatusMessage('Gathering study patterns...');
            const [recentHistory, topicPerformance, completionStats] = await Promise.all([
                getRecentStudyHistory(studentId),
                getTopicPerformance(studentId),
                getSessionCompletionStats(studentId),
            ]);
            setProgress(50);

            // Calculate weaknesses
            const weaknesses = weaknessCountsFromAttempts(attempts);
            const weaknessCount = Object.keys(weaknesses).length;
            if (weaknessCount > 0) {
                addInsight(`🎯 Identified ${weaknessCount} weakness patterns`);
            }

            // Note upcoming assessments
            if (upcomingAssessments.length > 0) {
                const urgent = upcomingAssessments.filter(a => {
                    const days = Math.ceil((new Date(a.date).getTime() - Date.now()) / (1000 * 60 * 60 * 24));
                    return days <= 7;
                });
                if (urgent.length > 0) {
                    addInsight(`⚠️ ${urgent.length} assessment(s) within 7 days!`);
                }
            }

            // Note struggling subjects
            const performanceMap = performance as Record<string, { percentage: number | null; questionCount: number }>;
            const strugglingSubjects = subs?.filter(s => {
                const perf = performanceMap[s.id];
                return perf != null && perf.percentage != null && perf.percentage < 60;
            }) || [];
            if (strugglingSubjects.length > 0) {
                addInsight(`📉 ${strugglingSubjects.length} subject(s) need extra focus`);
            }

            // Note streak
            if (streak.current > 0) {
                addInsight(`🔥 ${streak.current}-day study streak!`);
            }

            // Note completion rate
            if (completionStats.completionRate > 0) {
                addInsight(`📊 ${completionStats.completionRate}% session completion rate`);
            }

            // Note recent topics for spaced repetition
            const topicsNeedingReview = recentHistory.recentTopics
                .filter(t => t.daysAgo >= 3 && t.daysAgo <= 10)
                .slice(0, 3);
            if (topicsNeedingReview.length > 0) {
                addInsight(`🔄 ${topicsNeedingReview.length} topic(s) ready for review`);
            }

            setProgress(55);

            setProgress(55);

            // Verify Topics Step (Search API)
            let verifiedTopics: Record<string, string[]> = {};
            if (useSearchApi) {
                setStatusMessage('Verifying official syllabus topics (Web Search)...');

                // Get search settings from user config
                const searchStrategy = settings.custom_api_config?.search_strategy || 'fallback';
                const hackclubSearchKey = settings.custom_api_config?.hackclub_search_key || null;

                // Prioritize weak subjects or those with exams
                const performanceMap = performance as Record<string, { percentage: number | null }>;
                const prioritySubjects = (subs || []).filter(s => {
                    const hasExam = upcomingAssessments.some((a: any) => a.subject_id === s.id);
                    const lowPerf = performanceMap[s.id]?.percentage != null && performanceMap[s.id].percentage! < 60;
                    return hasExam || lowPerf;
                });

                const targets = prioritySubjects.length > 0 ? prioritySubjects : (subs || []).slice(0, 3);

                if (targets.length > 0) {
                    const topicsPromises = targets.map(async s => {
                        const t = await AIService.researchSubjectTopics(s.name, studentId, {
                            searchStrategy,
                            hackclubSearchKey
                        });
                        return { id: s.id, topics: t };
                    });

                    const results = await Promise.all(topicsPromises);
                    results.forEach(r => {
                        if (r.topics && Array.isArray(r.topics) && r.topics.length) {
                            verifiedTopics[r.id] = r.topics;
                        }
                    });

                    if (Object.keys(verifiedTopics).length > 0) {
                        addInsight(`🔍 Verified topics for ${Object.keys(verifiedTopics).length} subjects (${searchStrategy})`);
                    }
                }
            }

            // Step 2: Analyze
            setStep('analyzing');
            setStatusMessage('Building your personalized context...');
            await sleep(500);
            setProgress(65);

            // Step 3: Generate
            setStep('generating');
            setStatusMessage('AI is crafting your optimal schedule...');
            setProgress(75);

            const context = {
                subjects: subs || [],
                subjectPerformance: performance,
                weaknesses,
                upcomingAssessments,
                studyStreak: streak,
                settings,
                weekDates: weekDates.map(d => ({
                    day: d.day,
                    date: d.date,
                    month: d.month,
                    isoDate: d.isoDate,
                })),
                // Enhanced context for better scheduling
                recentStudyHistory: recentHistory.recentTopics.slice(0, 10),
                topicPerformance: topicPerformance.byTopic,
                completionStats: {
                    rate: completionStats.completionRate,
                    insights: completionStats.insights,
                    bestDays: Object.entries(completionStats.byDayOfWeek)
                        .filter(([_, stats]) => stats.total >= 2 && (stats.done / stats.total) > 0.7)
                        .map(([day]) => day),
                },
                preferredStudyTime: settings.preferred_study_time || 'any',
                focusOnExams,
                verifiedTopics,
            };

            const aiResult = await AIService.generateWeeklySchedule(context, null, studentId) as unknown as AIScheduleResult;
            setProgress(95);

            if (!aiResult?.sessions?.length) {
                throw new Error('AI returned an empty schedule. Please add subjects first.');
            }

            setResult(aiResult);
            setStep('preview');
            setProgress(100);
            setStatusMessage('Schedule ready for review!');

        } catch (err: any) {
            console.error('AI Schedule generation error:', err);
            setError(err.message || 'Failed to generate schedule');
            setStep('error');
        }
    };

    const addInsight = (text: string) => {
        setInsights(prev => [...prev, text]);
    };

    const applySchedule = async () => {
        if (!result?.sessions?.length) {
            setError('No sessions to save. Please regenerate.');
            setStep('error');
            return;
        }

        try {
            setStep('saving');
            setStatusMessage('Saving your schedule...');

            // Map AI sessions to DB format
            const sessionsToSave = result.sessions.map(s => {
                const subject = subjects.find(sub =>
                    sub.name.toLowerCase() === s.subjectName.toLowerCase()
                );

                // FORCE correct date from our local state
                const matchedDateInfo = weekDates.find(wd => wd.day === s.day);
                const finalDate = matchedDateInfo ? matchedDateInfo.isoDate : s.date;

                return {
                    subject_id: subject?.id || null,
                    planned_for: finalDate,
                    duration_minutes: s.duration,
                    topic: s.topic,
                    notes: s.reason || null,
                    session_type: 'ai_planned',
                    start_time: s.startTime || null,
                };
            });

            const weekStart = weekDates[0]?.isoDate;
            const weekEnd = weekDates[weekDates.length - 1]?.isoDate;

            await saveSchedule(studentId, sessionsToSave, weekStart, weekEnd);

            setStep('done');
            setStatusMessage('Schedule applied successfully!');

            // Close after brief delay
            setTimeout(() => {
                onOpenChange(false);
                onScheduleApplied();
            }, 1500);

        } catch (err: any) {
            console.error('Failed to save schedule:', err);
            setError(err.message || 'Failed to save schedule');
            setStep('error');
        }
    };

    const getPriorityColor = (priority: string) => {
        switch (priority) {
            case 'high': return 'bg-red-500/10 text-red-600 border-red-500/20';
            case 'medium': return 'bg-amber-500/10 text-amber-600 border-amber-500/20';
            case 'low': return 'bg-orange-500/10 text-orange-600 border-orange-500/20';
            default: return 'bg-primary/10 text-primary border-primary/20';
        }
    };

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="sm:max-w-[600px] max-h-[80vh] overflow-y-auto">
                <DialogHeader>
                    <DialogTitle className="flex items-center gap-2">
                        <Sparkles className="h-5 w-5 text-primary animate-pulse" />
                        AI Schedule Generator
                    </DialogTitle>
                    <DialogDescription>
                        Creating a personalized study plan based on your performance
                    </DialogDescription>
                </DialogHeader>

                <div className="py-4 space-y-4">
                    {/* Progress Section */}
                    {step !== 'preview' && step !== 'done' && step !== 'error' && (
                        <div className="space-y-3">
                            <div className="flex items-center gap-2">
                                {step === 'gathering' && <Brain className="h-5 w-5 text-primary animate-pulse" />}
                                {step === 'analyzing' && <Target className="h-5 w-5 text-orange-500 animate-pulse" />}
                                {step === 'generating' && <Sparkles className="h-5 w-5 text-primary animate-pulse" />}
                                {step === 'saving' && <Loader2 className="h-5 w-5 text-primary animate-spin" />}
                                <span className="font-medium">{statusMessage}</span>
                            </div>
                            <Progress value={progress} className="h-2" />

                            {/* Insights */}
                            {insights.length > 0 && (
                                <div className="space-y-1 pt-2">
                                    {insights.map((insight, i) => (
                                        <div
                                            key={i}
                                            className="text-sm text-muted-foreground flex items-center gap-2 animate-fade-in"
                                        >
                                            <CheckCircle2 className="h-4 w-4 text-primary" />
                                            {insight}
                                        </div>
                                    ))}
                                </div>
                            )}
                        </div>
                    )}

                    {/* Error State */}
                    {step === 'error' && (
                        <div className="text-center py-6 space-y-4">
                            <AlertTriangle className="h-12 w-12 text-red-500 mx-auto" />
                            <p className="text-red-600 font-medium">{error}</p>
                            <Button onClick={runGeneration} variant="outline">
                                <RefreshCw className="h-4 w-4 mr-2" />
                                Try Again
                            </Button>
                        </div>
                    )}

                    {/* Done State */}
                    {step === 'done' && (
                        <div className="text-center py-6 space-y-2">
                            <CheckCircle2 className="h-12 w-12 text-primary mx-auto animate-bounce" />
                            <p className="text-primary font-medium">{statusMessage}</p>
                        </div>
                    )}

                    {/* Preview State */}
                    {step === 'preview' && result && (
                        <div className="space-y-4">
                            {/* AI Analysis */}
                            <Card className="bg-primary/5 border-primary/20">
                                <CardContent className="p-4">
                                    <div className="flex items-start gap-3">
                                        <Brain className="h-5 w-5 text-primary mt-0.5" />
                                        <div>
                                            <p className="font-medium text-sm">AI Analysis</p>
                                            <p className="text-sm text-muted-foreground">{result.analysis}</p>
                                        </div>
                                    </div>
                                </CardContent>
                            </Card>

                            {/* Priority Order */}
                            {result.priorityOrder?.length > 0 && (
                                <div className="flex items-center gap-2 flex-wrap">
                                    <span className="text-sm text-muted-foreground">Priority:</span>
                                    {result.priorityOrder.map((subj, i) => (
                                        <Badge key={subj} variant="outline" className="text-xs">
                                            {i + 1}. {subj}
                                        </Badge>
                                    ))}
                                </div>
                            )}

                            {/* Sessions Preview */}
                            <div className="space-y-2 max-h-[300px] overflow-y-auto">
                                <p className="text-sm font-medium flex items-center gap-2">
                                    <Calendar className="h-4 w-4" />
                                    {result.sessions.length} sessions planned
                                </p>
                                {result.sessions.map((session, i) => (
                                    <Card key={i} className={`${getPriorityColor(session.priority)}`}>
                                        <CardContent className="p-3">
                                            <div className="flex items-start justify-between gap-2">
                                                <div className="flex-1 min-w-0">
                                                    <div className="flex items-center gap-2 mb-1">
                                                        <span className="font-medium text-sm truncate">
                                                            {session.subjectName}
                                                        </span>
                                                        <Badge variant="outline" className="text-xs shrink-0">
                                                            {session.priority}
                                                        </Badge>
                                                    </div>
                                                    <p className="text-xs text-muted-foreground truncate">
                                                        {session.topic}
                                                    </p>
                                                    {session.reason && (
                                                        <p className="text-xs text-muted-foreground/80 mt-1 italic">
                                                            {session.reason}
                                                        </p>
                                                    )}
                                                </div>
                                                <div className="text-right shrink-0">
                                                    <p className="text-xs font-medium">{session.day}</p>
                                                    {session.startTime && (
                                                        <p className="text-xs text-primary font-medium">
                                                            {session.startTime}
                                                        </p>
                                                    )}
                                                    <p className="text-xs text-muted-foreground flex items-center gap-1 justify-end">
                                                        <Clock className="h-3 w-3" />
                                                        {session.duration}m
                                                    </p>
                                                </div>
                                            </div>
                                        </CardContent>
                                    </Card>
                                ))}
                            </div>
                        </div>
                    )}
                </div>

                {step === 'preview' && (
                    <DialogFooter className="flex sm:justify-between gap-4 flex-col sm:flex-row items-center">
                        <div className="flex items-center space-x-2 bg-secondary/10 px-3 py-2 rounded-md">
                            <input
                                type="checkbox"
                                id="focus-exams"
                                checked={focusOnExams}
                                onChange={(e) => setFocusOnExams(e.target.checked)}
                                className="h-4 w-4 rounded border-primary text-primary focus:ring-primary accent-primary cursor-pointer"
                            />
                            <label
                                htmlFor="focus-exams"
                                className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70 cursor-pointer"
                            >
                                Adapt for upcoming assessments
                            </label>
                        </div>

                        <div className="flex flex-col space-y-1">
                            <div className="flex items-center space-x-2 bg-secondary/10 px-3 py-2 rounded-md">
                                <input
                                    type="checkbox"
                                    id="use-search"
                                    checked={useSearchApi}
                                    onChange={(e) => setUseSearchApi(e.target.checked)}
                                    className="h-4 w-4 rounded border-primary text-primary focus:ring-primary accent-primary cursor-pointer"
                                />
                                <label
                                    htmlFor="use-search"
                                    className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70 cursor-pointer"
                                >
                                    Verify Topics (Web Search)
                                </label>
                            </div>
                            {useSearchApi && (
                                <p className="text-[10px] text-muted-foreground px-1">
                                    🔍 Uses your configured search provider (Settings → AI → Web Search)
                                </p>
                            )}
                        </div>

                        <div className="flex gap-2 w-full sm:w-auto">
                            <Button
                                variant="outline"
                                onClick={runGeneration}
                            >
                                <RefreshCw className="h-4 w-4 mr-1" />
                                Regenerate
                            </Button>
                            <Button onClick={applySchedule}>
                                <Zap className="h-4 w-4 mr-1" />
                                Apply Schedule
                            </Button>
                        </div>
                    </DialogFooter>
                )}
            </DialogContent>
        </Dialog>
    );
}

function sleep(ms: number) {
    return new Promise(resolve => setTimeout(resolve, ms));
}

export default AIScheduleGenerator;
