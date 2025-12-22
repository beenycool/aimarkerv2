'use client';

import React, { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import {
    Calendar,
    TrendingUp,
    TrendingDown,
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
    CalendarDays
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/app/components/ui/card';
import { Progress } from '@/app/components/ui/progress';
import { Badge } from '@/app/components/ui/badge';
import { Button } from '@/app/components/ui/button';
import { getOrCreateStudentId } from '../../services/studentId';
import { GCSE_KEY_DATES_2026 } from '../../services/gcseDates';
import { bandFromPercent, daysUntil, formatShort, pct } from '../../services/dateUtils';
import {
    listAssessments,
    listQuestionAttempts,
    listSubjects,
    pickTopWeaknesses,
    weaknessCountsFromAttempts,
} from '../../services/studentOS';

const today = new Date();
const formattedDate = today.toLocaleDateString("en-GB", {
    weekday: "long",
    day: "numeric",
    month: "long",
    year: "numeric",
});

const countdowns = [
    { label: "Next Mock", date: "Jan 15", daysLeft: 25, icon: FileText, color: "bg-primary/10 text-primary" },
    { label: "First Exam", date: "May 12", daysLeft: 142, icon: GraduationCap, color: "bg-accent/10 text-accent" },
    { label: "Results Day", date: "Aug 22", daysLeft: 244, icon: Award, color: "bg-warning/10 text-warning-foreground" },
];

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

// Types for data
interface Subject {
    id: string;
    name: string;
    exam_board?: string;
    target_grade?: string;
}

interface Attempt {
    subject_id: string;
    marks_awarded?: number;
    marks_total?: number;
    attempted_at?: string;
    primary_flaw?: string;
}

interface Assessment {
    date?: string;
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

export default function DashboardPage() {
    const [studentId, setStudentId] = useState<string | null>(null);
    const [loading, setLoading] = useState(true);
    const [subjects, setSubjects] = useState<Subject[]>([]);
    const [attempts, setAttempts] = useState<Attempt[]>([]);
    const [assessments, setAssessments] = useState<Assessment[]>([]);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        setStudentId(getOrCreateStudentId());
    }, []);

    useEffect(() => {
        if (!studentId) return;

        let cancelled = false;
        (async () => {
            setLoading(true);
            setError(null);
            try {
                const [subs, atts, asses] = await Promise.all([
                    listSubjects(studentId),
                    listQuestionAttempts(studentId, { limit: 250 }),
                    listAssessments(studentId).catch(() => []),
                ]);

                if (cancelled) return;
                setSubjects(subs || []);
                setAttempts(atts || []);
                setAssessments(asses || []);
            } catch (e: unknown) {
                if (cancelled) return;
                setError((e as Error)?.message || 'Failed to load dashboard data.');
            } finally {
                if (!cancelled) setLoading(false);
            }
        })();

        return () => {
            cancelled = true;
        };
    }, [studentId]);

    const subjectStats = useMemo(() => {
        const byId: Record<string, { subject: Subject; earned: number; total: number; lastAttempt: string | null }> = {};
        for (const s of subjects) {
            byId[s.id] = { subject: s, earned: 0, total: 0, lastAttempt: null };
        }
        for (const a of attempts) {
            const bucket = byId[a.subject_id];
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
        const earned = attempts.reduce((s, a) => s + Number(a.marks_awarded || 0), 0);
        const total = attempts.reduce((s, a) => s + Number(a.marks_total || 0), 0);
        return pct(earned, total);
    }, [attempts]);

    const topWeaknesses = useMemo(() => {
        const counts = weaknessCountsFromAttempts(attempts);
        return pickTopWeaknesses(counts, 6);
    }, [attempts]);

    const nextMock = useMemo(() => {
        const todayDate = new Date();
        const upcoming = (assessments || [])
            .filter((a) => a?.date && new Date(a.date + 'T00:00:00') >= todayDate)
            .sort((a, b) => new Date(a.date!).getTime() - new Date(b.date!).getTime());
        return upcoming[0] || null;
    }, [assessments]);

    return (
        <div className="p-6 lg:p-8 max-w-7xl mx-auto space-y-6 animate-fade-in">
            {/* Header with Greeting and Date */}
            <div className="flex flex-col lg:flex-row lg:items-start lg:justify-between gap-4">
                <div className="space-y-1">
                    <h1 className="text-2xl lg:text-3xl font-semibold text-foreground">
                        Good morning, Student! 👋
                    </h1>
                    <p className="text-muted-foreground flex items-center gap-2">
                        <Calendar className="h-4 w-4" />
                        {formattedDate}
                    </p>
                </div>
                <Link href="/daily">
                    <Button className="gap-2">
                        <Play className="h-4 w-4" />
                        Start Next Best Session
                        <ArrowRight className="h-4 w-4" />
                    </Button>
                </Link>
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
                {countdowns.map((item) => (
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
                                    <p className="text-2xl font-bold">{item.daysLeft}</p>
                                    <p className="text-xs text-muted-foreground">days</p>
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
                                    <TrendingUp className="h-6 w-6 text-success" />
                                    <span className="text-2xl font-bold text-success">+5%</span>
                                </div>
                                <p className="text-sm text-muted-foreground mt-1">vs last week</p>
                            </div>

                            {/* Streak */}
                            <div className="text-center sm:text-left">
                                <p className="text-sm text-muted-foreground mb-1">Study Streak</p>
                                <div className="flex items-center gap-2 justify-center sm:justify-start">
                                    <Flame className="h-6 w-6 text-warning" />
                                    <span className="text-2xl font-bold">7 days</span>
                                </div>
                                <p className="text-sm text-muted-foreground mt-1">Keep it up!</p>
                            </div>
                        </div>
                    </CardContent>
                </Card>

                {/* Next Best Session Button */}
                <Card className="card-shadow bg-primary text-primary-foreground hover:bg-primary/90 transition-colors cursor-pointer group">
                    <CardContent className="p-6 h-full flex flex-col items-center justify-center text-center">
                        <div className="p-3 rounded-full bg-primary-foreground/10 mb-3 group-hover:bg-primary-foreground/20 transition-colors">
                            <Zap className="h-8 w-8" />
                        </div>
                        <h3 className="text-lg font-semibold mb-1">Next Best Session</h3>
                        <p className="text-sm opacity-90 mb-3">Chemistry: Organic Compounds</p>
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
                        GCSE Key Dates 2026
                    </CardTitle>
                </CardHeader>
                <CardContent>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                        {GCSE_KEY_DATES_2026.map((d) => {
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
