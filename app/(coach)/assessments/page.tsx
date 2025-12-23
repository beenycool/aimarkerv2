'use client';

import { useState, useRef, useEffect } from 'react';
import { Card, CardContent } from '@/app/components/ui/card';
import { Button } from '@/app/components/ui/button';
import { Input } from '@/app/components/ui/input';
import { Label } from '@/app/components/ui/label';
import { Badge } from '@/app/components/ui/badge';
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
    ClipboardCheck
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
} from '../../services/studentOS';

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
                toast.error('Failed to load assessments.');
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
                        <ClipboardCheck className="h-7 w-7 text-primary" />
                        Assessments
                    </h1>
                    <p className="text-muted-foreground">
                        Track your assessment history and topics covered.
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
