'use client';

import React, { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { useParams } from 'next/navigation';
import {
  ArrowLeft,
  ArrowRight,
  Flame,
  Play,
  Target,
  TrendingUp,
  Zap,
  BookOpen,
  Clock,
  BarChart3,
  Lightbulb,
  CheckCircle2,
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '../../../components/ui/card';
import { Button } from '../../../components/ui/button';
import { Badge } from '../../../components/ui/badge';
import { Progress } from '../../../components/ui/progress';
import { useStudentId } from '../../../components/AuthProvider';
import { bandFromPercent, pct } from '../../../services/dateUtils';
import {
  getSubject,
  listQuestionAttempts,
  pickTopWeaknesses,
  weaknessCountsFromAttempts,
} from '../../../services/studentOS';

// Skeleton loader component for better UX
function SkeletonCard() {
  return (
    <Card className="card-shadow animate-pulse">
      <CardHeader className="pb-2">
        <div className="h-4 bg-secondary rounded w-1/3" />
        <div className="h-6 bg-secondary rounded w-2/3 mt-2" />
      </CardHeader>
      <CardContent>
        <div className="h-2 bg-secondary rounded w-full mt-4" />
        <div className="h-3 bg-secondary rounded w-1/2 mt-3" />
      </CardContent>
    </Card>
  );
}

// Progress ring component for visual appeal
function ProgressRing({ value, size = 120, strokeWidth = 8 }) {
  const radius = (size - strokeWidth) / 2;
  const circumference = radius * 2 * Math.PI;
  const offset = circumference - (value / 100) * circumference;

  return (
    <div className="relative" style={{ width: size, height: size }}>
      <svg className="transform -rotate-90" width={size} height={size}>
        <circle
          className="text-secondary"
          strokeWidth={strokeWidth}
          stroke="currentColor"
          fill="transparent"
          r={radius}
          cx={size / 2}
          cy={size / 2}
        />
        <circle
          className="text-primary transition-all duration-700 ease-out"
          strokeWidth={strokeWidth}
          strokeDasharray={circumference}
          strokeDashoffset={offset}
          strokeLinecap="round"
          stroke="currentColor"
          fill="transparent"
          r={radius}
          cx={size / 2}
          cy={size / 2}
        />
      </svg>
      <div className="absolute inset-0 flex flex-col items-center justify-center">
        <span className="text-2xl font-bold text-foreground">{value}%</span>
        <span className="text-xs text-muted-foreground">Ready</span>
      </div>
    </div>
  );
}

// Weakness card with clean design
function WeaknessCard({ label, count, isTopPriority }) {
  return (
    <div
      className={`
        group relative p-4 rounded-xl border transition-all duration-200
        ${isTopPriority
          ? 'bg-gradient-to-br from-primary/5 to-primary/10 border-primary/20 hover:border-primary/40'
          : 'bg-card border-border hover:border-primary/30 hover:shadow-sm'
        }
      `}
    >
      {isTopPriority && (
        <Badge variant="secondary" className="absolute -top-2 -right-2 bg-primary text-primary-foreground text-xs px-2 py-0.5">
          Focus
        </Badge>
      )}
      <div className="flex items-start justify-between gap-3">
        <div className="flex-1 min-w-0">
          <h4 className="font-semibold text-foreground truncate">{label}</h4>
          <p className="text-sm text-muted-foreground mt-1">
            Appeared {count} time{count !== 1 ? 's' : ''} in your answers
          </p>
        </div>
        <div className="flex items-center justify-center w-10 h-10 rounded-full bg-secondary shrink-0">
          <span className="text-sm font-bold text-secondary-foreground">{count}×</span>
        </div>
      </div>
    </div>
  );
}

// Action item for "Revise Next" section
function ActionItem({ title, index }) {
  return (
    <div className="flex items-center gap-3 p-3 rounded-lg bg-secondary/50 hover:bg-secondary transition-colors">
      <div className="flex items-center justify-center w-7 h-7 rounded-full bg-primary/10 text-primary text-sm font-bold shrink-0">
        {index + 1}
      </div>
      <span className="text-sm font-medium text-foreground truncate">{title}</span>
      <ArrowRight className="h-4 w-4 text-muted-foreground ml-auto shrink-0 opacity-0 group-hover:opacity-100 transition-opacity" />
    </div>
  );
}

export default function SubjectDetailPage() {
  const params = useParams();
  const subjectId = params?.id;

  const studentId = useStudentId();
  const [subject, setSubject] = useState(null);
  const [attempts, setAttempts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    if (!studentId || !subjectId) return;

    let cancelled = false;
    (async () => {
      setLoading(true);
      setError(null);
      try {
        const [sub, atts] = await Promise.all([
          getSubject(studentId, subjectId),
          listQuestionAttempts(studentId, { subjectId, limit: 250 }),
        ]);
        if (cancelled) return;
        setSubject(sub);
        setAttempts(atts);
      } catch (e) {
        if (cancelled) return;
        setError(e?.message || 'Failed to load subject.');
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [studentId, subjectId]);

  const stats = useMemo(() => {
    const earned = attempts.reduce((s, a) => s + Number(a.marks_awarded || 0), 0);
    const total = attempts.reduce((s, a) => s + Number(a.marks_total || 0), 0);
    const percent = pct(earned, total);
    return {
      earned,
      total,
      percent,
      gradeBand: bandFromPercent(percent),
      attempts: attempts.length,
    };
  }, [attempts]);

  const topWeaknesses = useMemo(() => {
    const counts = weaknessCountsFromAttempts(attempts);
    return pickTopWeaknesses(counts, 6);
  }, [attempts]);

  const nextActions = useMemo(() => {
    return topWeaknesses.slice(0, 3).map((w) => ({
      title: w.label,
    }));
  }, [topWeaknesses]);

  if (loading) {
    return (
      <div className="p-6 lg:p-8 max-w-6xl mx-auto space-y-6 animate-fade-in">
        {/* Back link */}
        <div className="flex items-center gap-2 text-muted-foreground">
          <ArrowLeft className="h-4 w-4" />
          <span className="text-sm">Loading...</span>
        </div>

        {/* Header skeleton */}
        <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-4">
          <div className="space-y-2">
            <div className="h-8 bg-secondary rounded w-48 animate-pulse" />
            <div className="h-4 bg-secondary rounded w-32 animate-pulse" />
          </div>
          <div className="h-11 bg-secondary rounded-lg w-40 animate-pulse" />
        </div>

        {/* Cards skeleton */}
        <div className="grid lg:grid-cols-3 gap-6">
          <SkeletonCard />
          <div className="lg:col-span-2">
            <SkeletonCard />
          </div>
        </div>
        <SkeletonCard />
      </div>
    );
  }

  return (
    <div className="p-6 lg:p-8 max-w-6xl mx-auto space-y-8 animate-fade-in">
      {/* Back Navigation */}
      <Link
        href="/subjects"
        className="inline-flex items-center gap-2 text-muted-foreground hover:text-foreground transition-colors group"
      >
        <ArrowLeft className="h-4 w-4 group-hover:-translate-x-0.5 transition-transform" />
        <span className="text-sm font-medium">Back to Subjects</span>
      </Link>

      {/* Header Section */}
      <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-6">
        <div className="space-y-2">
          <div className="flex items-center gap-3">
            <div className="flex items-center justify-center w-12 h-12 rounded-xl bg-primary/10">
              <BookOpen className="h-6 w-6 text-primary" />
            </div>
            <div>
              <h1 className="text-2xl lg:text-3xl font-semibold text-foreground">
                {subject?.name || 'Subject'}
              </h1>
              <div className="flex items-center gap-2 mt-1">
                {subject?.exam_board && (
                  <Badge variant="outline" className="text-xs">
                    {subject.exam_board}
                  </Badge>
                )}
                {subject?.target_grade && (
                  <span className="flex items-center gap-1 text-sm text-muted-foreground">
                    <Target className="h-3.5 w-3.5" />
                    Target: {subject.target_grade}
                  </span>
                )}
              </div>
            </div>
          </div>
        </div>

        <Button asChild size="lg" className="shadow-md hover:shadow-lg transition-shadow">
          <Link href={`/daily?subject=${subjectId}`}>
            <Play className="h-4 w-4 mr-2" />
            Start Focus Session
          </Link>
        </Button>
      </div>

      {/* Error State */}
      {error && (
        <Card className="border-destructive/50 bg-destructive/5">
          <CardContent className="p-4">
            <p className="text-sm text-destructive flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-destructive" />
              {error}
            </p>
          </CardContent>
        </Card>
      )}

      {/* Quick Stats Row */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <Card className="card-shadow">
          <CardContent className="p-4 flex items-center gap-3">
            <div className="flex items-center justify-center w-10 h-10 rounded-lg bg-primary/10">
              <BarChart3 className="h-5 w-5 text-primary" />
            </div>
            <div>
              <p className="text-2xl font-bold text-foreground">{stats.gradeBand}</p>
              <p className="text-xs text-muted-foreground">Current Band</p>
            </div>
          </CardContent>
        </Card>

        <Card className="card-shadow">
          <CardContent className="p-4 flex items-center gap-3">
            <div className="flex items-center justify-center w-10 h-10 rounded-lg bg-accent/10">
              <TrendingUp className="h-5 w-5 text-accent" />
            </div>
            <div>
              <p className="text-2xl font-bold text-foreground">{stats.percent}%</p>
              <p className="text-xs text-muted-foreground">Accuracy</p>
            </div>
          </CardContent>
        </Card>

        <Card className="card-shadow">
          <CardContent className="p-4 flex items-center gap-3">
            <div className="flex items-center justify-center w-10 h-10 rounded-lg bg-success/10">
              <CheckCircle2 className="h-5 w-5 text-success" />
            </div>
            <div>
              <p className="text-2xl font-bold text-foreground">{stats.attempts}</p>
              <p className="text-xs text-muted-foreground">Questions Done</p>
            </div>
          </CardContent>
        </Card>

        <Card className="card-shadow">
          <CardContent className="p-4 flex items-center gap-3">
            <div className="flex items-center justify-center w-10 h-10 rounded-lg bg-warning/10">
              <Flame className="h-5 w-5 text-warning-foreground" />
            </div>
            <div>
              <p className="text-2xl font-bold text-foreground">{topWeaknesses.length}</p>
              <p className="text-xs text-muted-foreground">Weaknesses</p>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Main Content Grid */}
      <div className="grid lg:grid-cols-3 gap-6">
        {/* Readiness Score */}
        <Card className="card-shadow">
          <CardHeader className="pb-2">
            <CardTitle className="text-base flex items-center gap-2">
              <Zap className="h-4 w-4 text-primary" />
              Exam Readiness
            </CardTitle>
            <CardDescription>
              Based on your question performance
            </CardDescription>
          </CardHeader>
          <CardContent className="flex flex-col items-center py-6">
            <ProgressRing value={stats.percent} />
            <div className="mt-4 text-center">
              <p className="text-sm text-muted-foreground">
                Estimated band: <span className="font-semibold text-foreground">{stats.gradeBand}</span>
              </p>
              <p className="text-xs text-muted-foreground mt-1">
                {stats.earned}/{stats.total} marks earned
              </p>
            </div>
          </CardContent>
        </Card>

        {/* Priority Actions */}
        <Card className="lg:col-span-2 card-shadow">
          <CardHeader className="pb-2">
            <div className="flex items-start justify-between">
              <div>
                <CardTitle className="text-base flex items-center gap-2">
                  <Lightbulb className="h-4 w-4 text-primary" />
                  What to Focus On
                </CardTitle>
                <CardDescription>
                  Top priorities based on your weak areas
                </CardDescription>
              </div>
              <Button variant="ghost" size="sm" asChild>
                <Link href="/exam" className="text-primary hover:text-primary/80">
                  Mark more
                  <ArrowRight className="h-3.5 w-3.5 ml-1" />
                </Link>
              </Button>
            </div>
          </CardHeader>
          <CardContent>
            {nextActions.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-8 text-center">
                <div className="w-12 h-12 rounded-full bg-secondary flex items-center justify-center mb-3">
                  <CheckCircle2 className="h-6 w-6 text-muted-foreground" />
                </div>
                <p className="text-sm text-muted-foreground">
                  No weaknesses detected yet.
                </p>
                <p className="text-xs text-muted-foreground mt-1">
                  Complete some questions to see recommendations.
                </p>
                <Button variant="outline" size="sm" className="mt-4" asChild>
                  <Link href="/exam">Start Practice</Link>
                </Button>
              </div>
            ) : (
              <div className="space-y-2">
                {nextActions.map((action, idx) => (
                  <ActionItem key={action.title} title={action.title} index={idx} />
                ))}
                <div className="pt-3 mt-3 border-t">
                  <Button variant="default" className="w-full" asChild>
                    <Link href={`/daily?subject=${subjectId}`}>
                      <Play className="h-4 w-4 mr-2" />
                      Start Focused Practice
                    </Link>
                  </Button>
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Skill Weaknesses Section */}
      <Card className="card-shadow">
        <CardHeader>
          <div className="flex items-start justify-between">
            <div>
              <CardTitle className="text-base flex items-center gap-2">
                <Flame className="h-4 w-4 text-destructive" />
                Skill Weaknesses
              </CardTitle>
              <CardDescription>
                Recurring issues from your marked questions
              </CardDescription>
            </div>
            {topWeaknesses.length > 0 && (
              <Badge variant="secondary" className="text-xs">
                {topWeaknesses.length} identified
              </Badge>
            )}
          </div>
        </CardHeader>
        <CardContent>
          {topWeaknesses.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-12 text-center bg-secondary/30 rounded-xl">
              <div className="w-16 h-16 rounded-full bg-secondary flex items-center justify-center mb-4">
                <Flame className="h-8 w-8 text-muted-foreground opacity-50" />
              </div>
              <h3 className="font-medium text-foreground mb-1">No weaknesses yet</h3>
              <p className="text-sm text-muted-foreground max-w-sm">
                Complete a practice paper in the Exam section and your weaknesses will appear here automatically.
              </p>
              <Button variant="outline" className="mt-4" asChild>
                <Link href="/exam">
                  Go to Exam
                  <ArrowRight className="h-4 w-4 ml-2" />
                </Link>
              </Button>
            </div>
          ) : (
            <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-3">
              {topWeaknesses.map((w, idx) => (
                <WeaknessCard
                  key={w.label}
                  label={w.label}
                  count={w.count}
                  isTopPriority={idx === 0}
                />
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Quick Tip */}
      {topWeaknesses.length > 0 && (
        <Card className="bg-gradient-to-r from-primary/5 via-primary/10 to-accent/5 border-primary/20">
          <CardContent className="p-5 flex items-start gap-4">
            <div className="flex items-center justify-center w-10 h-10 rounded-lg bg-primary/10 shrink-0">
              <Lightbulb className="h-5 w-5 text-primary" />
            </div>
            <div>
              <h3 className="font-semibold text-foreground mb-1">Quick Tip</h3>
              <p className="text-sm text-muted-foreground">
                Focus on your top weakness first: <span className="font-medium text-foreground">{topWeaknesses[0]?.label}</span>. 
                Create a simple 3-step checklist to tackle it, then apply it to your next practice question.
              </p>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
