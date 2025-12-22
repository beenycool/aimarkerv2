'use client';

import { useState, useRef, useEffect } from 'react';
import Link from 'next/link';
import { Card, CardContent, CardHeader, CardTitle } from '@/app/components/ui/card';
import { Button } from '@/app/components/ui/button';
import { Input } from '@/app/components/ui/input';
import { Label } from '@/app/components/ui/label';
import { Badge } from '@/app/components/ui/badge';
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
} from '@/app/components/ui/dialog';
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from '@/app/components/ui/select';
import { cn } from '@/app/lib/utils';
import {
    Upload,
    FileText,
    Plus,
    Calendar as CalendarIcon,
    Sparkles,
    X,
    Trash2,
    Eye,
    Clock,
    Target,
    TrendingUp,
    Loader2,
    ClipboardCheck
} from 'lucide-react';
import { getOrCreateStudentId } from '../../services/studentId';
import { listAssessments, createAssessment, listSubjects } from '../../services/studentOS';

interface Assessment {
    id: string;
    fileName?: string;
    subject_id?: string;
    kind?: string;
    date?: string;
    score?: number;
    total?: number;
    notes?: string;
}

interface Subject {
    id: string;
    name: string;
}

const paperTypes = [
    'Past Paper',
    'Mock Exam',
    'Practice Test',
    'Topic Test',
];

const suggestedTopics: Record<string, string[]> = {
    Mathematics: ['Algebra', 'Geometry', 'Statistics', 'Number', 'Ratio', 'Probability', 'Trigonometry'],
    Biology: ['Cell Biology', 'Organisation', 'Infection', 'Bioenergetics', 'Homeostasis', 'Inheritance', 'Ecology'],
    Chemistry: ['Atomic Structure', 'Bonding', 'Quantitative', 'Chemical Changes', 'Energy', 'Organic', 'Analysis'],
    Physics: ['Energy', 'Electricity', 'Particle Model', 'Atomic Structure', 'Forces', 'Waves', 'Magnetism'],
    default: ['Topic 1', 'Topic 2', 'Topic 3', 'Topic 4', 'Topic 5'],
};

export default function AssessmentsPage() {
    const [studentId, setStudentId] = useState<string | null>(null);
    const [assessments, setAssessments] = useState<Assessment[]>([]);
    const [subjects, setSubjects] = useState<Subject[]>([]);
    const [loading, setLoading] = useState(true);
    const [dialogOpen, setDialogOpen] = useState(false);
    const [isAiLoading, setIsAiLoading] = useState(false);
    const [uploadedFile, setUploadedFile] = useState<File | null>(null);
    const fileInputRef = useRef<HTMLInputElement>(null);

    // Form state
    const [formSubject, setFormSubject] = useState('');
    const [formPaperType, setFormPaperType] = useState('');
    const [formDate, setFormDate] = useState('');
    const [formTopics, setFormTopics] = useState<string[]>([]);
    const [newTopic, setNewTopic] = useState('');

    useEffect(() => {
        setStudentId(getOrCreateStudentId());
    }, []);

    useEffect(() => {
        if (!studentId) return;

        const loadData = async () => {
            setLoading(true);
            try {
                const [asses, subs] = await Promise.all([
                    listAssessments(studentId),
                    listSubjects(studentId),
                ]);
                setAssessments(asses || []);
                setSubjects(subs || []);
            } catch (error) {
                console.error('Failed to load assessments:', error);
            } finally {
                setLoading(false);
            }
        };

        loadData();
    }, [studentId]);

    const resetForm = () => {
        setUploadedFile(null);
        setFormSubject('');
        setFormPaperType('');
        setFormDate('');
        setFormTopics([]);
        setNewTopic('');
    };

    const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (file) {
            if (file.type !== 'application/pdf') {
                alert('Please upload a PDF file.');
                return;
            }
            if (file.size > 20 * 1024 * 1024) {
                alert('Please upload a file smaller than 20MB.');
                return;
            }
            setUploadedFile(file);
        }
    };

    const handleAiSuggestTopics = async () => {
        if (!formSubject) {
            alert('Please select a subject first.');
            return;
        }

        setIsAiLoading(true);

        // Simulate AI processing
        await new Promise(resolve => setTimeout(resolve, 1500));

        const subjectName = subjects.find(s => s.id === formSubject)?.name || '';
        const topics = suggestedTopics[subjectName] || suggestedTopics.default;
        const randomTopics = topics.sort(() => 0.5 - Math.random()).slice(0, 4);
        setFormTopics(prev => Array.from(new Set([...prev, ...randomTopics])));

        setIsAiLoading(false);
    };

    const addTopic = () => {
        if (newTopic.trim() && !formTopics.includes(newTopic.trim())) {
            setFormTopics([...formTopics, newTopic.trim()]);
            setNewTopic('');
        }
    };

    const removeTopic = (topic: string) => {
        setFormTopics(formTopics.filter(t => t !== topic));
    };

    const handleSubmit = async () => {
        if (!studentId || !formSubject || !formPaperType || !formDate) {
            alert('Please fill in all required fields.');
            return;
        }

        try {
            const newAssessment = await createAssessment(studentId, {
                subject_id: formSubject,
                kind: formPaperType,
                date: formDate,
                notes: formTopics.join(', '),
            });

            setAssessments([newAssessment, ...assessments]);
            setDialogOpen(false);
            resetForm();
        } catch (error) {
            console.error('Failed to create assessment:', error);
        }
    };

    const deleteAssessment = (id: string) => {
        setAssessments(assessments.filter(a => a.id !== id));
        // Note: Would need to add deleteAssessment to studentOS.js
    };

    const getSubjectName = (subjectId?: string) => {
        return subjects.find(s => s.id === subjectId)?.name || 'Unknown Subject';
    };

    const pendingCount = assessments.filter(a => !a.score).length;
    const completedCount = assessments.filter(a => a.score !== undefined).length;
    const avgScore = completedCount > 0
        ? Math.round(assessments.filter(a => a.score !== undefined).reduce((acc, a) => acc + (a.score || 0), 0) / completedCount)
        : 0;

    return (
        <div className="p-6 lg:p-8 max-w-7xl mx-auto space-y-6 animate-fade-in">
            {/* Header */}
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                <div className="space-y-1">
                    <h1 className="text-2xl lg:text-3xl font-semibold text-foreground flex items-center gap-3">
                        <ClipboardCheck className="h-7 w-7 text-primary" />
                        Assessments
                    </h1>
                    <p className="text-muted-foreground">
                        Upload papers and track your assessment history.
                    </p>
                </div>
                <Button onClick={() => setDialogOpen(true)} className="gap-2">
                    <Plus className="h-4 w-4" />
                    Add Assessment
                </Button>
            </div>

            {/* Stats */}
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                <Card className="card-shadow">
                    <CardContent className="p-4">
                        <div className="flex items-center gap-3">
                            <div className="p-2 rounded-lg bg-primary/10">
                                <FileText className="h-5 w-5 text-primary" />
                            </div>
                            <div>
                                <p className="text-2xl font-semibold">{assessments.length}</p>
                                <p className="text-sm text-muted-foreground">Total</p>
                            </div>
                        </div>
                    </CardContent>
                </Card>
                <Card className="card-shadow">
                    <CardContent className="p-4">
                        <div className="flex items-center gap-3">
                            <div className="p-2 rounded-lg bg-warning/10">
                                <Clock className="h-5 w-5 text-warning" />
                            </div>
                            <div>
                                <p className="text-2xl font-semibold">{pendingCount}</p>
                                <p className="text-sm text-muted-foreground">Pending</p>
                            </div>
                        </div>
                    </CardContent>
                </Card>
                <Card className="card-shadow">
                    <CardContent className="p-4">
                        <div className="flex items-center gap-3">
                            <div className="p-2 rounded-lg bg-success/10">
                                <Target className="h-5 w-5 text-success" />
                            </div>
                            <div>
                                <p className="text-2xl font-semibold">{completedCount}</p>
                                <p className="text-sm text-muted-foreground">Completed</p>
                            </div>
                        </div>
                    </CardContent>
                </Card>
                <Card className="card-shadow">
                    <CardContent className="p-4">
                        <div className="flex items-center gap-3">
                            <div className="p-2 rounded-lg bg-accent/10">
                                <TrendingUp className="h-5 w-5 text-accent" />
                            </div>
                            <div>
                                <p className="text-2xl font-semibold">{avgScore}%</p>
                                <p className="text-sm text-muted-foreground">Avg Score</p>
                            </div>
                        </div>
                    </CardContent>
                </Card>
            </div>

            {/* Assessments List */}
            <div className="space-y-4">
                <h2 className="text-lg font-semibold">Your Assessments</h2>

                {loading ? (
                    <div className="text-center py-12">
                        <p className="text-muted-foreground">Loading assessments...</p>
                    </div>
                ) : assessments.length === 0 ? (
                    <Card className="card-shadow">
                        <CardContent className="p-8 text-center">
                            <FileText className="h-12 w-12 text-muted-foreground mx-auto mb-4 opacity-50" />
                            <h3 className="font-semibold mb-2">No assessments yet</h3>
                            <p className="text-sm text-muted-foreground mb-4">
                                Upload a past paper or add an assessment to get started.
                            </p>
                            <Button onClick={() => setDialogOpen(true)}>
                                <Plus className="h-4 w-4 mr-2" />
                                Add Your First Assessment
                            </Button>
                        </CardContent>
                    </Card>
                ) : (
                    <div className="grid gap-4">
                        {assessments.map((assessment) => (
                            <Card key={assessment.id} className="card-shadow hover:card-shadow-hover transition-shadow">
                                <CardContent className="p-4">
                                    <div className="flex flex-col lg:flex-row lg:items-center gap-4">
                                        {/* File Icon */}
                                        <div className="flex items-center gap-4 flex-1 min-w-0">
                                            <div className="w-12 h-12 rounded-lg bg-primary/10 flex items-center justify-center flex-shrink-0">
                                                <FileText className="h-6 w-6 text-primary" />
                                            </div>
                                            <div className="flex-1 min-w-0">
                                                <div className="flex items-center gap-2 flex-wrap">
                                                    <h3 className="font-semibold truncate">{getSubjectName(assessment.subject_id)}</h3>
                                                    <Badge variant="outline">{assessment.kind || 'Assessment'}</Badge>
                                                    <Badge
                                                        variant="secondary"
                                                        className={
                                                            assessment.score !== undefined
                                                                ? 'bg-success/10 text-success'
                                                                : 'bg-warning/10 text-warning-foreground'
                                                        }
                                                    >
                                                        {assessment.score !== undefined ? 'completed' : 'pending'}
                                                    </Badge>
                                                </div>
                                                <div className="flex items-center gap-2 mt-1 text-sm text-muted-foreground">
                                                    <CalendarIcon className="h-3.5 w-3.5" />
                                                    {assessment.date ? new Date(assessment.date).toLocaleDateString() : 'No date'}
                                                </div>
                                            </div>
                                        </div>

                                        {/* Score / Actions */}
                                        <div className="flex items-center gap-4">
                                            {assessment.score !== undefined && (
                                                <div className="text-right">
                                                    <p className="text-2xl font-bold text-primary">{assessment.score}%</p>
                                                    <p className="text-xs text-muted-foreground">
                                                        {assessment.total ? `/${assessment.total}` : ''}
                                                    </p>
                                                </div>
                                            )}
                                            <div className="flex gap-2">
                                                <Button
                                                    variant="ghost"
                                                    size="icon"
                                                    className="h-8 w-8 text-muted-foreground hover:text-destructive"
                                                    onClick={() => deleteAssessment(assessment.id)}
                                                >
                                                    <Trash2 className="h-4 w-4" />
                                                </Button>
                                            </div>
                                        </div>
                                    </div>
                                </CardContent>
                            </Card>
                        ))}
                    </div>
                )}
            </div>

            {/* Add Assessment Dialog */}
            <Dialog open={dialogOpen} onOpenChange={(open) => {
                setDialogOpen(open);
                if (!open) resetForm();
            }}>
                <DialogContent className="sm:max-w-2xl max-h-[90vh] overflow-y-auto">
                    <DialogHeader>
                        <DialogTitle>Add Assessment</DialogTitle>
                        <DialogDescription>
                            Upload a PDF or manually enter assessment details.
                        </DialogDescription>
                    </DialogHeader>

                    <div className="space-y-6 py-4">
                        {/* File Upload Area */}
                        <div className="space-y-3">
                            <Label>Upload PDF (Optional)</Label>
                            <div
                                className={cn(
                                    'border-2 border-dashed rounded-lg p-6 text-center cursor-pointer transition-colors',
                                    uploadedFile
                                        ? 'border-primary/50 bg-primary/5'
                                        : 'border-border hover:border-primary/30 hover:bg-secondary/50'
                                )}
                                onClick={() => fileInputRef.current?.click()}
                            >
                                <input
                                    ref={fileInputRef}
                                    type="file"
                                    accept=".pdf"
                                    className="hidden"
                                    onChange={handleFileUpload}
                                />
                                {uploadedFile ? (
                                    <div className="flex items-center justify-center gap-3">
                                        <FileText className="h-8 w-8 text-primary" />
                                        <div className="text-left">
                                            <p className="font-medium">{uploadedFile.name}</p>
                                            <p className="text-sm text-muted-foreground">
                                                {(uploadedFile.size / 1024 / 1024).toFixed(2)} MB
                                            </p>
                                        </div>
                                        <Button
                                            variant="ghost"
                                            size="icon"
                                            className="ml-2"
                                            onClick={(e) => {
                                                e.stopPropagation();
                                                setUploadedFile(null);
                                            }}
                                        >
                                            <X className="h-4 w-4" />
                                        </Button>
                                    </div>
                                ) : (
                                    <>
                                        <Upload className="h-10 w-10 text-muted-foreground mx-auto mb-3" />
                                        <p className="font-medium">Click to upload or drag and drop</p>
                                        <p className="text-sm text-muted-foreground">PDF files only, max 20MB</p>
                                    </>
                                )}
                            </div>
                        </div>

                        {/* Form Fields */}
                        <div className="grid sm:grid-cols-2 gap-4">
                            <div className="space-y-2">
                                <Label htmlFor="subject">Subject *</Label>
                                <Select value={formSubject} onValueChange={setFormSubject}>
                                    <SelectTrigger id="subject">
                                        <SelectValue placeholder="Select subject" />
                                    </SelectTrigger>
                                    <SelectContent>
                                        {subjects.map((subject) => (
                                            <SelectItem key={subject.id} value={subject.id}>
                                                {subject.name}
                                            </SelectItem>
                                        ))}
                                    </SelectContent>
                                </Select>
                            </div>

                            <div className="space-y-2">
                                <Label htmlFor="paperType">Paper Type *</Label>
                                <Select value={formPaperType} onValueChange={setFormPaperType}>
                                    <SelectTrigger id="paperType">
                                        <SelectValue placeholder="Select type" />
                                    </SelectTrigger>
                                    <SelectContent>
                                        {paperTypes.map((type) => (
                                            <SelectItem key={type} value={type}>
                                                {type}
                                            </SelectItem>
                                        ))}
                                    </SelectContent>
                                </Select>
                            </div>
                        </div>

                        <div className="space-y-2">
                            <Label htmlFor="date">Date *</Label>
                            <Input
                                id="date"
                                type="date"
                                value={formDate}
                                onChange={(e) => setFormDate(e.target.value)}
                            />
                        </div>

                        {/* Topics */}
                        <div className="space-y-3">
                            <div className="flex items-center justify-between">
                                <Label>Topics Covered</Label>
                                <Button
                                    variant="outline"
                                    size="sm"
                                    onClick={handleAiSuggestTopics}
                                    disabled={isAiLoading}
                                    className="gap-2"
                                >
                                    {isAiLoading ? (
                                        <Loader2 className="h-4 w-4 animate-spin" />
                                    ) : (
                                        <Sparkles className="h-4 w-4" />
                                    )}
                                    Let AI Suggest Topics
                                </Button>
                            </div>

                            {/* Topic Tags */}
                            <div className="flex flex-wrap gap-2 min-h-[40px] p-3 border rounded-lg bg-secondary/30">
                                {formTopics.length === 0 ? (
                                    <p className="text-sm text-muted-foreground">No topics added yet</p>
                                ) : (
                                    formTopics.map((topic) => (
                                        <Badge key={topic} variant="secondary" className="gap-1 pr-1">
                                            {topic}
                                            <button
                                                onClick={() => removeTopic(topic)}
                                                className="ml-1 p-0.5 rounded-full hover:bg-foreground/10"
                                            >
                                                <X className="h-3 w-3" />
                                            </button>
                                        </Badge>
                                    ))
                                )}
                            </div>

                            {/* Add Topic Input */}
                            <div className="flex gap-2">
                                <Input
                                    placeholder="Add a topic..."
                                    value={newTopic}
                                    onChange={(e) => setNewTopic(e.target.value)}
                                    onKeyDown={(e) => e.key === 'Enter' && (e.preventDefault(), addTopic())}
                                />
                                <Button variant="outline" onClick={addTopic} disabled={!newTopic.trim()}>
                                    Add
                                </Button>
                            </div>
                        </div>
                    </div>

                    <DialogFooter>
                        <Button variant="outline" onClick={() => setDialogOpen(false)}>
                            Cancel
                        </Button>
                        <Button onClick={handleSubmit}>
                            Add Assessment
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </div>
    );
}
