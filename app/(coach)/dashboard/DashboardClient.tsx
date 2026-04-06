'use client';

import React, { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import {
    Calendar,
    TrendingUp,
    TrendingDown,
    Minus,
    Flame,
    Zap,
    AlertTriangle,
    Clock,
    ChevronRight,
    Sparkles,
    GraduationCap,
    FileText,
    Award,
    ArrowRight,
    Play,
    CalendarDays,
    Loader2
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/app/components/ui/card';
import { Progress } from '@/app/components/ui/progress';
import { Badge } from '@/app/components/ui/badge';
import { Button } from '@/app/components/ui/button';
import { useAuth, useStudentId } from '../../components/AuthProvider';
import { getGcseDatesForYear } from '../../services/gcseDates';
import { bandFromPercent, daysUntil, formatShort, pct } from '../../services/dateUtils';
import {
    listAssessments,
    listQuestionAttempts,
    listSubjects,
    pickTopWeaknesses,
    weaknessCountsFromAttempts,
    getOrCreateSettings,
    getStudyStreak,
    getWeeklyAttemptStats,
} from '../../services/studentOS';
import { generateDashboardInsights } from '../../services/AICoachService';

interface AIInsights {
    greeting: string;
    trend: { change: number; direction: 'up' | 'down' | 'flat'; insight: string };
    streak: { days: number; message: string };
    nextSession: { topic: string; subject: string; reason: string };
    dailyTip: string;
}

const getConfidenceColor = (confidence: number) => {
    if (confidence >= 75) return "text-success";
    if (confidence >= 50) return "text-warning-foreground";
    return "text-destructive";
};

const getConfidenceBg = (confidence: number) => {
    if (confidence >= 75) return "bg-success";
    if (confidence >= 50) return "bg-warning";
    return "bg-destructive";
};

// Types for data (aligned with studentOS row shapes)
interface Subject {
    id: string;
    name: string;
    exam_board?: string | null;
    target_grade?: string | null;
}

interface Attempt {
    student_id?: string;
    subject_id: string | null;
    marks_awarded?: number | null;
    marks_total?: number | null;
    attempted_at?: string;
    primary_flaw?: string | null;
    question_type?: string | null;
}

interface Assessment {
    date?: string | null;
    kind?: string;
}

interface SubjectStat {
    subject: Subject;
    earned: number;
    total: number;
    lastAttempt: string | null;
    percent: number;
    gradeBand: string;
}


interface DashboardClientProps {
    initialSubjects: Subject[];
    initialAttempts: Attempt[];
    initialAssessments: Assessment[];
    initialSettings: any;
    initialStreak: { current: number; longest: number };
    initialWeekStats: any;
    studentId: string;
    user: any;
}

export default function DashboardClient({
    initialSubjects,
    initialAttempts,
    initialAssessments,
    initialSettings,
    initialStreak,
    initialWeekStats,
    studentId,
    user
}: DashboardClientProps) {
    const [loading, setLoading] = useState(false);
    const [aiLoading, setAiLoading] = useState(false);
    const [subjects, setSubjects] = useState<Subject[]>(initialSubjects);
    const [attempts, setAttempts] = useState<Attempt[]>(initialAttempts);
    const [assessments, setAssessments] = useState<Assessment[]>(initialAssessments);
    const [settings, setSettings] = useState<{ name?: string; exam_year?: number } | null>(initialSettings);
    const [streakData, setStreakData] = useState<{ current: number; longest: number }>(initialStreak);
    const [weekStats, setWeekStats] = useState(initialWeekStats);
    const [aiInsights, setAiInsights] = useState<AIInsights | null>(null);
    const [error, setError] = useState<string | null>(null);
    const [clientNow, setClientNow] = useState<Date | null>(null);

    useEffect(() => {
        setClientNow(new Date());
    }, []);



    const subjectStats = useMemo(() => {
        const byId: Record<string, { subject: Subject; earned: number; total: number; lastAttempt: string | null }> = {};
        for (const s of subjects) {
            byId[s.id] = { subject: s, earned: 0, total: 0, lastAttempt: null };
        }
        for (const a of attempts) {
            const sid = a.subject_id;
            if (!sid) continue;
            const bucket = byId[sid];
            if (!bucket) continue;
            bucket.earned += Number(a.marks_awarded || 0);
            bucket.total += Number(a.marks_total || 0);
            if (!bucket.lastAttempt || new Date(a.attempted_at || '') > new Date(bucket.lastAttempt))
                bucket.lastAttempt = a.attempted_at || null;
        }

        return Object.values(byId).map((row): SubjectStat => {
            const percent = pct(row.earned, row.total);
            return {
                ...row,
                percent,
                gradeBand: bandFromPercent(percent),
            };
        });
    }, [subjects, attempts]);

    const overallReadiness = useMemo(() => {
        const { earned, total } = subjectStats.reduce(
            (acc, stat) => {
                acc.earned += stat.earned;
                acc.total += stat.total;
                return acc;
            },
            { earned: 0, total: 0 }
        );
        return pct(earned, total);
    }, [subjectStats]);

    const topWeaknesses = useMemo(() => {
        const counts = weaknessCountsFromAttempts(attempts);
        return pickTopWeaknesses(counts, 6);
    }, [attempts]);

    const nextMock = useMemo(() => {
        // ⚡ Bolt: Replaced O(N log N) .filter().sort()[0] with O(N) single loop.
        // Prevents unnecessary array allocations and sorting overhead.
        const now = new Date();
        const todayTime = new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime();
        let closestMock = null;
        let minTime = Infinity;

        for (const a of assessments || []) {
            if (!a?.date) continue;
            // Parse date string once per item
            const time = new Date(`${a.date}T00:00:00`).getTime();
            if (!Number.isFinite(time)) continue;
            if (time >= todayTime && time < minTime) {
                minTime = time;
                closestMock = a;
            }
        }
        return closestMock;
    }, [assessments]);

    // Dynamic countdown cards based on user's exam year
    const dynamicCountdowns = useMemo(() => {
        const examYear = settings?.exam_year || 2026;
        const gcseDates = getGcseDatesForYear(examYear) as { id: string; label: string; date: string }[];
        const firstExam = gcseDates.find((d) => d.id === 'first_exam');
        const resultsDay = gcseDates.find((d) => d.id === 'results');

        return [
            nextMock ? {
                label: "Next Mock",
                date: formatShort(nextMock.date || ''),
                daysLeft: daysUntil(nextMock.date || ''),
                icon: FileText,
                color: "bg-primary/10 text-primary"
            } : null,
            firstExam ? {
                label: "First Exam",
                date: formatShort(firstExam.date),
                daysLeft: daysUntil(firstExam.date),
                icon: GraduationCap,
                color: "bg-orange-500/10 text-orange-600"
            } : null,
            resultsDay ? {
                label: "Results Day",
                date: formatShort(resultsDay.date),
                daysLeft: daysUntil(resultsDay.date),
                icon: Award,
                color: "bg-warning/10 text-warning-foreground"
            } : null,
        ].filter(Boolean) as { label: string; date: string; daysLeft: number; icon: typeof FileText; color: string }[];
    }, [settings?.exam_year, nextMock]);

    // Get GCSE dates for user's exam year
    const gcseDatesForYear = useMemo(() => {
        return getGcseDatesForYear(settings?.exam_year || 2026);
    }, [settings?.exam_year]);

    // Load AI insights after data is ready
    useEffect(() => {
        if (loading || !studentId) return;

        let cancelled = false;
        (async () => {
            setAiLoading(true);
            try {
                const insights = await generateDashboardInsights({
                    studentId,
                    name: settings?.name || user?.user_metadata?.full_name || user?.user_metadata?.name || 'Student',
                    overallPercent: overallReadiness,
                    topWeaknesses,
                    weekStats,
                    streakDays: streakData.current,
                    subjects
                });
                if (!cancelled) setAiInsights(insights as AIInsights);
            } catch (e) {
                console.error('Failed to generate AI insights:', e);
            } finally {
                if (!cancelled) setAiLoading(false);
            }
        })();

        return () => { cancelled = true; };
    }, [loading, studentId, subjects, overallReadiness, topWeaknesses, weekStats, streakData.current, settings?.name]);

    // Compute trend data
    const trendData = useMemo(() => {
        const thisWeekPct = weekStats.thisWeek.total > 0
            ? Math.round((weekStats.thisWeek.earned / weekStats.thisWeek.total) * 100)
            : null;
        const lastWeekPct = weekStats.lastWeek.total > 0
            ? Math.round((weekStats.lastWeek.earned / weekStats.lastWeek.total) * 100)
            : null;
        const change = (thisWeekPct !== null && lastWeekPct !== null) ? thisWeekPct - lastWeekPct : 0;
        return {
            change,
            direction: change > 0 ? 'up' : change < 0 ? 'down' : 'flat' as const,
            hasData: thisWeekPct !== null
        };
    }, [weekStats]);

    const formattedDate = useMemo(() => {
        if (!clientNow) return '';
        return clientNow.toLocaleDateString("en-GB", {
            weekday: "long",
            day: "numeric",
            month: "long",
            year: "numeric",
        });
    }, [clientNow]);

    const displayName = settings?.name || user?.user_metadata?.full_name || user?.user_metadata?.name || 'Student';
    const fallbackGreeting = useMemo(() => {
        if (!clientNow) return '';
        const hour = clientNow.getHours();
        const timeOfDay = hour < 12 ? 'morning' : hour < 17 ? 'afternoon' : 'evening';
        return `Good ${timeOfDay}, ${displayName}!`;
    }, [clientNow, displayName]);

    return (
        <div className="p-6 lg:p-8 max-w-7xl mx-auto space-y-6 animate-fade-in">
            {/* Header with AI Greeting and Date */}
            <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-6 pb-2">
                <div className="space-y-1">
                    <div className="flex items-center gap-3">
                        <div className="p-2 rounded-xl bg-primary/10 text-primary animate-pulse-slow">
                            <Sparkles className="h-6 w-6" />
                        </div>
                        <h1 className="text-2xl lg:text-3xl font-bold tracking-tight text-foreground bg-clip-text text-transparent bg-gradient-to-r from-foreground to-foreground/70">
                            {aiInsights?.greeting || fallbackGreeting || 'Welcome!'}
                        </h1>
                    </div>
                    <div className="flex flex-wrap items-center gap-x-4 gap-y-1">
                        <p className="text-sm font-medium text-muted-foreground flex items-center gap-2">
                            <Calendar className="h-4 w-4" />
                            {formattedDate || '—'}
                        </p>
                        {aiInsights?.dailyTip && (
                            <div className="flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-secondary/50 text-xs font-medium text-muted-foreground border border-border/50">
                                <span className="text-primary">💡</span> {aiInsights.dailyTip}
                            </div>
                        )}
                    </div>
                </div>
                <div className="flex items-center gap-3">
                    <Link href="/daily">
                        <Button className="gap-2 shadow-lg shadow-primary/20 hover:shadow-primary/30 transition-all">
                            <Play className="h-4 w-4" />
                            Start Revision
                            <ArrowRight className="h-4 w-4" />
                        </Button>
                    </Link>
                </div>
            </div>

            {/* Error State */}
            {error && (
                <Card className="card-shadow border-destructive/50">
                    <CardHeader className="pb-2">
                        <CardTitle className="text-lg flex items-center gap-2 text-destructive">
                            <AlertTriangle className="h-5 w-5" />
                            Setup needed
                        </CardTitle>
                    </CardHeader>
                    <CardContent>
                        <p className="text-sm text-muted-foreground">{error}</p>
                        <p className="text-sm text-muted-foreground mt-2">
                            If this is your first time, make sure you&apos;ve created the Student OS tables in Supabase and set your env vars.
                        </p>
                    </CardContent>
                </Card>
            )}

            {/* Countdown Cards */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                {dynamicCountdowns.map((item) => (
                    <Card key={item.label} className="card-shadow hover:card-shadow-hover transition-shadow">
                        <CardContent className="p-4">
                            <div className="flex items-center gap-3">
                                <div className={`p-2.5 rounded-lg ${item.color}`}>
                                    <item.icon className="h-5 w-5" />
                                </div>
                                <div className="flex-1">
                                    <p className="text-sm text-muted-foreground">{item.label}</p>
                                    <p className="font-semibold">{item.date}</p>
                                </div>
                                <div className="text-right">
                                    <p className="text-2xl font-bold">{item.daysLeft > 0 ? item.daysLeft : 'Now'}</p>
                                    {item.daysLeft > 0 && <p className="text-xs text-muted-foreground">days</p>}
                                </div>
                            </div>
                        </CardContent>
                    </Card>
                ))}
            </div>

            {/* Readiness Card + Next Best Session */}
            <div className="grid lg:grid-cols-3 gap-4">
                <Card className="card-shadow lg:col-span-2">
                    <CardHeader className="pb-2">
                        <CardTitle className="text-lg flex items-center gap-2">
                            <Sparkles className="h-5 w-5 text-primary" />
                            Exam Readiness
                        </CardTitle>
                    </CardHeader>
                    <CardContent>
                        <div className="grid sm:grid-cols-3 gap-6">
                            {/* Overall Score */}
                            <div className="text-center sm:text-left">
                                <p className="text-sm text-muted-foreground mb-1">Overall Score</p>
                                <div className="flex items-end gap-2 justify-center sm:justify-start">
                                    <span className="text-4xl font-bold text-primary">
                                        {loading ? '...' : overallReadiness}
                                    </span>
                                    <span className="text-lg text-muted-foreground mb-1">/100</span>
                                </div>
                                <Progress value={overallReadiness} className="h-2 mt-2" />
                            </div>

                            {/* Weekly Trend */}
                            <div className="text-center sm:text-left">
                                <p className="text-sm text-muted-foreground mb-1">Weekly Trend</p>
                                <div className="flex items-center gap-2 justify-center sm:justify-start">
                                    {trendData.direction === 'up' && <TrendingUp className="h-6 w-6 text-success" />}
                                    {trendData.direction === 'down' && <TrendingDown className="h-6 w-6 text-destructive" />}
                                    {trendData.direction === 'flat' && <Minus className="h-6 w-6 text-muted-foreground" />}
                                    <span className={`text-2xl font-bold ${trendData.direction === 'up' ? 'text-success' : trendData.direction === 'down' ? 'text-destructive' : ''}`}>
                                        {trendData.hasData ? `${trendData.change >= 0 ? '+' : ''}${trendData.change}%` : 'N/A'}
                                    </span>
                                </div>
                                <p className="text-sm text-muted-foreground mt-1">
                                    {aiInsights?.trend?.insight || (trendData.hasData ? 'vs last week' : 'Mark more papers!')}
                                </p>
                            </div>

                            {/* Streak */}
                            <div className="text-center sm:text-left">
                                <p className="text-sm text-muted-foreground mb-1">Study Streak</p>
                                <div className="flex items-center gap-2 justify-center sm:justify-start">
                                    <Flame className={`h-6 w-6 ${streakData.current > 0 ? 'text-warning' : 'text-muted-foreground'}`} />
                                    <span className="text-2xl font-bold">{streakData.current} {streakData.current === 1 ? 'day' : 'days'}</span>
                                </div>
                                <p className="text-sm text-muted-foreground mt-1">
                                    {aiInsights?.streak?.message || (streakData.current > 0 ? 'Keep it up!' : 'Start today!')}
                                </p>
                            </div>
                        </div>
                    </CardContent>
                </Card>

                {/* Next Best Session Button */}
                <Card className="card-shadow bg-primary text-primary-foreground hover:bg-primary/90 transition-colors cursor-pointer group">
                    <CardContent className="p-6 h-full flex flex-col items-center justify-center text-center">
                        <div className="p-3 rounded-full bg-primary-foreground/10 mb-3 group-hover:bg-primary-foreground/20 transition-colors">
                            {aiLoading ? <Loader2 className="h-8 w-8 animate-spin" /> : <Zap className="h-8 w-8" />}
                        </div>
                        <h3 className="text-lg font-semibold mb-1">Next Best Session</h3>
                        <p className="text-sm opacity-90 mb-1">
                            {aiInsights?.nextSession?.topic || topWeaknesses[0]?.label || 'Practice questions'}
                        </p>
                        <p className="text-xs opacity-70 mb-3">
                            {aiInsights?.nextSession?.reason || (topWeaknesses.length > 0 ? 'Your top weakness' : 'Build your skills')}
                        </p>
                        <Link href="/daily">
                            <Button variant="secondary" size="sm" className="gap-1">
                                Start Now <ChevronRight className="h-4 w-4" />
                            </Button>
                        </Link>
                    </CardContent>
                </Card>
            </div>

            {/* Top Weaknesses */}
            <Card className="card-shadow">
                <CardHeader className="pb-3">
                    <CardTitle className="text-lg flex items-center gap-2">
                        <AlertTriangle className="h-5 w-5 text-warning" />
                        Top Weaknesses to Focus On
                    </CardTitle>
                </CardHeader>
                <CardContent>
                    {loading ? (
                        <p className="text-sm text-muted-foreground">Loading...</p>
                    ) : topWeaknesses.length === 0 ? (
                        <p className="text-sm text-muted-foreground">
                            Mark a paper in <Link href="/exam" className="text-primary font-medium hover:underline">Exam</Link> to populate this automatically.
                        </p>
                    ) : (
                        <div className="grid sm:grid-cols-2 gap-3">
                            {topWeaknesses.map((item, index) => (
                                <div
                                    key={index}
                                    className="flex items-start gap-3 p-3 rounded-lg bg-secondary/50 hover:bg-secondary transition-colors cursor-pointer"
                                >
                                    <div className="w-2 h-2 mt-2 rounded-full flex-shrink-0 bg-destructive" />
                                    <div className="flex-1 min-w-0">
                                        <div className="flex items-center gap-2 mb-1">
                                            <span className="font-medium text-sm">{item.label}</span>
                                            <Badge variant="secondary" className="text-xs">
                                                {item.count}×
                                            </Badge>
                                        </div>
                                    </div>
                                    <ChevronRight className="h-4 w-4 text-muted-foreground flex-shrink-0 mt-1" />
                                </div>
                            ))}
                        </div>
                    )}
                </CardContent>
            </Card>

            {/* Subject Tiles Grid */}
            <div className="space-y-4">
                <div className="flex items-center justify-between">
                    <h2 className="text-lg font-semibold flex items-center gap-2">
                        <GraduationCap className="h-5 w-5 text-primary" />
                        Your Subjects
                    </h2>
                    <Link href="/subjects" className="text-sm font-medium text-primary hover:underline">
                        Edit
                    </Link>
                </div>

                {loading ? (
                    <p className="text-sm text-muted-foreground">Loading...</p>
                ) : subjects.length === 0 ? (
                    <Card className="card-shadow">
                        <CardContent className="p-6 text-center">
                            <GraduationCap className="h-12 w-12 text-muted-foreground mx-auto mb-4 opacity-50" />
                            <h3 className="font-semibold mb-2">Start by adding your subjects</h3>
                            <p className="text-sm text-muted-foreground mb-4">
                                Then do a paper in the Exam tab — your weaknesses will appear here automatically.
                            </p>
                            <Link href="/subjects">
                                <Button>
                                    Add subjects <ArrowRight className="h-4 w-4 ml-2" />
                                </Button>
                            </Link>
                        </CardContent>
                    </Card>
                ) : (
                    <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4">
                        {subjectStats.map((subject) => (
                            <Link key={subject.subject.id} href={`/subjects/${subject.subject.id}`}>
                                <Card className="card-shadow hover:card-shadow-hover transition-all cursor-pointer group">
                                    <CardContent className="p-4">
                                        <div className="flex items-start justify-between mb-3">
                                            <h3 className="font-medium text-sm leading-tight">{subject.subject.name}</h3>
                                            <div className="flex items-center gap-1">
                                                {subject.percent >= 70 && (
                                                    <TrendingUp className="h-4 w-4 text-success" />
                                                )}
                                                {subject.percent < 50 && (
                                                    <TrendingDown className="h-4 w-4 text-destructive" />
                                                )}
                                                {subject.percent >= 50 && subject.percent < 70 && (
                                                    <div className="w-4 h-0.5 bg-muted-foreground rounded" />
                                                )}
                                            </div>
                                        </div>

                                        <div className="flex items-end justify-between mb-3">
                                            <div>
                                                <p className="text-xs text-muted-foreground">Est. Grade</p>
                                                <p className="text-2xl font-bold">{subject.gradeBand}</p>
                                            </div>
                                            <div className="text-right">
                                                <p className="text-xs text-muted-foreground">Confidence</p>
                                                <p className={`text-lg font-semibold ${getConfidenceColor(subject.percent)}`}>
                                                    {subject.percent}%
                                                </p>
                                            </div>
                                        </div>

                                        {/* Confidence Bar */}
                                        <div className="space-y-1">
                                            <div className="h-1.5 bg-secondary rounded-full overflow-hidden">
                                                <div
                                                    className={`h-full rounded-full transition-all ${getConfidenceBg(subject.percent)}`}
                                                    style={{ width: `${subject.percent}%` }}
                                                />
                                            </div>
                                            <div className="flex items-center gap-1 text-xs text-muted-foreground">
                                                <Clock className="h-3 w-3" />
                                                {subject.lastAttempt
                                                    ? `Last: ${new Date(subject.lastAttempt).toLocaleDateString()}`
                                                    : 'No attempts yet'
                                                }
                                            </div>
                                        </div>
                                    </CardContent>
                                </Card>
                            </Link>
                        ))}
                    </div>
                )}
            </div>

            {/* Countdowns from Supabase */}
            <Card className="card-shadow">
                <CardHeader className="pb-3">
                    <CardTitle className="text-lg flex items-center gap-2">
                        <CalendarDays className="h-5 w-5 text-primary" />
                        GCSE Key Dates {settings?.exam_year || 2026}
                    </CardTitle>
                </CardHeader>
                <CardContent>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                        {gcseDatesForYear.map((d: { id: string; label: string; date: string }) => {
                            const days = daysUntil(d.date);
                            const isPast = days < 0;
                            return (
                                <div key={d.id} className="rounded-xl border border-border p-4 bg-secondary/30">
                                    <div className="text-xs font-bold text-muted-foreground uppercase tracking-wide">
                                        {d.label}
                                    </div>
                                    <div className="mt-1 flex items-end justify-between gap-3">
                                        <div className="text-lg font-bold">{formatShort(d.date)}</div>
                                        <div className="text-sm font-semibold text-muted-foreground">
                                            {isPast ? 'done' : `${days} days`}
                                        </div>
                                    </div>
                                </div>
                            );
                        })}

                        {/* Next Mock from Supabase */}
                        <div className="rounded-xl border border-border p-4 bg-card md:col-span-2">
                            <div className="text-xs font-bold text-muted-foreground uppercase tracking-wide">
                                Next mock
                            </div>
                            {nextMock ? (
                                <div className="mt-2 flex flex-col md:flex-row md:items-center md:justify-between gap-2">
                                    <div className="font-bold">
                                        {formatShort(nextMock.date || '')} · {nextMock.kind || 'mock'}
                                    </div>
                                    <Link href="/assessments" className="text-sm font-medium text-primary hover:underline inline-flex items-center gap-1">
                                        Manage <ArrowRight className="h-4 w-4" />
                                    </Link>
                                </div>
                            ) : (
                                <div className="mt-2 text-sm text-muted-foreground">
                                    Add your mock dates in <Link className="font-medium text-primary hover:underline" href="/assessments">Assessments</Link>.
                                </div>
                            )}
                        </div>
                    </div>
                </CardContent>
            </Card>
        </div>
    );
}
