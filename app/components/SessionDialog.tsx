'use client';

import { useState, useEffect } from 'react';
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
    DialogDescription,
    DialogFooter,
} from '@/app/components/ui/dialog';
import { Button } from '@/app/components/ui/button';
import { Input } from '@/app/components/ui/input';
import { Label } from '@/app/components/ui/label';
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from '@/app/components/ui/select';
import { Badge } from '@/app/components/ui/badge';
import { Clock, Trash2, Calendar, BookOpen } from 'lucide-react';

interface Subject {
    id: string;
    name: string;
}

interface Session {
    id?: string;
    subject_id?: string;
    session_type?: string;
    planned_for?: string;
    duration_minutes?: number;
    status?: string;
    topic?: string;
    notes?: string;
    start_time?: string;
}

interface SessionDialogProps {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    session?: Session | null;
    subjects: Subject[];
    defaultDate?: string;
    onSave: (data: Partial<Session>) => Promise<void>;
    onDelete?: (sessionId: string) => Promise<void>;
}

export function SessionDialog({
    open,
    onOpenChange,
    session,
    subjects,
    defaultDate,
    onSave,
    onDelete,
}: SessionDialogProps) {
    const isEditing = !!session?.id;
    const [loading, setLoading] = useState(false);
    const [deleteConfirm, setDeleteConfirm] = useState(false);

    const [formData, setFormData] = useState<Partial<Session>>({
        subject_id: '',
        planned_for: '',
        duration_minutes: 30,
        topic: '',
        notes: '',
        start_time: '',
    });

    useEffect(() => {
        if (session) {
            setFormData({
                subject_id: session.subject_id || '',
                planned_for: session.planned_for || defaultDate || '',
                duration_minutes: session.duration_minutes || 30,
                topic: session.topic || '',
                notes: session.notes || '',
                start_time: session.start_time || '',
            });
        } else {
            setFormData({
                subject_id: '',
                planned_for: defaultDate || '',
                duration_minutes: 30,
                topic: '',
                notes: '',
                start_time: '',
            });
        }
        setDeleteConfirm(false);
    }, [session, defaultDate, open]);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!formData.planned_for) return;

        setLoading(true);
        try {
            await onSave({
                ...formData,
                subject_id: formData.subject_id || undefined,
            });
            onOpenChange(false);
        } catch (error) {
            console.error('Failed to save session:', error);
        } finally {
            setLoading(false);
        }
    };

    const handleDelete = async () => {
        if (!session?.id || !onDelete) return;

        if (!deleteConfirm) {
            setDeleteConfirm(true);
            return;
        }

        setLoading(true);
        try {
            await onDelete(session.id);
            onOpenChange(false);
        } catch (error) {
            console.error('Failed to delete session:', error);
        } finally {
            setLoading(false);
            setDeleteConfirm(false);
        }
    };

    const getSubjectName = (id?: string) => subjects.find(s => s.id === id)?.name || 'General Study';

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="sm:max-w-[425px]">
                <DialogHeader>
                    <DialogTitle className="flex items-center gap-2">
                        <Calendar className="h-5 w-5 text-primary" />
                        {isEditing ? 'Edit Session' : 'New Study Session'}
                    </DialogTitle>
                    <DialogDescription>
                        {isEditing
                            ? `Editing session for ${getSubjectName(session?.subject_id)}`
                            : 'Schedule a new study session'}
                    </DialogDescription>
                </DialogHeader>

                <form onSubmit={handleSubmit} className="space-y-4 py-4">
                    {/* Subject Select */}
                    <div className="space-y-2">
                        <Label htmlFor="subject">Subject</Label>
                        <Select
                            value={formData.subject_id || 'none'}
                            onValueChange={(val) =>
                                setFormData({ ...formData, subject_id: val === 'none' ? '' : val })
                            }
                        >
                            <SelectTrigger>
                                <SelectValue placeholder="Select a subject" />
                            </SelectTrigger>
                            <SelectContent>
                                <SelectItem value="none">
                                    <span className="flex items-center gap-2">
                                        <BookOpen className="h-4 w-4" />
                                        General Study
                                    </span>
                                </SelectItem>
                                {subjects.map((s) => (
                                    <SelectItem key={s.id} value={s.id}>
                                        {s.name}
                                    </SelectItem>
                                ))}
                            </SelectContent>
                        </Select>
                    </div>

                    {/* Date */}
                    <div className="space-y-2">
                        <Label htmlFor="date">Date</Label>
                        <Input
                            id="date"
                            type="date"
                            value={formData.planned_for || ''}
                            onChange={(e) =>
                                setFormData({ ...formData, planned_for: e.target.value })
                            }
                            required
                        />
                    </div>

                    {/* Start Time */}
                    <div className="space-y-2">
                        <Label htmlFor="start_time">Time (optional)</Label>
                        <Input
                            id="start_time"
                            type="time"
                            value={formData.start_time || ''}
                            onChange={(e) =>
                                setFormData({ ...formData, start_time: e.target.value })
                            }
                            placeholder="e.g. 16:00"
                        />
                    </div>

                    {/* Duration */}
                    <div className="space-y-2">
                        <Label htmlFor="duration">Duration (minutes)</Label>
                        <div className="flex items-center gap-2">
                            <Input
                                id="duration"
                                type="number"
                                min={5}
                                max={180}
                                step={5}
                                value={formData.duration_minutes || 30}
                                onChange={(e) =>
                                    setFormData({
                                        ...formData,
                                        duration_minutes: parseInt(e.target.value) || 30,
                                    })
                                }
                                className="w-24"
                            />
                            <div className="flex gap-1">
                                {[15, 25, 30, 45, 60].map((d) => (
                                    <Badge
                                        key={d}
                                        variant={formData.duration_minutes === d ? 'default' : 'outline'}
                                        className="cursor-pointer"
                                        onClick={() =>
                                            setFormData({ ...formData, duration_minutes: d })
                                        }
                                    >
                                        {d}m
                                    </Badge>
                                ))}
                            </div>
                        </div>
                    </div>

                    {/* Topic */}
                    <div className="space-y-2">
                        <Label htmlFor="topic">Topic / Focus (optional)</Label>
                        <Input
                            id="topic"
                            placeholder="e.g. Quadratic equations, Romeo & Juliet Act 3"
                            value={formData.topic || ''}
                            onChange={(e) =>
                                setFormData({ ...formData, topic: e.target.value })
                            }
                        />
                    </div>

                    {/* Notes */}
                    <div className="space-y-2">
                        <Label htmlFor="notes">Notes (optional)</Label>
                        <Input
                            id="notes"
                            placeholder="Any additional notes..."
                            value={formData.notes || ''}
                            onChange={(e) =>
                                setFormData({ ...formData, notes: e.target.value })
                            }
                        />
                    </div>

                    <DialogFooter className="flex gap-2 pt-4">
                        {isEditing && onDelete && (
                            <Button
                                type="button"
                                variant={deleteConfirm ? 'destructive' : 'outline'}
                                onClick={handleDelete}
                                disabled={loading}
                                className="mr-auto"
                            >
                                <Trash2 className="h-4 w-4 mr-1" />
                                {deleteConfirm ? 'Confirm Delete' : 'Delete'}
                            </Button>
                        )}
                        <Button
                            type="button"
                            variant="outline"
                            onClick={() => onOpenChange(false)}
                            disabled={loading}
                        >
                            Cancel
                        </Button>
                        <Button type="submit" disabled={loading || !formData.planned_for}>
                            <Clock className="h-4 w-4 mr-1" />
                            {loading ? 'Saving...' : isEditing ? 'Update' : 'Create'}
                        </Button>
                    </DialogFooter>
                </form>
            </DialogContent>
        </Dialog>
    );
}

export default SessionDialog;
