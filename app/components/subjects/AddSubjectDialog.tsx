"use client";

import { useState } from "react";
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
} from "@/app/components/ui/dialog";
import { Button } from "@/app/components/ui/button";
import { Input } from "@/app/components/ui/input";
import { Label } from "@/app/components/ui/label";
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/app/components/ui/select";

interface AddSubjectDialogProps {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    onAdd: (subject: { name: string; examBoard: string; targetGrade: string }) => void;
    existingSubjects: string[];
}

const GCSE_SUBJECTS = [
    "Mathematics",
    "English Language",
    "English Literature",
    "Biology",
    "Chemistry",
    "Physics",
    "Combined Science",
    "Geography",
    "History",
    "French",
    "Spanish",
    "German",
    "Computer Science",
    "Art & Design",
    "Music",
    "Drama",
    "Physical Education",
    "Religious Studies",
    "Business Studies",
    "Economics",
];

const EXAM_BOARDS = ["AQA", "Edexcel", "OCR", "WJEC", "Eduqas", "CCEA"];

const GRADES = ["9", "8", "7", "6", "5", "4", "3", "2", "1"];

export function AddSubjectDialog({
    open,
    onOpenChange,
    onAdd,
    existingSubjects,
}: AddSubjectDialogProps) {
    const [name, setName] = useState("");
    const [customName, setCustomName] = useState("");
    const [examBoard, setExamBoard] = useState("");
    const [targetGrade, setTargetGrade] = useState("");

    const resetForm = () => {
        setName("");
        setCustomName("");
        setExamBoard("");
        setTargetGrade("");
    };

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        const subjectName = name === "Other" ? customName : name;
        if (subjectName && examBoard && targetGrade) {
            onAdd({ name: subjectName, examBoard, targetGrade });
            resetForm();
            onOpenChange(false);
        }
    };

    const availableSubjects = GCSE_SUBJECTS.filter(
        (s) => !existingSubjects.includes(s)
    );

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="sm:max-w-md">
                <form onSubmit={handleSubmit}>
                    <DialogHeader>
                        <DialogTitle>Add Subject</DialogTitle>
                        <DialogDescription>
                            Add a new GCSE subject to your study plan.
                        </DialogDescription>
                    </DialogHeader>
                    <div className="space-y-4 py-4">
                        <div className="space-y-2">
                            <Label htmlFor="subject">Subject</Label>
                            <Select value={name} onValueChange={setName}>
                                <SelectTrigger id="subject">
                                    <SelectValue placeholder="Select a subject" />
                                </SelectTrigger>
                                <SelectContent>
                                    {availableSubjects.map((subject) => (
                                        <SelectItem key={subject} value={subject}>
                                            {subject}
                                        </SelectItem>
                                    ))}
                                    <SelectItem value="Other">Other (Custom)</SelectItem>
                                </SelectContent>
                            </Select>
                        </div>

                        {name === "Other" && (
                            <div className="space-y-2">
                                <Label htmlFor="customName">Custom Subject Name</Label>
                                <Input
                                    id="customName"
                                    value={customName}
                                    onChange={(e) => setCustomName(e.target.value)}
                                    placeholder="Enter subject name"
                                />
                            </div>
                        )}

                        <div className="space-y-2">
                            <Label htmlFor="examBoard">Exam Board</Label>
                            <Select value={examBoard} onValueChange={setExamBoard}>
                                <SelectTrigger id="examBoard">
                                    <SelectValue placeholder="Select exam board" />
                                </SelectTrigger>
                                <SelectContent>
                                    {EXAM_BOARDS.map((board) => (
                                        <SelectItem key={board} value={board}>
                                            {board}
                                        </SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                        </div>

                        <div className="space-y-2">
                            <Label htmlFor="targetGrade">Target Grade</Label>
                            <Select value={targetGrade} onValueChange={setTargetGrade}>
                                <SelectTrigger id="targetGrade">
                                    <SelectValue placeholder="Select target grade" />
                                </SelectTrigger>
                                <SelectContent>
                                    {GRADES.map((grade) => (
                                        <SelectItem key={grade} value={grade}>
                                            Grade {grade}
                                        </SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                        </div>
                    </div>
                    <DialogFooter>
                        <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
                            Cancel
                        </Button>
                        <Button
                            type="submit"
                            disabled={
                                (!name || (name === "Other" && !customName)) ||
                                !examBoard ||
                                !targetGrade
                            }
                        >
                            Add Subject
                        </Button>
                    </DialogFooter>
                </form>
            </DialogContent>
        </Dialog>
    );
}
