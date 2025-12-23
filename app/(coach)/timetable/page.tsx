'use client';

import { useState, useEffect, useMemo, useCallback } from 'react';
import Link from 'next/link';
import { Card, CardContent } from '@/app/components/ui/card';
import { Button } from '@/app/components/ui/button';
import { Badge } from '@/app/components/ui/badge';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/app/components/ui/tooltip';
import {
    Calendar,
    Clock,
    ChevronLeft,
    ChevronRight,
    Plus,
    BookOpen,
    Sparkles,
    Target,
    Zap,
    Edit3,
} from 'lucide-react';
import { useStudentId } from '../../components/AuthProvider';
import {
    listSubjects,
    listSessions,
    createSession,
    updateSession,
    deleteSession,
} from '../../services/studentOS';
import { SessionDialog } from '../../components/SessionDialog';
import { AIScheduleGenerator } from '../../components/AIScheduleGenerator';

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
    topic?: string;
    notes?: string;
}

const DAYS = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];

export default function TimetablePage() {
    const studentId = useStudentId();
    const [subjects, setSubjects] = useState<Subject[]>([]);
    const [sessions, setSessions] = useState<Session[]>([]);
    const [loading, setLoading] = useState(true);
    const [currentWeek, setCurrentWeek] = useState(0);

    // Dialog states
    const [sessionDialogOpen, setSessionDialogOpen] = useState(false);
    const [aiGeneratorOpen, setAiGeneratorOpen] = useState(false);
    const [editingSession, setEditingSession] = useState<Session | null>(null);
    const [defaultDate, setDefaultDate] = useState<string>('');

    const loadData = useCallback(async () => {
        if (!studentId) return;

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
    }, [studentId, currentWeek]);

    useEffect(() => {
        loadData();
    }, [loadData]);

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

    const getSessionTypeColor = (sessionType?: string) => {
        switch (sessionType) {
            case 'ai_planned':
                return 'bg-primary/20 border-primary/40 hover:bg-primary/30';
            case 'daily5':
                return 'bg-orange-400/20 border-orange-400/40 hover:bg-orange-400/30';
            default:
                return 'bg-primary/10 border-primary/20 hover:bg-primary/20';
        }
    };

    const getStatusBadgeVariant = (status?: string) => {
        switch (status) {
            case 'done':
                return 'default';
            case 'in_progress':
                return 'secondary';
            default:
                return 'outline';
        }
    };

    // Session CRUD handlers
    const handleOpenNewSession = (date?: string) => {
        setEditingSession(null);
        setDefaultDate(date || weekDates[0]?.isoDate || '');
        setSessionDialogOpen(true);
    };

    const handleOpenEditSession = (session: Session) => {
        setEditingSession(session);
        setDefaultDate(session.planned_for || '');
        setSessionDialogOpen(true);
    };

    const handleSaveSession = async (data: Partial<Session>) => {
        if (!studentId) return;

        if (editingSession?.id) {
            await updateSession(studentId, editingSession.id, data);
        } else {
            await createSession(studentId, data as any);
        }
        await loadData();
    };

    const handleDeleteSession = async (sessionId: string) => {
        if (!studentId) return;
        await deleteSession(studentId, sessionId);
        await loadData();
    };

    const handleScheduleApplied = () => {
        loadData();
    };

    return (
        <TooltipProvider>
            <div className="p-6 lg:p-8 max-w-7xl mx-auto space-y-6 animate-fade-in">
                {/* Header */}
                <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                    <div className="space-y-1">
                        <h1 className="text-2xl lg:text-3xl font-semibold text-foreground flex items-center gap-3">
                            <Calendar className="h-7 w-7 text-primary" />
                            Timetable
                        </h1>
                        <p className="text-muted-foreground">
                            AI-powered study scheduling based on your performance
                        </p>
                    </div>
                    <div className="flex items-center gap-2 flex-wrap">
                        {/* AI Generate Button - Primary Action */}
                        <Button
                            onClick={() => setAiGeneratorOpen(true)}
                            className="bg-gradient-to-r from-orange-500 to-amber-600 hover:from-orange-600 hover:to-amber-700 text-white shadow-lg"
                        >
                            <Sparkles className="h-4 w-4 mr-2" />
                            AI Plan Week
                        </Button>

                        {/* Manual Add */}
                        <Button variant="outline" onClick={() => handleOpenNewSession()}>
                            <Plus className="h-4 w-4 mr-1" />
                            Add Session
                        </Button>

                        {/* Week Navigation */}
                        <div className="flex items-center gap-1 ml-2">
                            <Button variant="ghost" size="icon" onClick={() => setCurrentWeek(w => w - 1)}>
                                <ChevronLeft className="h-4 w-4" />
                            </Button>
                            <Button variant="ghost" size="sm" onClick={() => setCurrentWeek(0)}>
                                Today
                            </Button>
                            <Button variant="ghost" size="icon" onClick={() => setCurrentWeek(w => w + 1)}>
                                <ChevronRight className="h-4 w-4" />
                            </Button>
                        </div>
                    </div>
                </div>

                {/* Week View */}
                <Card className="card-shadow overflow-hidden">
                    <CardContent className="p-0">
                        {loading ? (
                            <div className="p-8 text-center text-muted-foreground">
                                <div className="animate-pulse">Loading timetable...</div>
                            </div>
                        ) : (
                            <div className="grid grid-cols-7 divide-x divide-border">
                                {weekDates.map((dayInfo) => (
                                    <div key={dayInfo.day} className="min-h-[300px] flex flex-col">
                                        {/* Day Header */}
                                        <div
                                            className={`p-3 border-b text-center ${dayInfo.isToday
                                                ? 'bg-primary/10 border-primary/20'
                                                : 'bg-secondary/30'
                                                }`}
                                        >
                                            <div className="text-xs font-medium text-muted-foreground">
                                                {dayInfo.day}
                                            </div>
                                            <div
                                                className={`text-lg font-bold ${dayInfo.isToday ? 'text-primary' : ''
                                                    }`}
                                            >
                                                {dayInfo.date}
                                            </div>
                                            <div className="text-xs text-muted-foreground">
                                                {dayInfo.month}
                                            </div>
                                        </div>

                                        {/* Sessions */}
                                        <div className="p-2 space-y-2 flex-1">
                                            {getSessionsForDay(dayInfo.isoDate).map((session) => (
                                                <Tooltip key={session.id}>
                                                    <TooltipTrigger asChild>
                                                        <div
                                                            onClick={() => handleOpenEditSession(session)}
                                                            className={`p-2 rounded-lg border text-xs cursor-pointer transition-all ${getSessionTypeColor(
                                                                session.session_type
                                                            )}`}
                                                        >
                                                            <div className="font-medium text-foreground truncate flex items-center gap-1">
                                                                {session.session_type === 'ai_planned' && (
                                                                    <Sparkles className="h-3 w-3 text-primary shrink-0" />
                                                                )}
                                                                {getSubjectName(session.subject_id)}
                                                            </div>
                                                            {session.topic && (
                                                                <div className="text-muted-foreground truncate mt-0.5 text-[10px]">
                                                                    {session.topic}
                                                                </div>
                                                            )}
                                                            <div className="flex items-center justify-between mt-1">
                                                                <div className="text-muted-foreground flex items-center gap-1">
                                                                    <Clock className="h-3 w-3" />
                                                                    {session.duration_minutes || 30}m
                                                                </div>
                                                                <Badge
                                                                    variant={getStatusBadgeVariant(session.status)}
                                                                    className="text-[9px] px-1 py-0"
                                                                >
                                                                    {session.status || 'planned'}
                                                                </Badge>
                                                            </div>
                                                        </div>
                                                    </TooltipTrigger>
                                                    <TooltipContent side="right" className="max-w-[200px]">
                                                        <p className="font-medium">{getSubjectName(session.subject_id)}</p>
                                                        {session.topic && <p className="text-xs">{session.topic}</p>}
                                                        {session.notes && (
                                                            <p className="text-xs text-muted-foreground mt-1">
                                                                {session.notes}
                                                            </p>
                                                        )}
                                                        <p className="text-xs text-muted-foreground mt-1">
                                                            Click to edit
                                                        </p>
                                                    </TooltipContent>
                                                </Tooltip>
                                            ))}

                                            {getSessionsForDay(dayInfo.isoDate).length === 0 && (
                                                <button
                                                    onClick={() => handleOpenNewSession(dayInfo.isoDate)}
                                                    className="w-full text-xs text-muted-foreground text-center py-4 hover:bg-secondary/50 rounded-lg transition-colors border-2 border-dashed border-transparent hover:border-primary/20"
                                                >
                                                    <Plus className="h-4 w-4 mx-auto mb-1 opacity-50" />
                                                    Add session
                                                </button>
                                            )}
                                        </div>

                                        {/* Add to day button (when sessions exist) */}
                                        {getSessionsForDay(dayInfo.isoDate).length > 0 && (
                                            <div className="p-2 pt-0">
                                                <button
                                                    onClick={() => handleOpenNewSession(dayInfo.isoDate)}
                                                    className="w-full text-xs text-muted-foreground text-center py-1 hover:bg-secondary/50 rounded transition-colors"
                                                >
                                                    <Plus className="h-3 w-3 inline mr-1" />
                                                    Add
                                                </button>
                                            </div>
                                        )}
                                    </div>
                                ))}
                            </div>
                        )}
                    </CardContent>
                </Card>

                {/* Quick Stats */}
                <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4">
                    <Card className="card-shadow">
                        <CardContent className="p-4">
                            <div className="flex items-center gap-3">
                                <div className="p-2 rounded-lg bg-primary/10">
                                    <BookOpen className="h-5 w-5 text-primary" />
                                </div>
                                <div className="flex-1">
                                    <p className="font-medium">This Week</p>
                                    <p className="text-sm text-muted-foreground">
                                        {sessions.filter(s => s.status === 'done').length} /{' '}
                                        {sessions.length} done
                                    </p>
                                </div>
                            </div>
                        </CardContent>
                    </Card>

                    <Card className="card-shadow">
                        <CardContent className="p-4">
                            <div className="flex items-center gap-3">
                                <div className="p-2 rounded-lg bg-amber-500/10">
                                    <Clock className="h-5 w-5 text-amber-500" />
                                </div>
                                <div className="flex-1">
                                    <p className="font-medium">Total Time</p>
                                    <p className="text-sm text-muted-foreground">
                                        {Math.round(
                                            sessions.reduce((sum, s) => sum + (s.duration_minutes || 0), 0) / 60
                                        )}{' '}
                                        hours planned
                                    </p>
                                </div>
                            </div>
                        </CardContent>
                    </Card>

                    <Card className="card-shadow">
                        <CardContent className="p-4">
                            <div className="flex items-center gap-3">
                                <div className="p-2 rounded-lg bg-primary/20">
                                    <Sparkles className="h-5 w-5 text-primary" />
                                </div>
                                <div className="flex-1">
                                    <p className="font-medium">AI Sessions</p>
                                    <p className="text-sm text-muted-foreground">
                                        {sessions.filter(s => s.session_type === 'ai_planned').length} smart
                                        sessions
                                    </p>
                                </div>
                            </div>
                        </CardContent>
                    </Card>

                    <Link href="/daily">
                        <Card className="card-shadow hover:card-shadow-hover transition-shadow cursor-pointer h-full">
                            <CardContent className="p-4">
                                <div className="flex items-center gap-3">
                                    <div className="p-2 rounded-lg bg-primary/20">
                                        <Zap className="h-5 w-5 text-primary" />
                                    </div>
                                    <div className="flex-1">
                                        <p className="font-medium">Start Session</p>
                                        <p className="text-sm text-muted-foreground">Begin daily practice</p>
                                    </div>
                                </div>
                            </CardContent>
                        </Card>
                    </Link>
                </div>

                {/* Session Dialog */}
                <SessionDialog
                    open={sessionDialogOpen}
                    onOpenChange={setSessionDialogOpen}
                    session={editingSession}
                    subjects={subjects}
                    defaultDate={defaultDate}
                    onSave={handleSaveSession}
                    onDelete={handleDeleteSession}
                />

                {/* AI Schedule Generator */}
                {studentId && (
                    <AIScheduleGenerator
                        open={aiGeneratorOpen}
                        onOpenChange={setAiGeneratorOpen}
                        studentId={studentId}
                        weekDates={weekDates}
                        onScheduleApplied={handleScheduleApplied}
                    />
                )}
            </div>
        </TooltipProvider>
    );
}
