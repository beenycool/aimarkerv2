'use client';

import { useState, useEffect, useMemo } from 'react';
import Link from 'next/link';
import { Card, CardContent, CardHeader, CardTitle } from '@/app/components/ui/card';
import { Button } from '@/app/components/ui/button';
import { Badge } from '@/app/components/ui/badge';
import { Progress } from '@/app/components/ui/progress';
import {
    Star,
    Play,
    CheckCircle2,
    Circle,
    ArrowRight,
    Flame,
    Target,
    Clock
} from 'lucide-react';
import { useStudentId } from '../../components/AuthProvider';
import {
    listSubjects,
    pickTopWeaknesses,
    weaknessCountsFromAttempts,
    listQuestionAttempts,
    getOrCreateTodayDailySession,
    completeSession
} from '../../services/studentOS';

interface DailyItem {
    id: string;
    question: string;
    topic: string;
    completed: boolean;
}

export default function DailyPage() {
    const studentId = useStudentId();
    const [loading, setLoading] = useState(true);
    const [session, setSession] = useState<{ id: string; items: DailyItem[] } | null>(null);
    const [weaknesses, setWeaknesses] = useState<{ label: string; count: number }[]>([]);

    useEffect(() => {
        if (!studentId) return;

        const loadData = async () => {
            setLoading(true);
            try {
                const attempts = await listQuestionAttempts(studentId, { limit: 200 });
                const counts = weaknessCountsFromAttempts(attempts || []);
                const topWeaknesses = pickTopWeaknesses(counts, 5);
                setWeaknesses(topWeaknesses);

                // Create daily items based on weaknesses
                const dailyItems: DailyItem[] = topWeaknesses.slice(0, 5).map((w, i) => ({
                    id: `item-${i}`,
                    question: `Practice question on ${w.label}`,
                    topic: w.label,
                    completed: false,
                }));

                // Try to get or create today's session
                try {
                    // @ts-expect-error - JS function parameter typed as never[]
                    const todaySession = await getOrCreateTodayDailySession(studentId, { items: dailyItems });
                    setSession({
                        id: todaySession.id,
                        items: todaySession.items || dailyItems,
                    });
                } catch {
                    // Fallback if session creation fails
                    setSession({
                        id: 'local-session',
                        items: dailyItems,
                    });
                }
            } catch (error) {
                console.error('Failed to load daily data:', error);
            } finally {
                setLoading(false);
            }
        };

        loadData();
    }, [studentId]);

    const toggleItem = (itemId: string) => {
        if (!session) return;
        setSession({
            ...session,
            items: session.items.map(item =>
                item.id === itemId ? { ...item, completed: !item.completed } : item
            ),
        });
    };

    const completedCount = session?.items.filter(i => i.completed).length || 0;
    const totalCount = session?.items.length || 5;
    const progressPercent = totalCount > 0 ? (completedCount / totalCount) * 100 : 0;

    const handleCompleteSession = async () => {
        if (!studentId || !session) return;

        try {
            await completeSession(studentId, session.id, {
                items_completed: completedCount,
                total_items: totalCount,
            });
            alert('Session completed! Great work! 🎉');
        } catch (error) {
            console.error('Failed to complete session:', error);
        }
    };

    return (
        <div className="p-6 lg:p-8 max-w-4xl mx-auto space-y-6 animate-fade-in">
            {/* Header */}
            <div className="text-center space-y-2">
                <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-primary/10 mb-4">
                    <Star className="h-8 w-8 text-primary" />
                </div>
                <h1 className="text-2xl lg:text-3xl font-semibold text-foreground">
                    Daily 5-a-Day
                </h1>
                <p className="text-muted-foreground max-w-md mx-auto">
                    Five quick questions targeting your biggest weaknesses. Takes about 15 minutes.
                </p>
            </div>

            {/* Progress Card */}
            <Card className="card-shadow">
                <CardContent className="p-6">
                    <div className="flex items-center justify-between mb-4">
                        <div className="flex items-center gap-3">
                            <Flame className="h-6 w-6 text-warning" />
                            <div>
                                <p className="font-semibold">Today&apos;s Progress</p>
                                <p className="text-sm text-muted-foreground">
                                    {completedCount} of {totalCount} completed
                                </p>
                            </div>
                        </div>
                        <div className="text-right">
                            <p className="text-3xl font-bold text-primary">{Math.round(progressPercent)}%</p>
                        </div>
                    </div>
                    <Progress value={progressPercent} className="h-3" />
                </CardContent>
            </Card>

            {/* Questions List */}
            <Card className="card-shadow">
                <CardHeader>
                    <CardTitle className="text-lg flex items-center gap-2">
                        <Target className="h-5 w-5 text-primary" />
                        Today&apos;s Questions
                    </CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                    {loading ? (
                        <p className="text-muted-foreground text-center py-4">Loading your questions...</p>
                    ) : session?.items.length === 0 ? (
                        <div className="text-center py-6">
                            <p className="text-muted-foreground mb-4">
                                Mark some papers first to generate personalized questions.
                            </p>
                            <Link href="/exam">
                                <Button>
                                    Start a Paper <ArrowRight className="h-4 w-4 ml-2" />
                                </Button>
                            </Link>
                        </div>
                    ) : (
                        <>
                            {session?.items.map((item, index) => (
                                <div
                                    key={item.id}
                                    className={`flex items-start gap-4 p-4 rounded-lg border transition-colors cursor-pointer ${item.completed
                                        ? 'bg-success/5 border-success/20'
                                        : 'bg-card hover:bg-secondary/50'
                                        }`}
                                    onClick={() => toggleItem(item.id)}
                                >
                                    <div className="flex-shrink-0 mt-0.5">
                                        {item.completed ? (
                                            <CheckCircle2 className="h-5 w-5 text-success" />
                                        ) : (
                                            <Circle className="h-5 w-5 text-muted-foreground" />
                                        )}
                                    </div>
                                    <div className="flex-1 min-w-0">
                                        <div className="flex items-center gap-2 mb-1">
                                            <span className="font-medium">Question {index + 1}</span>
                                            <Badge variant="secondary" className="text-xs">
                                                {item.topic}
                                            </Badge>
                                        </div>
                                        <p className={`text-sm ${item.completed ? 'text-muted-foreground line-through' : 'text-foreground'}`}>
                                            {item.question}
                                        </p>
                                    </div>
                                </div>
                            ))}

                            {/* Complete Button */}
                            <div className="pt-4 flex justify-center">
                                <Button
                                    size="lg"
                                    className="gap-2"
                                    onClick={handleCompleteSession}
                                    disabled={completedCount < totalCount}
                                >
                                    {completedCount >= totalCount ? (
                                        <>
                                            <CheckCircle2 className="h-5 w-5" />
                                            Complete Session
                                        </>
                                    ) : (
                                        <>
                                            <Clock className="h-5 w-5" />
                                            {totalCount - completedCount} remaining
                                        </>
                                    )}
                                </Button>
                            </div>
                        </>
                    )}
                </CardContent>
            </Card>

            {/* Tips */}
            <Card className="card-shadow bg-secondary/30">
                <CardContent className="p-4">
                    <p className="text-sm text-muted-foreground">
                        <strong className="text-foreground">💡 Tip:</strong> Focus on understanding, not speed.
                        It&apos;s okay to look things up — the goal is to learn, not memorize.
                    </p>
                </CardContent>
            </Card>
        </div>
    );
}
