'use client';

import { useState, useRef, useEffect } from 'react';
import { Card, CardContent } from '@/app/components/ui/card';
import { Button } from '@/app/components/ui/button';
import { Input } from '@/app/components/ui/input';
import { Label } from '@/app/components/ui/label';
import { Badge } from '@/app/components/ui/badge';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/app/components/ui/tabs';
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
    Check,
    AlertTriangle,
    Paperclip,
    Clock,
    Target,
    TrendingUp,
    Loader2,
    ClipboardCheck,
    CalendarDays,
    Timer,
    MapPin,
    Import,
    Edit2,
} from 'lucide-react';
import { toast } from 'sonner';
import { useStudentId } from '../../components/AuthProvider';
import {
    listAssessments,
    createAssessment,
    deleteAssessment,
    uploadAssessmentFile,
    deleteAssessmentFiles,
    listSubjects,
    listUpcomingExams,
    createUpcomingExam,
    updateUpcomingExam,
    deleteUpcomingExam,
    bulkCreateUpcomingExams,
} from '../../services/studentOS';
import { AIService } from '../../services/AIService';

interface Assessment {
    id: string;
    fileName?: string;
    subject_id?: string;
    kind?: string;
    date?: string;
    score?: number;
    total?: number;
    notes?: string;
    attachments?: {
        path: string;
        name: string;
        size: number;
        type?: string;
    }[];
}

interface UpcomingExam {
    id: string;
    subject_id?: string;
    title: string;
    exam_date: string;
    exam_time?: string;
    duration_minutes?: number;
    location?: string;
    notes?: string;
    topics?: string[];
    source?: string;
    type?: 'real' | 'mock';
}

interface Subject {
    id: string;
    name: string;
}

type UploadStatus = 'uploading' | 'uploaded' | 'error';

interface UploadItem {
    id: string;
    file: File;
    status: UploadStatus;
    path?: string;
    error?: string;
}

const MAX_FILE_SIZE = 20 * 1024 * 1024;
const normalizeSubjectName = (value: string) =>
    value.toLowerCase().replace(/[^a-z0-9]+/g, ' ').trim();

const paperTypes = [
    { label: 'Past Paper', value: 'past_paper' },
    { label: 'Mock Exam', value: 'mock' },
    { label: 'Quiz', value: 'quiz' },
];

const paperTypeLabels: Record<string, string> = {
    past_paper: 'Past Paper',
    mock: 'Mock Exam',
    quiz: 'Quiz',
    'Past Paper': 'Past Paper',
    'Mock Exam': 'Mock Exam',
    'Practice Test': 'Practice Test',
    'Topic Test': 'Topic Test',
};

const suggestedTopics: Record<string, string[]> = {
    Mathematics: ['Algebra', 'Geometry', 'Statistics', 'Number', 'Ratio', 'Probability', 'Trigonometry'],
    Biology: ['Cell Biology', 'Organisation', 'Infection', 'Bioenergetics', 'Homeostasis', 'Inheritance', 'Ecology'],
    Chemistry: ['Atomic Structure', 'Bonding', 'Quantitative', 'Chemical Changes', 'Energy', 'Organic', 'Analysis'],
    Physics: ['Energy', 'Electricity', 'Particle Model', 'Atomic Structure', 'Forces', 'Waves', 'Magnetism'],
    default: ['Topic 1', 'Topic 2', 'Topic 3', 'Topic 4', 'Topic 5'],
};

export default function AssessmentsPage() {
    const studentId = useStudentId();
    const [assessments, setAssessments] = useState<Assessment[]>([]);
    const [subjects, setSubjects] = useState<Subject[]>([]);
    const [loading, setLoading] = useState(true);
    const [dialogOpen, setDialogOpen] = useState(false);
    const [isSuggesting, setIsSuggesting] = useState(false);
    const [isDragging, setIsDragging] = useState(false);
    const [uploadedFiles, setUploadedFiles] = useState<UploadItem[]>([]);
    const fileInputRef = useRef<HTMLInputElement>(null);
    const dragCounter = useRef(0);
    const cleanupPendingRef = useRef(false);
    const shouldCleanupUploadsRef = useRef(true);
    const pendingRemovalRef = useRef(new Set<string>());

    // Form state
    const [formSubject, setFormSubject] = useState('');
    const [formPaperType, setFormPaperType] = useState('');
    const [formDate, setFormDate] = useState('');
    const [formTopics, setFormTopics] = useState<string[]>([]);
    const [newTopic, setNewTopic] = useState('');
    const [formErrors, setFormErrors] = useState({
        subject: false,
        paperType: false,
        date: false,
    });
    const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
    const [assessmentToDelete, setAssessmentToDelete] = useState<Assessment | null>(null);
    const [isDeleting, setIsDeleting] = useState(false);

    // Tab state
    const [activeTab, setActiveTab] = useState('future');

    // Future Exams state
    const [upcomingExams, setUpcomingExams] = useState<UpcomingExam[]>([]);
    const [addExamDialogOpen, setAddExamDialogOpen] = useState(false);
    const [importDialogOpen, setImportDialogOpen] = useState(false);
    const [isParsing, setIsParsing] = useState(false);
    const [parsedExams, setParsedExams] = useState<UpcomingExam[]>([]);
    const [examToDelete, setExamToDelete] = useState<UpcomingExam | null>(null);
    const [examDeleteDialogOpen, setExamDeleteDialogOpen] = useState(false);
    const importFileInputRef = useRef<HTMLInputElement>(null);

    // Add Exam form state
    const [examFormTitle, setExamFormTitle] = useState('');
    const [examFormSubject, setExamFormSubject] = useState('');
    const [examFormDate, setExamFormDate] = useState('');
    const [examFormTime, setExamFormTime] = useState('');
    const [examFormDuration, setExamFormDuration] = useState('');
    const [examFormLocation, setExamFormLocation] = useState('');
    const [examFormNotes, setExamFormNotes] = useState('');
    const [examFormType, setExamFormType] = useState('real');
    const [upcomingFilter, setUpcomingFilter] = useState<'all' | 'real' | 'mock'>('all');
    const [examFormErrors, setExamFormErrors] = useState({ title: false, date: false });

    useEffect(() => {
        if (!studentId) return;

        const loadData = async () => {
            setLoading(true);
            try {
                const [asses, subs, exams] = await Promise.all([
                    listAssessments(studentId),
                    listSubjects(studentId),
                    listUpcomingExams(studentId),
                ]);
                setAssessments(asses || []);
                setSubjects(subs || []);
                setUpcomingExams(exams || []);
            } catch (error) {
                console.error('Failed to load data:', error);
                toast.error('Failed to load data.');
            } finally {
                setLoading(false);
            }
        };

        loadData();
    }, [studentId]);

    const resetForm = () => {
        setUploadedFiles([]);
        setFormSubject('');
        setFormPaperType('');
        setFormDate('');
        setFormTopics([]);
        setNewTopic('');
        setFormErrors({ subject: false, paperType: false, date: false });
        setIsSuggesting(false);
        setIsDragging(false);
        pendingRemovalRef.current.clear();
    };

    const resetExamForm = () => {
        setExamFormTitle('');
        setExamFormSubject('');
        setExamFormDate('');
        setExamFormTime('');
        setExamFormDuration('');
        setExamFormLocation('');
        setExamFormNotes('');
        setExamFormType('real');
        setExamFormErrors({ title: false, date: false });
    };

    const handleImportSchedule = async (file: File) => {
        if (!studentId) return;
        setIsParsing(true);
        setParsedExams([]);
        try {
            const result = await AIService.parseExamSchedule(file, studentId, subjects);
            const subjectIndex = subjects
                .map((subject) => ({
                    id: subject.id,
                    name: subject.name,
                    normalized: normalizeSubjectName(subject.name || ''),
                }))
                .filter((subject) => subject.normalized);
            const resolveSubjectId = (candidate: string) => {
                if (!candidate) return undefined;
                const normalized = normalizeSubjectName(candidate);
                if (!normalized) return undefined;
                const exact = subjectIndex.find((subject) => subject.normalized === normalized);
                if (exact) return exact.id;
                const partial = subjectIndex.find((subject) =>
                    normalized.includes(subject.normalized) || subject.normalized.includes(normalized)
                );
                return partial?.id;
            };
            const mappedExams: UpcomingExam[] = (result.exams || []).map((e: any, i: number) => {
                const subjectCandidate = e.subject || e.title || '';
                const subject_id = resolveSubjectId(subjectCandidate);
                return {
                    ...e,
                    id: `temp-${i}`,
                    title: e.title || 'Untitled Exam',
                    exam_date: e.exam_date || e.date,
                    subject_id,
                };
            });
            const filteredExams = subjectIndex.length > 0
                ? mappedExams.filter((exam) => exam.subject_id)
                : mappedExams;
            setParsedExams(filteredExams);
            const message = subjectIndex.length > 0 && filteredExams.length !== mappedExams.length
                ? `Parsed ${mappedExams.length} exams, kept ${filteredExams.length} matching your subjects`
                : `Parsed ${filteredExams.length} exams from schedule`;
            toast.success(message);
        } catch (error) {
            console.error('Failed to parse schedule:', error);
            toast.error('Failed to parse exam schedule. Please try again.');
        } finally {
            setIsParsing(false);
        }
    };

    const handleConfirmImport = async () => {
        if (!studentId || !parsedExams.length) return;
        try {
            const imported = await bulkCreateUpcomingExams(studentId, parsedExams);
            setUpcomingExams(prev => [...prev, ...imported].sort((a, b) =>
                new Date(a.exam_date).getTime() - new Date(b.exam_date).getTime()
            ));
            setImportDialogOpen(false);
            setParsedExams([]);
            toast.success(`Imported ${imported.length} exams`);
        } catch (error) {
            console.error('Failed to import exams:', error);
            toast.error('Failed to import exams.');
        }
    };

    const handleAddExam = async () => {
        if (!studentId || !examFormTitle || !examFormDate) {
            setExamFormErrors({ title: !examFormTitle, date: !examFormDate });
            toast.error('Please fill in required fields.');
            return;
        }
        try {
            const newExam = await createUpcomingExam(studentId, {
                title: examFormTitle,
                subject_id: examFormSubject || undefined,
                exam_date: examFormDate,
                exam_time: examFormTime || undefined,
                duration_minutes: examFormDuration ? parseInt(examFormDuration) : undefined,
                location: examFormLocation || undefined,
                notes: examFormNotes || undefined,
                type: examFormType as 'real' | 'mock',
            });
            setUpcomingExams(prev => [...prev, newExam].sort((a, b) =>
                new Date(a.exam_date).getTime() - new Date(b.exam_date).getTime()
            ));
            setAddExamDialogOpen(false);
            resetExamForm();
            toast.success('Exam added successfully');
        } catch (error) {
            console.error('Failed to add exam:', error);
            toast.error('Failed to add exam.');
        }
    };

    const handleDeleteExam = async () => {
        if (!studentId || !examToDelete) return;
        try {
            await deleteUpcomingExam(studentId, examToDelete.id);
            setUpcomingExams(prev => prev.filter(e => e.id !== examToDelete.id));
            setExamDeleteDialogOpen(false);
            setExamToDelete(null);
            toast.success('Exam deleted');
        } catch (error) {
            console.error('Failed to delete exam:', error);
            toast.error('Failed to delete exam.');
        }
    };

    const getDaysUntil = (dateStr: string) => {
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        const examDate = new Date(dateStr);
        examDate.setHours(0, 0, 0, 0);
        return Math.ceil((examDate.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
    };

    const formatFileSize = (size: number) => {
        if (size < 1024) return `${size} B`;
        if (size < 1024 * 1024) return `${(size / 1024).toFixed(1)} KB`;
        return `${(size / 1024 / 1024).toFixed(2)} MB`;
    };

    const buildFileId = (file: File) => `${file.name}-${file.size}-${file.lastModified}`;

    const isPdfFile = (file: File) =>
        file.type === 'application/pdf' || file.name.toLowerCase().endsWith('.pdf');

    const uploadFile = async (item: UploadItem) => {
        if (!studentId) {
            setUploadedFiles((prev) => prev.map((f) => (
                f.id === item.id ? { ...f, status: 'error', error: 'Sign in required.' } : f
            )));
            toast.error('Please sign in to upload files.');
            return;
        }

        try {
            const { path } = await uploadAssessmentFile(studentId, item.file);
            if (cleanupPendingRef.current || pendingRemovalRef.current.has(item.id)) {
                pendingRemovalRef.current.delete(item.id);
                await deleteAssessmentFiles([path]);
                return;
            }
            setUploadedFiles((prev) => prev.map((f) => (
                f.id === item.id ? { ...f, status: 'uploaded', path } : f
            )));
        } catch (error) {
            console.error('Failed to upload assessment file:', error);
            setUploadedFiles((prev) => prev.map((f) => (
                f.id === item.id ? { ...f, status: 'error', error: 'Upload failed.' } : f
            )));
            toast.error('Failed to upload a PDF.');
        }
    };

    const addFiles = (incoming: FileList | File[]) => {
        const files = Array.from(incoming || []);
        if (!files.length) return;

        const existingIds = new Set(uploadedFiles.map((item) => item.id));
        const nextItems: UploadItem[] = [];
        let rejectedType = 0;
        let rejectedSize = 0;
        let duplicates = 0;

        for (const file of files) {
            const id = buildFileId(file);
            if (existingIds.has(id)) {
                duplicates += 1;
                continue;
            }
            if (!isPdfFile(file)) {
                rejectedType += 1;
                continue;
            }
            if (file.size > MAX_FILE_SIZE) {
                rejectedSize += 1;
                continue;
            }
            pendingRemovalRef.current.delete(id);
            existingIds.add(id);
            nextItems.push({ id, file, status: 'uploading' });
        }

        if (rejectedType) {
            toast.error('Only PDF files are allowed.');
        }
        if (rejectedSize) {
            toast.error('Some files are larger than 20MB.');
        }
        if (duplicates) {
            toast.message('Some files were already added.');
        }

        if (!nextItems.length) return;
        setUploadedFiles((prev) => [...prev, ...nextItems]);
        nextItems.forEach((item) => {
            void uploadFile(item);
        });
    };

    const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
        if (e.target.files?.length) {
            addFiles(e.target.files);
        }
        e.target.value = '';
    };

    const handleDragEnter = (event: React.DragEvent<HTMLDivElement>) => {
        if (!event.dataTransfer?.types?.includes('Files')) return;
        event.preventDefault();
        dragCounter.current += 1;
        setIsDragging(true);
    };

    const handleDragLeave = (event: React.DragEvent<HTMLDivElement>) => {
        if (!event.dataTransfer?.types?.includes('Files')) return;
        event.preventDefault();
        dragCounter.current = Math.max(0, dragCounter.current - 1);
        if (dragCounter.current === 0) {
            setIsDragging(false);
        }
    };

    const handleDragOver = (event: React.DragEvent<HTMLDivElement>) => {
        if (!event.dataTransfer?.types?.includes('Files')) return;
        event.preventDefault();
    };

    const handleDrop = (event: React.DragEvent<HTMLDivElement>) => {
        if (!event.dataTransfer?.types?.includes('Files')) return;
        event.preventDefault();
        dragCounter.current = 0;
        setIsDragging(false);
        if (event.dataTransfer.files?.length) {
            addFiles(event.dataTransfer.files);
        }
    };

    const handlePaste = (event: React.ClipboardEvent<HTMLDivElement>) => {
        const files = event.clipboardData?.files;
        if (!files?.length) return;
        event.preventDefault();
        addFiles(files);
    };

    const handleRemoveFile = async (id: string) => {
        const item = uploadedFiles.find((file) => file.id === id);
        if (!item) return;

        if (item.status === 'uploading') {
            pendingRemovalRef.current.add(id);
            setUploadedFiles((prev) => prev.filter((file) => file.id !== id));
            return;
        }

        setUploadedFiles((prev) => prev.filter((file) => file.id !== id));

        if (item.status === 'uploaded' && item.path) {
            try {
                await deleteAssessmentFiles([item.path]);
            } catch (error) {
                console.error('Failed to remove uploaded file:', error);
                toast.error('Failed to remove the uploaded file.');
            }
        }
    };

    const handleRetryUpload = (id: string) => {
        const item = uploadedFiles.find((file) => file.id === id);
        if (!item) return;

        setUploadedFiles((prev) => prev.map((file) => (
            file.id === id ? { ...file, status: 'uploading', error: undefined } : file
        )));
        void uploadFile({ ...item, status: 'uploading', error: undefined });
    };

    const handleSuggestTopics = async () => {
        if (!formSubject) {
            setFormErrors((prev) => ({ ...prev, subject: true }));
            toast.error('Please select a subject first.');
            return;
        }

        setIsSuggesting(true);

        const subjectName = subjects.find(s => s.id === formSubject)?.name || '';
        const topics = suggestedTopics[subjectName] || suggestedTopics.default;
        const nextTopics = topics.filter((topic) => !formTopics.includes(topic)).slice(0, 4);
        setFormTopics(prev => Array.from(new Set([...prev, ...nextTopics])));

        setIsSuggesting(false);
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
            setFormErrors({
                subject: !formSubject,
                paperType: !formPaperType,
                date: !formDate,
            });
            toast.error('Please fill in all required fields.');
            return;
        }

        if (uploadedFiles.some((file) => file.status === 'uploading')) {
            toast.error('Please wait for uploads to finish.');
            return;
        }

        if (uploadedFiles.some((file) => file.status === 'error')) {
            toast.error('Remove or retry failed uploads before saving.');
            return;
        }

        try {
            const attachments = uploadedFiles
                .filter((file) => file.status === 'uploaded' && file.path)
                .map((file) => ({
                    path: file.path as string,
                    name: file.file.name,
                    size: file.file.size,
                    type: file.file.type || 'application/pdf',
                }));
            const newAssessment = await createAssessment(studentId, {
                subject_id: formSubject,
                kind: formPaperType,
                date: formDate,
                notes: formTopics.join(', '),
                attachments,
            });

            setAssessments([newAssessment, ...assessments]);
            shouldCleanupUploadsRef.current = false;
            setDialogOpen(false);
            resetForm();
        } catch (error) {
            console.error('Failed to create assessment:', error);
            toast.error('Failed to create assessment.');
        }
    };

    const handleConfirmDelete = async () => {
        if (!studentId || !assessmentToDelete) return;
        setIsDeleting(true);
        try {
            await deleteAssessment(studentId, assessmentToDelete.id, assessmentToDelete.attachments || []);
            setAssessments((prev) => prev.filter((a) => a.id !== assessmentToDelete.id));
            setDeleteDialogOpen(false);
            setAssessmentToDelete(null);
        } catch (error) {
            console.error('Failed to delete assessment:', error);
            toast.error('Failed to delete assessment.');
        } finally {
            setIsDeleting(false);
        }
    };

    const cleanupUploadedPaths = async (paths: string[]) => {
        if (!paths.length) return;
        try {
            await deleteAssessmentFiles(paths);
        } catch (error) {
            console.error('Failed to clean up uploaded files:', error);
            toast.error('Failed to clean up uploaded files.');
        }
    };

    const handleDialogOpenChange = (open: boolean) => {
        setDialogOpen(open);
        if (open) {
            shouldCleanupUploadsRef.current = true;
            cleanupPendingRef.current = false;
            return;
        }

        if (shouldCleanupUploadsRef.current) {
            cleanupPendingRef.current = true;
            const uploadedPaths = uploadedFiles
                .filter((file) => file.status === 'uploaded' && file.path)
                .map((file) => file.path as string);
            void cleanupUploadedPaths(uploadedPaths);
        }

        resetForm();
        shouldCleanupUploadsRef.current = true;
    };

    const getSubjectName = (subjectId?: string) => {
        return subjects.find(s => s.id === subjectId)?.name || 'Unknown Subject';
    };

    const getKindLabel = (kind?: string) => {
        if (!kind) return 'Assessment';
        return paperTypeLabels[kind] || kind.replace(/_/g, ' ');
    };

    const completedAssessments = assessments.filter(a => a.score != null);
    const pendingCount = assessments.filter(a => a.score == null).length;
    const completedCount = completedAssessments.length;
    const avgScore = completedCount > 0
        ? Math.round(completedAssessments.reduce((acc, a) => acc + (a.score ?? 0), 0) / completedCount)
        : 0;
    const isUploading = uploadedFiles.some((file) => file.status === 'uploading');
    const hasUploadErrors = uploadedFiles.some((file) => file.status === 'error');

    return (
        <div className="p-6 lg:p-8 max-w-7xl mx-auto space-y-6 animate-fade-in">
            {/* Header */}
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                <div className="space-y-1">
                    <h1 className="text-2xl lg:text-3xl font-semibold text-foreground flex items-center gap-3">
                        <CalendarDays className="h-7 w-7 text-primary" />
                        Exams & Assessments
                    </h1>
                    <p className="text-muted-foreground">
                        Track upcoming exams and past assessment results.
                    </p>
                </div>
                <div className="flex gap-2">
                    {activeTab === 'future' ? (
                        <>
                            <Button variant="outline" onClick={() => setImportDialogOpen(true)} className="gap-2">
                                <Import className="h-4 w-4" />
                                Import Schedule
                            </Button>
                            <Button onClick={() => setAddExamDialogOpen(true)} className="gap-2">
                                <Plus className="h-4 w-4" />
                                Add Exam
                            </Button>
                        </>
                    ) : (
                        <Button onClick={() => setDialogOpen(true)} className="gap-2">
                            <Plus className="h-4 w-4" />
                            Add Assessment
                        </Button>
                    )}
                </div>
            </div>

            {/* Tabs */}
            <Tabs value={activeTab} onValueChange={setActiveTab}>
                <TabsList className="grid w-full max-w-md grid-cols-2">
                    <TabsTrigger value="future" className="gap-2">
                        <CalendarDays className="h-4 w-4" />
                        Future Exams
                        {upcomingExams.length > 0 && (
                            <Badge variant="secondary" className="ml-1">{upcomingExams.length}</Badge>
                        )}
                    </TabsTrigger>
                    <TabsTrigger value="past" className="gap-2">
                        <ClipboardCheck className="h-4 w-4" />
                        Past Results
                    </TabsTrigger>
                </TabsList>

                {/* Future Exams Tab */}
                <TabsContent value="future" className="space-y-6">
                    {/* Stats for Future Exams */}
                    <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                        <Card className="card-shadow">
                            <CardContent className="p-4">
                                <div className="flex items-center gap-3">
                                    <div className="p-2 rounded-lg bg-primary/10">
                                        <CalendarDays className="h-5 w-5 text-primary" />
                                    </div>
                                    <div>
                                        <p className="text-2xl font-semibold">{upcomingExams.length}</p>
                                        <p className="text-sm text-muted-foreground">Upcoming</p>
                                    </div>
                                </div>
                            </CardContent>
                        </Card>
                        <Card className="card-shadow">
                            <CardContent className="p-4">
                                <div className="flex items-center gap-3">
                                    <div className="p-2 rounded-lg bg-warning/10">
                                        <Timer className="h-5 w-5 text-warning" />
                                    </div>
                                    <div>
                                        <p className="text-2xl font-semibold">
                                            {upcomingExams.length > 0 ? getDaysUntil(upcomingExams[0].exam_date) : '-'}
                                        </p>
                                        <p className="text-sm text-muted-foreground">Days to Next</p>
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
                                        <p className="text-2xl font-semibold">
                                            {upcomingExams.filter(e => getDaysUntil(e.exam_date) <= 7).length}
                                        </p>
                                        <p className="text-sm text-muted-foreground">This Week</p>
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
                                        <p className="text-2xl font-semibold">
                                            {upcomingExams.filter(e => getDaysUntil(e.exam_date) <= 30).length}
                                        </p>
                                        <p className="text-sm text-muted-foreground">This Month</p>
                                    </div>
                                </div>
                            </CardContent>
                        </Card>
                    </div>

                    {/* Upcoming Exams List */}
                    <div className="space-y-4">
                        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                            <h2 className="text-lg font-semibold">Upcoming Exams</h2>
                            <div className="flex bg-secondary/50 p-1 rounded-lg">
                                <Button
                                    variant={upcomingFilter === 'all' ? 'secondary' : 'ghost'}
                                    size="sm"
                                    onClick={() => setUpcomingFilter('all')}
                                    className="h-7 text-xs"
                                >
                                    All
                                </Button>
                                <Button
                                    variant={upcomingFilter === 'real' ? 'secondary' : 'ghost'}
                                    size="sm"
                                    onClick={() => setUpcomingFilter('real')}
                                    className="h-7 text-xs"
                                >
                                    Real Exams
                                </Button>
                                <Button
                                    variant={upcomingFilter === 'mock' ? 'secondary' : 'ghost'}
                                    size="sm"
                                    onClick={() => setUpcomingFilter('mock')}
                                    className="h-7 text-xs"
                                >
                                    Mocks
                                </Button>
                            </div>
                        </div>
                        {loading ? (
                            <div className="text-center py-12">
                                <Loader2 className="h-8 w-8 animate-spin mx-auto mb-2 text-muted-foreground" />
                                <p className="text-muted-foreground">Loading exams...</p>
                            </div>
                        ) : upcomingExams.length === 0 ? (
                            <Card className="card-shadow">
                                <CardContent className="p-8 text-center">
                                    <CalendarDays className="h-12 w-12 text-muted-foreground mx-auto mb-4 opacity-50" />
                                    <h3 className="font-semibold mb-2">No upcoming exams</h3>
                                    <p className="text-sm text-muted-foreground mb-4">
                                        Add your exam schedule to track deadlines and prepare effectively.
                                    </p>
                                    <div className="flex gap-2 justify-center">
                                        <Button variant="outline" onClick={() => setImportDialogOpen(true)}>
                                            <Import className="h-4 w-4 mr-2" />
                                            Import Schedule PDF
                                        </Button>
                                        <Button onClick={() => setAddExamDialogOpen(true)}>
                                            <Plus className="h-4 w-4 mr-2" />
                                            Add Exam Manually
                                        </Button>
                                    </div>
                                </CardContent>
                            </Card>
                        ) : (
                            <div className="grid gap-4">
                                {upcomingExams
                                    .filter(e => upcomingFilter === 'all' || (e.type || 'real') === upcomingFilter)
                                    .map((exam) => {
                                        const daysUntil = getDaysUntil(exam.exam_date);
                                        const isUrgent = daysUntil <= 7;
                                        return (
                                            <Card key={exam.id} className="card-shadow hover:card-shadow-hover transition-shadow">
                                                <CardContent className="p-4">
                                                    <div className="flex flex-col lg:flex-row lg:items-center gap-4">
                                                        <div className="flex items-center gap-4 flex-1 min-w-0">
                                                            <div className={cn(
                                                                "w-12 h-12 rounded-lg flex items-center justify-center flex-shrink-0",
                                                                isUrgent ? "bg-warning/20" : "bg-primary/10"
                                                            )}>
                                                                <CalendarDays className={cn("h-6 w-6", isUrgent ? "text-warning" : "text-primary")} />
                                                            </div>
                                                            <div className="flex-1 min-w-0">
                                                                <div className="flex items-center gap-2 flex-wrap">
                                                                    <h3 className="font-semibold truncate">{exam.title}</h3>
                                                                    {exam.subject_id && (
                                                                        <Badge variant="outline">{getSubjectName(exam.subject_id)}</Badge>
                                                                    )}
                                                                    <Badge
                                                                        variant="outline"
                                                                        className={cn(
                                                                            "border-transparent",
                                                                            (exam.type || 'real') === 'real'
                                                                                ? "bg-primary/10 text-primary hover:bg-primary/20"
                                                                                : "bg-orange-500/10 text-orange-600 hover:bg-orange-500/20"
                                                                        )}
                                                                    >
                                                                        {(exam.type || 'real') === 'real' ? 'Real Exam' : 'Mock Exam'}
                                                                    </Badge>
                                                                    <Badge variant={isUrgent ? "destructive" : "secondary"}>
                                                                        {daysUntil === 0 ? 'Today' : daysUntil === 1 ? 'Tomorrow' : `${daysUntil} days`}
                                                                    </Badge>
                                                                </div>
                                                                <div className="flex items-center gap-4 mt-1 text-sm text-muted-foreground flex-wrap">
                                                                    <span className="flex items-center gap-1">
                                                                        <CalendarIcon className="h-3.5 w-3.5" />
                                                                        {new Date(exam.exam_date).toLocaleDateString('en-GB', { weekday: 'short', day: 'numeric', month: 'short' })}
                                                                    </span>
                                                                    {exam.exam_time && (
                                                                        <span className="flex items-center gap-1">
                                                                            <Clock className="h-3.5 w-3.5" />
                                                                            {exam.exam_time}
                                                                        </span>
                                                                    )}
                                                                    {exam.duration_minutes && (
                                                                        <span className="flex items-center gap-1">
                                                                            <Timer className="h-3.5 w-3.5" />
                                                                            {exam.duration_minutes} min
                                                                        </span>
                                                                    )}
                                                                    {exam.location && (
                                                                        <span className="flex items-center gap-1">
                                                                            <MapPin className="h-3.5 w-3.5" />
                                                                            {exam.location}
                                                                        </span>
                                                                    )}
                                                                </div>
                                                            </div>
                                                        </div>
                                                        <div className="flex gap-2">
                                                            <Button
                                                                variant="ghost"
                                                                size="icon"
                                                                className="h-8 w-8 text-muted-foreground hover:text-destructive"
                                                                onClick={() => {
                                                                    setExamToDelete(exam);
                                                                    setExamDeleteDialogOpen(true);
                                                                }}
                                                            >
                                                                <Trash2 className="h-4 w-4" />
                                                            </Button>
                                                        </div>
                                                    </div>
                                                </CardContent>
                                            </Card>
                                        );
                                    })}
                            </div>
                        )}
                    </div>
                </TabsContent>

                {/* Past Results Tab */}
                <TabsContent value="past" className="space-y-6">

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
                                        Add a past paper or assessment to get started.
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
                                                            <Badge variant="outline">{getKindLabel(assessment.kind)}</Badge>
                                                            <Badge
                                                                variant="secondary"
                                                                className={
                                                                    assessment.score != null
                                                                        ? 'bg-success/10 text-success'
                                                                        : 'bg-warning/10 text-warning-foreground'
                                                                }
                                                            >
                                                                {assessment.score != null ? 'completed' : 'pending'}
                                                            </Badge>
                                                        </div>
                                                        <div className="flex items-center gap-3 mt-1 text-sm text-muted-foreground flex-wrap">
                                                            <span className="flex items-center gap-2">
                                                                <CalendarIcon className="h-3.5 w-3.5" />
                                                                {assessment.date ? new Date(assessment.date).toLocaleDateString() : 'No date'}
                                                            </span>
                                                            {assessment.attachments?.length ? (
                                                                <span className="flex items-center gap-1 text-xs">
                                                                    <Paperclip className="h-3.5 w-3.5" />
                                                                    {assessment.attachments.length} file{assessment.attachments.length === 1 ? '' : 's'}
                                                                </span>
                                                            ) : null}
                                                        </div>
                                                    </div>
                                                </div>

                                                {/* Score / Actions */}
                                                <div className="flex items-center gap-4">
                                                    {assessment.score != null && (
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
                                                            onClick={() => {
                                                                setAssessmentToDelete(assessment);
                                                                setDeleteDialogOpen(true);
                                                            }}
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
                </TabsContent>
            </Tabs>

            {/* Add Exam Dialog */}
            <Dialog open={addExamDialogOpen} onOpenChange={(open) => {
                setAddExamDialogOpen(open);
                if (!open) resetExamForm();
            }}>
                <DialogContent className="sm:max-w-md">
                    <DialogHeader>
                        <DialogTitle>Add Exam</DialogTitle>
                        <DialogDescription>Add an upcoming exam to track.</DialogDescription>
                    </DialogHeader>
                    <div className="space-y-4 py-4">
                        <div className="space-y-2">
                            <Label htmlFor="exam-title">Exam Title *</Label>
                            <Input
                                id="exam-title"
                                placeholder="e.g., Chemistry Paper 1"
                                value={examFormTitle}
                                className={cn(examFormErrors.title && 'border-destructive')}
                                onChange={(e) => {
                                    setExamFormTitle(e.target.value);
                                    setExamFormErrors(prev => ({ ...prev, title: false }));
                                }}
                            />
                        </div>
                        <div className="space-y-2">
                            <Label htmlFor="exam-subject">Subject</Label>
                            <Select value={examFormSubject} onValueChange={setExamFormSubject}>
                                <SelectTrigger><SelectValue placeholder="Select subject" /></SelectTrigger>
                                <SelectContent>
                                    {subjects.map((s) => (
                                        <SelectItem key={s.id} value={s.id}>{s.name}</SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                        </div>
                        <div className="space-y-2">
                            <Label>Exam Type</Label>
                            <div className="flex gap-2">
                                <Button
                                    type="button"
                                    variant={examFormType === 'real' ? 'default' : 'outline'}
                                    className="flex-1"
                                    onClick={() => setExamFormType('real')}
                                >
                                    Real Exam
                                </Button>
                                <Button
                                    type="button"
                                    variant={examFormType === 'mock' ? 'default' : 'outline'}
                                    className="flex-1"
                                    onClick={() => setExamFormType('mock')}
                                >
                                    Mock Exam
                                </Button>
                            </div>
                        </div>
                        <div className="grid grid-cols-2 gap-4">
                            <div className="space-y-2">
                                <Label htmlFor="exam-date">Date *</Label>
                                <Input
                                    id="exam-date"
                                    type="date"
                                    value={examFormDate}
                                    className={cn(examFormErrors.date && 'border-destructive')}
                                    onChange={(e) => {
                                        setExamFormDate(e.target.value);
                                        setExamFormErrors(prev => ({ ...prev, date: false }));
                                    }}
                                />
                            </div>
                            <div className="space-y-2">
                                <Label htmlFor="exam-time">Time</Label>
                                <Input id="exam-time" type="time" value={examFormTime} onChange={(e) => setExamFormTime(e.target.value)} />
                            </div>
                        </div>
                        <div className="grid grid-cols-2 gap-4">
                            <div className="space-y-2">
                                <Label htmlFor="exam-duration">Duration (min)</Label>
                                <Input id="exam-duration" type="number" placeholder="90" value={examFormDuration} onChange={(e) => setExamFormDuration(e.target.value)} />
                            </div>
                            <div className="space-y-2">
                                <Label htmlFor="exam-location">Location</Label>
                                <Input id="exam-location" placeholder="Hall A" value={examFormLocation} onChange={(e) => setExamFormLocation(e.target.value)} />
                            </div>
                        </div>
                    </div>
                    <DialogFooter>
                        <Button variant="outline" onClick={() => setAddExamDialogOpen(false)}>Cancel</Button>
                        <Button onClick={handleAddExam}>Add Exam</Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>

            {/* Import Schedule Dialog */}
            <Dialog open={importDialogOpen} onOpenChange={(open) => {
                setImportDialogOpen(open);
                if (!open) setParsedExams([]);
            }}>
                <DialogContent className="sm:max-w-lg">
                    <DialogHeader>
                        <DialogTitle>Import Exam Schedule</DialogTitle>
                        <DialogDescription>Upload a PDF of your exam timetable and AI will extract the exams.</DialogDescription>
                    </DialogHeader>
                    <div className="space-y-4 py-4">
                        <input
                            ref={importFileInputRef}
                            type="file"
                            accept=".pdf"
                            className="hidden"
                            onChange={(e) => {
                                const file = e.target.files?.[0];
                                if (file) handleImportSchedule(file);
                                e.target.value = '';
                            }}
                        />
                        {parsedExams.length === 0 ? (
                            <div
                                className="border-2 border-dashed rounded-lg p-8 text-center cursor-pointer hover:border-primary/30 hover:bg-secondary/50 transition-colors"
                                onClick={() => importFileInputRef.current?.click()}
                            >
                                {isParsing ? (
                                    <div className="space-y-2">
                                        <Loader2 className="h-10 w-10 animate-spin mx-auto text-primary" />
                                        <p className="font-medium">Parsing exam schedule...</p>
                                        <p className="text-sm text-muted-foreground">This may take a few seconds</p>
                                    </div>
                                ) : (
                                    <>
                                        <Upload className="h-10 w-10 mx-auto mb-3 text-muted-foreground" />
                                        <p className="font-medium">Click to upload exam schedule PDF</p>
                                        <p className="text-sm text-muted-foreground">AI will extract all exams automatically</p>
                                    </>
                                )}
                            </div>
                        ) : (
                            <div className="space-y-3">
                                <p className="text-sm font-medium">Found {parsedExams.length} exams:</p>
                                <div className="max-h-64 overflow-y-auto space-y-2">
                                    {parsedExams.map((exam, i) => (
                                        <div key={i} className="flex items-center justify-between p-3 rounded-lg bg-secondary/50">
                                            <div>
                                                <p className="font-medium text-sm">{exam.title}</p>
                                                <p className="text-xs text-muted-foreground">{exam.exam_date} {exam.exam_time && `at ${exam.exam_time}`}</p>
                                            </div>
                                            <Button variant="ghost" size="icon" className="h-6 w-6" onClick={() => setParsedExams(prev => prev.filter((_, idx) => idx !== i))}>
                                                <X className="h-3 w-3" />
                                            </Button>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        )}
                    </div>
                    <DialogFooter>
                        <Button variant="outline" onClick={() => { setImportDialogOpen(false); setParsedExams([]); }}>Cancel</Button>
                        {parsedExams.length > 0 && (
                            <Button onClick={handleConfirmImport}>Import {parsedExams.length} Exams</Button>
                        )}
                    </DialogFooter>
                </DialogContent>
            </Dialog>

            {/* Delete Exam Dialog */}
            <AlertDialog open={examDeleteDialogOpen} onOpenChange={(open) => {
                setExamDeleteDialogOpen(open);
                if (!open) setExamToDelete(null);
            }}>
                <AlertDialogContent>
                    <AlertDialogHeader>
                        <AlertDialogTitle>Delete Exam</AlertDialogTitle>
                        <AlertDialogDescription>
                            Are you sure you want to delete "{examToDelete?.title}"? This cannot be undone.
                        </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                        <AlertDialogCancel>Cancel</AlertDialogCancel>
                        <AlertDialogAction onClick={handleDeleteExam} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
                            Delete
                        </AlertDialogAction>
                    </AlertDialogFooter>
                </AlertDialogContent>
            </AlertDialog>

            {/* Add Assessment Dialog */}
            <Dialog open={dialogOpen} onOpenChange={handleDialogOpenChange}>
                <DialogContent
                    className={cn(
                        'sm:max-w-2xl max-h-[90vh] overflow-y-auto',
                        isDragging ? 'ring-2 ring-primary/60 ring-offset-2 ring-offset-background' : ''
                    )}
                    onDragEnter={handleDragEnter}
                    onDragLeave={handleDragLeave}
                    onDragOver={handleDragOver}
                    onDrop={handleDrop}
                    onPaste={handlePaste}
                >
                    <DialogHeader>
                        <DialogTitle>Add Assessment</DialogTitle>
                        <DialogDescription>
                            Attach PDFs (optional) or manually enter assessment details.
                        </DialogDescription>
                    </DialogHeader>

                    <div className="space-y-6 py-4">
                        {/* File Upload Area */}
                        <div className="space-y-3">
                            <Label>Attach PDFs (Optional)</Label>
                            <div
                                className={cn(
                                    'border-2 border-dashed rounded-lg p-6 text-center cursor-pointer transition-colors',
                                    uploadedFiles.length > 0
                                        ? 'border-primary/50 bg-primary/5'
                                        : 'border-border hover:border-primary/30 hover:bg-secondary/50',
                                    isDragging ? 'border-primary/70 bg-primary/10' : ''
                                )}
                                onClick={() => fileInputRef.current?.click()}
                            >
                                <input
                                    ref={fileInputRef}
                                    type="file"
                                    accept=".pdf"
                                    multiple
                                    className="hidden"
                                    onChange={handleFileUpload}
                                />
                                <Upload className="h-10 w-10 text-muted-foreground mx-auto mb-3" />
                                <p className="font-medium">
                                    {uploadedFiles.length > 0 ? 'Add more PDFs' : 'Drop PDFs anywhere in this dialog'}
                                </p>
                                <p className="text-sm text-muted-foreground">
                                    Paste, drag, or click to browse. PDFs only, max 20MB each.
                                </p>
                                <Button
                                    variant="outline"
                                    size="sm"
                                    className="mt-3"
                                    onClick={(event) => {
                                        event.stopPropagation();
                                        fileInputRef.current?.click();
                                    }}
                                >
                                    Browse files
                                </Button>
                            </div>
                            {uploadedFiles.length > 0 ? (
                                <div className="space-y-2">
                                    {uploadedFiles.map((item) => (
                                        <div
                                            key={item.id}
                                            className="flex flex-col gap-3 rounded-lg border bg-secondary/30 px-3 py-2 sm:flex-row sm:items-center sm:justify-between"
                                        >
                                            <div className="min-w-0">
                                                <p className="text-sm font-medium truncate">{item.file.name}</p>
                                                <p className="text-xs text-muted-foreground">
                                                    {formatFileSize(item.file.size)}
                                                </p>
                                            </div>
                                            <div className="flex items-center gap-2">
                                                {item.status === 'uploading' ? (
                                                    <span className="text-xs text-muted-foreground flex items-center gap-1">
                                                        <Loader2 className="h-3.5 w-3.5 animate-spin" />
                                                        Uploading
                                                    </span>
                                                ) : null}
                                                {item.status === 'uploaded' ? (
                                                    <span className="text-xs text-success flex items-center gap-1">
                                                        <Check className="h-3.5 w-3.5" />
                                                        Uploaded
                                                    </span>
                                                ) : null}
                                                {item.status === 'error' ? (
                                                    <span className="text-xs text-destructive flex items-center gap-1">
                                                        <AlertTriangle className="h-3.5 w-3.5" />
                                                        Failed
                                                    </span>
                                                ) : null}
                                                {item.status === 'error' ? (
                                                    <Button
                                                        variant="outline"
                                                        size="sm"
                                                        onClick={() => handleRetryUpload(item.id)}
                                                    >
                                                        Retry
                                                    </Button>
                                                ) : null}
                                                <Button
                                                    variant="ghost"
                                                    size="icon"
                                                    className="h-8 w-8"
                                                    onClick={() => handleRemoveFile(item.id)}
                                                    disabled={item.status === 'uploading'}
                                                >
                                                    <X className="h-4 w-4" />
                                                </Button>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            ) : null}
                            {isUploading ? (
                                <p className="text-xs text-muted-foreground">Uploading files...</p>
                            ) : null}
                            {hasUploadErrors ? (
                                <p className="text-xs text-destructive">Remove or retry failed uploads to continue.</p>
                            ) : null}
                            <p className="text-xs text-muted-foreground">
                                Files upload immediately and are attached when you save the assessment.
                            </p>
                        </div>

                        {/* Form Fields */}
                        <div className="grid sm:grid-cols-2 gap-4">
                            <div className="space-y-2">
                                <Label htmlFor="subject">Subject *</Label>
                                <Select
                                    value={formSubject}
                                    onValueChange={(value) => {
                                        setFormSubject(value);
                                        setFormErrors((prev) => ({ ...prev, subject: false }));
                                    }}
                                >
                                    <SelectTrigger
                                        id="subject"
                                        className={cn(formErrors.subject ? 'border-destructive focus:border-destructive' : '')}
                                    >
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
                                {formErrors.subject ? (
                                    <p className="text-xs text-destructive">Subject is required.</p>
                                ) : null}
                            </div>

                            <div className="space-y-2">
                                <Label htmlFor="paperType">Paper Type *</Label>
                                <Select
                                    value={formPaperType}
                                    onValueChange={(value) => {
                                        setFormPaperType(value);
                                        setFormErrors((prev) => ({ ...prev, paperType: false }));
                                    }}
                                >
                                    <SelectTrigger
                                        id="paperType"
                                        className={cn(formErrors.paperType ? 'border-destructive focus:border-destructive' : '')}
                                    >
                                        <SelectValue placeholder="Select type" />
                                    </SelectTrigger>
                                    <SelectContent>
                                        {paperTypes.map((type) => (
                                            <SelectItem key={type.value} value={type.value}>
                                                {type.label}
                                            </SelectItem>
                                        ))}
                                    </SelectContent>
                                </Select>
                                {formErrors.paperType ? (
                                    <p className="text-xs text-destructive">Paper type is required.</p>
                                ) : null}
                            </div>
                        </div>

                        <div className="space-y-2">
                            <Label htmlFor="date">Date *</Label>
                            <Input
                                id="date"
                                type="date"
                                value={formDate}
                                className={cn(formErrors.date ? 'border-destructive focus:border-destructive' : '')}
                                onChange={(e) => {
                                    setFormDate(e.target.value);
                                    setFormErrors((prev) => ({ ...prev, date: false }));
                                }}
                            />
                            {formErrors.date ? (
                                <p className="text-xs text-destructive">Date is required.</p>
                            ) : null}
                        </div>

                        {/* Topics */}
                        <div className="space-y-3">
                            <div className="flex items-center justify-between">
                                <Label>Topics Covered</Label>
                                <Button
                                    variant="outline"
                                    size="sm"
                                    onClick={handleSuggestTopics}
                                    disabled={isSuggesting}
                                    className="gap-2"
                                >
                                    {isSuggesting ? (
                                        <Loader2 className="h-4 w-4 animate-spin" />
                                    ) : (
                                        <Sparkles className="h-4 w-4" />
                                    )}
                                    Suggest topics
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
                        <Button variant="outline" onClick={() => handleDialogOpenChange(false)}>
                            Cancel
                        </Button>
                        <Button onClick={handleSubmit} disabled={isUploading || hasUploadErrors}>
                            Add Assessment
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>

            <AlertDialog
                open={deleteDialogOpen}
                onOpenChange={(open) => {
                    setDeleteDialogOpen(open);
                    if (!open) setAssessmentToDelete(null);
                }}
            >
                <AlertDialogContent>
                    <AlertDialogHeader>
                        <AlertDialogTitle>Delete Assessment</AlertDialogTitle>
                        <AlertDialogDescription>
                            Are you sure you want to delete this assessment? This cannot be undone.
                        </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                        <AlertDialogCancel>Cancel</AlertDialogCancel>
                        <AlertDialogAction
                            onClick={(event) => {
                                event.preventDefault();
                                handleConfirmDelete();
                            }}
                            className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                            disabled={isDeleting}
                        >
                            {isDeleting ? 'Deleting...' : 'Delete'}
                        </AlertDialogAction>
                    </AlertDialogFooter>
                </AlertDialogContent>
            </AlertDialog>
        </div>
    );
}
