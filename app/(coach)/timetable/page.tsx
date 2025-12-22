'use client';

import { useState, useEffect, useMemo } from 'react';
import Link from 'next/link';
import { Card, CardContent, CardHeader, CardTitle } from '@/app/components/ui/card';
import { Button } from '@/app/components/ui/button';
import { Badge } from '@/app/components/ui/badge';
import {
    Calendar,
    Clock,
    ChevronLeft,
    ChevronRight,
    Plus,
    BookOpen
} from 'lucide-react';
import { getOrCreateStudentId } from '../../services/studentId';
import { listSubjects, listSessions } from '../../services/studentOS';

interface Subject {
    id: string;
    name: string;
}

interface Session {
    id: string;
    subject_id?: string;
    session_type?: string;
    planned_for?: string;
    duration_minutes?: number;
    status?: string;
}

const DAYS = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];
const HOURS = Array.from({ length: 12 }, (_, i) => i + 8); // 8 AM to 8 PM

export default function TimetablePage() {
    const [studentId, setStudentId] = useState<string | null>(null);
    const [subjects, setSubjects] = useState<Subject[]>([]);
    const [sessions, setSessions] = useState<Session[]>([]);
    const [loading, setLoading] = useState(true);
    const [currentWeek, setCurrentWeek] = useState(0);

    useEffect(() => {
        setStudentId(getOrCreateStudentId());
    }, []);

    useEffect(() => {
        if (!studentId) return;

        const loadData = async () => {
            setLoading(true);
            try {
                const today = new Date();
                const weekStart = new Date(today);
                weekStart.setDate(today.getDate() - today.getDay() + 1 + (currentWeek * 7));
                const weekEnd = new Date(weekStart);
                weekEnd.setDate(weekStart.getDate() + 6);

                const [subs, sess] = await Promise.all([
                    listSubjects(studentId),
                    listSessions(studentId, {
                        fromDateISO: weekStart.toISOString().split('T')[0],
                        toDateISO: weekEnd.toISOString().split('T')[0],
                    }),
                ]);
                setSubjects(subs || []);
                setSessions(sess || []);
            } catch (error) {
                console.error('Failed to load timetable:', error);
            } finally {
                setLoading(false);
            }
        };

        loadData();
    }, [studentId, currentWeek]);

    const getSubjectName = (subjectId?: string) => {
        return subjects.find(s => s.id === subjectId)?.name || 'Study Session';
    };

    const weekDates = useMemo(() => {
        const today = new Date();
        const weekStart = new Date(today);
        weekStart.setDate(today.getDate() - today.getDay() + 1 + (currentWeek * 7));

        return DAYS.map((day, i) => {
            const date = new Date(weekStart);
            date.setDate(weekStart.getDate() + i);
            return {
                day,
                date: date.getDate(),
                month: date.toLocaleDateString('en-GB', { month: 'short' }),
                isToday: date.toDateString() === new Date().toDateString(),
                isoDate: date.toISOString().split('T')[0],
            };
        });
    }, [currentWeek]);

    const getSessionsForDay = (isoDate: string) => {
        return sessions.filter(s => s.planned_for === isoDate);
    };

    return (
        <div className="p-6 lg:p-8 max-w-7xl mx-auto space-y-6 animate-fade-in">
            {/* Header */}
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                <div className="space-y-1">
                    <h1 className="text-2xl lg:text-3xl font-semibold text-foreground flex items-center gap-3">
                        <Calendar className="h-7 w-7 text-primary" />
                        Timetable
                    </h1>
                    <p className="text-muted-foreground">
                        Plan your study sessions and track your schedule.
                    </p>
                </div>
                <div className="flex items-center gap-2">
                    <Button variant="outline" size="icon" onClick={() => setCurrentWeek(w => w - 1)}>
                        <ChevronLeft className="h-4 w-4" />
                    </Button>
                    <Button variant="outline" onClick={() => setCurrentWeek(0)}>
                        Today
                    </Button>
                    <Button variant="outline" size="icon" onClick={() => setCurrentWeek(w => w + 1)}>
                        <ChevronRight className="h-4 w-4" />
                    </Button>
                </div>
            </div>

            {/* Week View */}
            <Card className="card-shadow overflow-hidden">
                <CardContent className="p-0">
                    {loading ? (
                        <div className="p-8 text-center text-muted-foreground">
                            Loading timetable...
                        </div>
                    ) : (
                        <div className="grid grid-cols-7 divide-x divide-border">
                            {weekDates.map((dayInfo) => (
                                <div key={dayInfo.day} className="min-h-[300px]">
                                    {/* Day Header */}
                                    <div className={`p-3 border-b text-center ${dayInfo.isToday ? 'bg-primary/10' : 'bg-secondary/30'}`}>
                                        <div className="text-xs font-medium text-muted-foreground">{dayInfo.day}</div>
                                        <div className={`text-lg font-bold ${dayInfo.isToday ? 'text-primary' : ''}`}>
                                            {dayInfo.date}
                                        </div>
                                        <div className="text-xs text-muted-foreground">{dayInfo.month}</div>
                                    </div>

                                    {/* Sessions */}
                                    <div className="p-2 space-y-2">
                                        {getSessionsForDay(dayInfo.isoDate).map((session) => (
                                            <div
                                                key={session.id}
                                                className="p-2 rounded-lg bg-primary/10 border border-primary/20 text-xs"
                                            >
                                                <div className="font-medium text-primary truncate">
                                                    {getSubjectName(session.subject_id)}
                                                </div>
                                                <div className="text-muted-foreground flex items-center gap-1 mt-1">
                                                    <Clock className="h-3 w-3" />
                                                    {session.duration_minutes || 30}min
                                                </div>
                                                <Badge
                                                    variant="secondary"
                                                    className="mt-1 text-[10px]"
                                                >
                                                    {session.status || 'planned'}
                                                </Badge>
                                            </div>
                                        ))}

                                        {getSessionsForDay(dayInfo.isoDate).length === 0 && (
                                            <div className="text-xs text-muted-foreground text-center py-4">
                                                No sessions
                                            </div>
                                        )}
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}
                </CardContent>
            </Card>

            {/* Quick Actions */}
            <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
                <Card className="card-shadow">
                    <CardContent className="p-4">
                        <div className="flex items-center gap-3">
                            <div className="p-2 rounded-lg bg-primary/10">
                                <BookOpen className="h-5 w-5 text-primary" />
                            </div>
                            <div className="flex-1">
                                <p className="font-medium">This Week</p>
                                <p className="text-sm text-muted-foreground">
                                    {sessions.filter(s => s.status === 'done').length} / {sessions.length} sessions done
                                </p>
                            </div>
                        </div>
                    </CardContent>
                </Card>

                <Card className="card-shadow">
                    <CardContent className="p-4">
                        <div className="flex items-center gap-3">
                            <div className="p-2 rounded-lg bg-accent/10">
                                <Clock className="h-5 w-5 text-accent" />
                            </div>
                            <div className="flex-1">
                                <p className="font-medium">Total Time</p>
                                <p className="text-sm text-muted-foreground">
                                    {sessions.reduce((sum, s) => sum + (s.duration_minutes || 0), 0)} minutes
                                </p>
                            </div>
                        </div>
                    </CardContent>
                </Card>

                <Link href="/daily">
                    <Card className="card-shadow hover:card-shadow-hover transition-shadow cursor-pointer">
                        <CardContent className="p-4">
                            <div className="flex items-center gap-3">
                                <div className="p-2 rounded-lg bg-success/10">
                                    <Plus className="h-5 w-5 text-success" />
                                </div>
                                <div className="flex-1">
                                    <p className="font-medium">Start Session</p>
                                    <p className="text-sm text-muted-foreground">
                                        Begin your daily practice
                                    </p>
                                </div>
                            </div>
                        </CardContent>
                    </Card>
                </Link>
            </div>
        </div>
    );
}
