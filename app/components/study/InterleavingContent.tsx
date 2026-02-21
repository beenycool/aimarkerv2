'use client';

import React from 'react';
import { Badge } from '@/app/components/ui/badge';
import { Button } from '@/app/components/ui/button';
import { Layers, CheckCircle2, Loader2, Sparkles } from 'lucide-react';

interface InterleavingContentProps {
    subjects: { id: string; name: string }[];
    aiContent: string;
    isGenerating: boolean;
    onGenerate: () => void;
}

export function InterleavingContent({
    subjects,
    aiContent,
    isGenerating,
    onGenerate
}: InterleavingContentProps) {
    const [selectedSubjects, setSelectedSubjects] = React.useState<string[]>([]);
    const [sessionTime, setSessionTime] = React.useState(45);

    const toggleSubject = (name: string) => {
        setSelectedSubjects(prev =>
            prev.includes(name)
                ? prev.filter(s => s !== name)
                : [...prev, name].slice(0, 3)
        );
    };

    return (
        <div className="space-y-4">
            {/* Description */}
            <div className="flex items-center gap-3 p-4 bg-success/10 rounded-lg">
                <div className="p-2 bg-success/20 rounded-lg">
                    <Layers className="h-6 w-6 text-success" />
                </div>
                <div>
                    <p className="text-sm text-muted-foreground">
                        Mix 2-3 topics in one session. Switch every 15 minutes for deeper learning.
                    </p>
                </div>
            </div>

            {/* Subject Selection */}
            <div className="space-y-2">
                <label className="text-sm font-medium">Select 2-3 subjects to interleave</label>
                <div className="flex flex-wrap gap-2">
                    {subjects.length > 0 ? (
                        subjects.map(subject => (
                            <Badge
                                key={subject.id}
                                variant={selectedSubjects.includes(subject.name) ? 'default' : 'secondary'}
                                className="cursor-pointer py-1.5 px-3"
                                onClick={() => toggleSubject(subject.name)}
                            >
                                {selectedSubjects.includes(subject.name) && (
                                    <CheckCircle2 className="h-3 w-3 mr-1" />
                                )}
                                {subject.name}
                            </Badge>
                        ))
                    ) : (
                        <p className="text-sm text-muted-foreground">
                            Add subjects in Settings first!
                        </p>
                    )}
                </div>
            </div>

            {/* Session Time */}
            <div className="space-y-2">
                <label className="text-sm font-medium">Session length</label>
                <div className="flex gap-2">
                    {[30, 45, 60].map(time => (
                        <Button
                            key={time}
                            variant={sessionTime === time ? 'default' : 'outline'}
                            size="sm"
                            onClick={() => setSessionTime(time)}
                        >
                            {time} mins
                        </Button>
                    ))}
                </div>
            </div>

            {/* AI Suggestions */}
            <Button
                onClick={onGenerate}
                disabled={isGenerating}
                variant="outline"
                className="w-full gap-2"
            >
                {isGenerating ? (
                    <>
                        <Loader2 className="h-4 w-4 animate-spin" />
                        Getting suggestions...
                    </>
                ) : (
                    <>
                        <Sparkles className="h-4 w-4" />
                        Get AI Topic Combinations
                    </>
                )}
            </Button>

            {aiContent && (
                <div className="p-4 bg-primary/5 rounded-lg border border-primary/20">
                    <div className="flex items-center gap-2 mb-2 text-primary">
                        <Sparkles className="h-4 w-4" />
                        <span className="text-sm font-medium">Suggested Combinations</span>
                    </div>
                    <div className="whitespace-pre-wrap text-sm">{aiContent}</div>
                </div>
            )}

            {/* Session Plan */}
            {selectedSubjects.length >= 2 && (
                <div className="space-y-2 p-4 bg-secondary/30 rounded-lg">
                    <h4 className="font-medium">Your Session Plan</h4>
                    <div className="space-y-2">
                        {selectedSubjects.map((subject, i) => {
                            const switchTime = Math.floor(sessionTime / selectedSubjects.length);
                            const startMin = i * switchTime;
                            const endMin = (i + 1) * switchTime;
                            return (
                                <div key={subject} className="flex items-center gap-3 text-sm">
                                    <Badge variant="outline" className="w-24 justify-center">
                                        {startMin}-{endMin} min
                                    </Badge>
                                    <span>{subject}</span>
                                </div>
                            );
                        })}
                    </div>
                </div>
            )}
        </div>
    );
}
