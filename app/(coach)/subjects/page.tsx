'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { Card, CardContent, CardHeader, CardTitle } from '@/app/components/ui/card';
import { Progress } from '@/app/components/ui/progress';
import { Badge } from '@/app/components/ui/badge';
import { Button } from '@/app/components/ui/button';
import {
    AlertDialog,
    AlertDialogAction,
    AlertDialogCancel,
    AlertDialogContent,
    AlertDialogDescription,
    AlertDialogFooter,
    AlertDialogHeader,
    AlertDialogTitle,
} from '@/app/components/ui/alert-dialog';
import {
    Plus,
    Trash2,
    TrendingUp,
    TrendingDown,
    Clock,
    Target,
    ChevronRight,
    BookOpen
} from 'lucide-react';
import { AddSubjectDialog } from '@/app/components/subjects/AddSubjectDialog';
import { getOrCreateStudentId } from '../../services/studentId';
import {
    listSubjects,
    createSubject,
    deleteSubject,
    listQuestionAttempts
} from '../../services/studentOS';
import { pct, bandFromPercent } from '../../services/dateUtils';

interface Subject {
    id: string;
    name: string;
    exam_board?: string;
    target_grade?: string;
}

interface SubjectWithStats extends Subject {
    currentGrade: string;
    progress: number;
    lastPracticed: string;
    trend: 'up' | 'down' | 'stable';
    confidence: number;
}

const getConfidenceColor = (confidence: number) => {
    if (confidence >= 75) return 'text-success';
    if (confidence >= 50) return 'text-warning-foreground';
    return 'text-destructive';
};

const getConfidenceBg = (confidence: number) => {
    if (confidence >= 75) return 'bg-success';
    if (confidence >= 50) return 'bg-warning';
    return 'bg-destructive';
};

export default function SubjectsPage() {
    const [studentId, setStudentId] = useState<string | null>(null);
    const [subjects, setSubjects] = useState<SubjectWithStats[]>([]);
    const [loading, setLoading] = useState(true);
    const [addDialogOpen, setAddDialogOpen] = useState(false);
    const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
    const [subjectToDelete, setSubjectToDelete] = useState<SubjectWithStats | null>(null);

    useEffect(() => {
        setStudentId(getOrCreateStudentId());
    }, []);

    useEffect(() => {
        if (!studentId) return;

        const loadData = async () => {
            setLoading(true);
            try {
                const [subs, attempts] = await Promise.all([
                    listSubjects(studentId),
                    listQuestionAttempts(studentId, { limit: 500 }),
                ]);

                // Calculate stats for each subject
                const subjectsWithStats: SubjectWithStats[] = (subs || []).map((s: Subject) => {
                    const subjectAttempts = (attempts || []).filter((a: { subject_id: string }) => a.subject_id === s.id);
                    const earned = subjectAttempts.reduce((sum: number, a: { marks_awarded?: number }) => sum + Number(a.marks_awarded || 0), 0);
                    const total = subjectAttempts.reduce((sum: number, a: { marks_total?: number }) => sum + Number(a.marks_total || 0), 0);
                    const confidence = pct(earned, total);
                    const lastAttempt = subjectAttempts[0]?.attempted_at;

                    return {
                        ...s,
                        currentGrade: bandFromPercent(confidence),
                        progress: confidence,
                        lastPracticed: lastAttempt
                            ? new Date(lastAttempt).toLocaleDateString()
                            : 'Never',
                        trend: confidence >= 70 ? 'up' : confidence >= 50 ? 'stable' : 'down',
                        confidence,
                    };
                });

                setSubjects(subjectsWithStats);
            } catch (error) {
                console.error('Failed to load subjects:', error);
            } finally {
                setLoading(false);
            }
        };

        loadData();
    }, [studentId]);

    const handleAddSubject = async (newSubject: { name: string; examBoard: string; targetGrade: string }) => {
        if (!studentId) return;

        try {
            const created = await createSubject(studentId, {
                name: newSubject.name,
                exam_board: newSubject.examBoard,
                target_grade: newSubject.targetGrade,
            });

            const subjectWithStats: SubjectWithStats = {
                ...created,
                currentGrade: String(Math.max(1, parseInt(newSubject.targetGrade) - 2)),
                progress: 0,
                lastPracticed: 'Never',
                trend: 'stable',
                confidence: 0,
            };

            setSubjects([...subjects, subjectWithStats]);
        } catch (error) {
            console.error('Failed to add subject:', error);
        }
    };

    const handleDeleteClick = (subject: SubjectWithStats, e: React.MouseEvent) => {
        e.preventDefault();
        e.stopPropagation();
        setSubjectToDelete(subject);
        setDeleteDialogOpen(true);
    };

    const handleConfirmDelete = async () => {
        if (!studentId || !subjectToDelete) return;

        try {
            await deleteSubject(studentId, subjectToDelete.id);
            setSubjects(subjects.filter((s) => s.id !== subjectToDelete.id));
            setSubjectToDelete(null);
        } catch (error) {
            console.error('Failed to delete subject:', error);
        }
        setDeleteDialogOpen(false);
    };

    return (
        <div className="p-6 lg:p-8 max-w-7xl mx-auto space-y-6 animate-fade-in">
            {/* Header */}
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                <div className="space-y-1">
                    <h1 className="text-2xl lg:text-3xl font-semibold text-foreground flex items-center gap-3">
                        <BookOpen className="h-7 w-7 text-primary" />
                        Subjects
                    </h1>
                    <p className="text-muted-foreground">
                        Manage your GCSE subjects and track progress.
                    </p>
                </div>
                <Button onClick={() => setAddDialogOpen(true)}>
                    <Plus className="h-4 w-4 mr-2" />
                    Add Subject
                </Button>
            </div>

            {/* Stats Summary */}
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                <Card className="card-shadow">
                    <CardContent className="p-4">
                        <p className="text-2xl font-bold">{subjects.length}</p>
                        <p className="text-sm text-muted-foreground">Total Subjects</p>
                    </CardContent>
                </Card>
                <Card className="card-shadow">
                    <CardContent className="p-4">
                        <p className="text-2xl font-bold text-success">
                            {subjects.filter(s => s.trend === 'up').length}
                        </p>
                        <p className="text-sm text-muted-foreground">Improving</p>
                    </CardContent>
                </Card>
                <Card className="card-shadow">
                    <CardContent className="p-4">
                        <p className="text-2xl font-bold">
                            {subjects.length > 0
                                ? Math.round(subjects.reduce((acc, s) => acc + s.progress, 0) / subjects.length)
                                : 0}%
                        </p>
                        <p className="text-sm text-muted-foreground">Avg Progress</p>
                    </CardContent>
                </Card>
                <Card className="card-shadow">
                    <CardContent className="p-4">
                        <p className="text-2xl font-bold text-warning-foreground">
                            {subjects.filter(s => s.trend === 'down').length}
                        </p>
                        <p className="text-sm text-muted-foreground">Need Attention</p>
                    </CardContent>
                </Card>
            </div>

            {/* Loading State */}
            {loading ? (
                <div className="text-center py-12">
                    <p className="text-muted-foreground">Loading subjects...</p>
                </div>
            ) : subjects.length === 0 ? (
                /* Empty State */
                <Card className="card-shadow">
                    <CardContent className="p-8 text-center">
                        <BookOpen className="h-12 w-12 text-muted-foreground mx-auto mb-4 opacity-50" />
                        <h3 className="font-semibold mb-2">No subjects yet</h3>
                        <p className="text-sm text-muted-foreground mb-4">
                            Add your GCSE subjects to start tracking your progress.
                        </p>
                        <Button onClick={() => setAddDialogOpen(true)}>
                            <Plus className="h-4 w-4 mr-2" />
                            Add Your First Subject
                        </Button>
                    </CardContent>
                </Card>
            ) : (
                /* Subjects Grid */
                <div className="grid sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
                    {subjects.map((subject) => (
                        <Link key={subject.id} href={`/subjects/${subject.id}`}>
                            <Card className="card-shadow hover:card-shadow-hover transition-all cursor-pointer group relative">
                                {/* Delete Button */}
                                <Button
                                    variant="ghost"
                                    size="icon"
                                    className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity h-8 w-8 text-muted-foreground hover:text-destructive z-10"
                                    onClick={(e) => handleDeleteClick(subject, e)}
                                >
                                    <Trash2 className="h-4 w-4" />
                                </Button>

                                <CardHeader className="pb-2 pr-10">
                                    <div className="flex items-start justify-between">
                                        <Badge variant="outline" className="text-xs">
                                            {subject.exam_board || 'No Board'}
                                        </Badge>
                                        <div className="flex items-center gap-1">
                                            {subject.trend === 'up' && (
                                                <TrendingUp className="h-4 w-4 text-success" />
                                            )}
                                            {subject.trend === 'down' && (
                                                <TrendingDown className="h-4 w-4 text-destructive" />
                                            )}
                                            {subject.trend === 'stable' && (
                                                <div className="w-4 h-0.5 bg-muted-foreground rounded" />
                                            )}
                                        </div>
                                    </div>
                                    <CardTitle className="text-base mt-2">{subject.name}</CardTitle>
                                </CardHeader>
                                <CardContent className="space-y-3">
                                    {/* Grades */}
                                    <div className="flex items-center justify-between">
                                        <div>
                                            <p className="text-xs text-muted-foreground">Current</p>
                                            <p className="text-2xl font-bold">{subject.currentGrade}</p>
                                        </div>
                                        <div className="text-center">
                                            <Target className="h-4 w-4 text-muted-foreground mx-auto" />
                                        </div>
                                        <div className="text-right">
                                            <p className="text-xs text-muted-foreground">Target</p>
                                            <p className="text-2xl font-bold text-primary">{subject.target_grade || '—'}</p>
                                        </div>
                                    </div>

                                    {/* Confidence */}
                                    <div className="space-y-1.5">
                                        <div className="flex justify-between text-sm">
                                            <span className="text-muted-foreground">Confidence</span>
                                            <span className={`font-medium ${getConfidenceColor(subject.confidence)}`}>
                                                {subject.confidence}%
                                            </span>
                                        </div>
                                        <div className="h-1.5 bg-secondary rounded-full overflow-hidden">
                                            <div
                                                className={`h-full rounded-full transition-all ${getConfidenceBg(subject.confidence)}`}
                                                style={{ width: `${subject.confidence}%` }}
                                            />
                                        </div>
                                    </div>

                                    {/* Last Practiced */}
                                    <div className="flex items-center justify-between text-xs text-muted-foreground pt-2 border-t">
                                        <span className="flex items-center gap-1">
                                            <Clock className="h-3 w-3" />
                                            {subject.lastPracticed}
                                        </span>
                                        <ChevronRight className="h-4 w-4 group-hover:translate-x-0.5 transition-transform" />
                                    </div>
                                </CardContent>
                            </Card>
                        </Link>
                    ))}

                    {/* Add Subject Card */}
                    <Card
                        className="card-shadow border-dashed hover:border-primary/50 transition-colors cursor-pointer flex items-center justify-center min-h-[200px]"
                        onClick={() => setAddDialogOpen(true)}
                    >
                        <CardContent className="text-center">
                            <div className="w-12 h-12 rounded-full bg-secondary flex items-center justify-center mx-auto mb-3">
                                <Plus className="h-6 w-6 text-muted-foreground" />
                            </div>
                            <p className="font-medium text-muted-foreground">Add Subject</p>
                        </CardContent>
                    </Card>
                </div>
            )}

            {/* Add Subject Dialog */}
            <AddSubjectDialog
                open={addDialogOpen}
                onOpenChange={setAddDialogOpen}
                onAdd={handleAddSubject}
                existingSubjects={subjects.map((s) => s.name)}
            />

            {/* Delete Confirmation Dialog */}
            <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
                <AlertDialogContent>
                    <AlertDialogHeader>
                        <AlertDialogTitle>Remove Subject</AlertDialogTitle>
                        <AlertDialogDescription>
                            Are you sure you want to remove {subjectToDelete?.name} from your study plan?
                            This will delete all progress data for this subject.
                        </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                        <AlertDialogCancel>Cancel</AlertDialogCancel>
                        <AlertDialogAction onClick={handleConfirmDelete} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
                            Remove
                        </AlertDialogAction>
                    </AlertDialogFooter>
                </AlertDialogContent>
            </AlertDialog>
        </div>
    );
}
