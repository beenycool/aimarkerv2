'use client';

import React from 'react';
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
    DialogDescription
} from '@/app/components/ui/dialog';
import { Button } from '@/app/components/ui/button';
import { Badge } from '@/app/components/ui/badge';
import { Progress } from '@/app/components/ui/progress';
import {
    Timer,
    RefreshCcw,
    Brain,
    Layers,
    BookOpen,
    Target,
    Play,
    Pause,
    RotateCcw,
    CheckCircle2,
    Loader2,
    Sparkles,
    Clock,
    Coffee
} from 'lucide-react';
import { useStudyTechniques, TimerState } from '@/app/hooks/useStudyTechniques';

interface TechniqueModalProps {
    isOpen: boolean;
    onClose: () => void;
    techniqueId: string;
    techniqueName: string;
}

export function TechniqueModal({ isOpen, onClose, techniqueId, techniqueName }: TechniqueModalProps) {
    const {
        studentData,
        timerState,
        startTimer,
        pauseTimer,
        resetTimer,
        requestNotificationPermission,
        generateAIContent
    } = useStudyTechniques();

    const [aiContent, setAiContent] = React.useState<string>('');
    const [isGenerating, setIsGenerating] = React.useState(false);

    // Request notification permission when opening Pomodoro
    React.useEffect(() => {
        if (isOpen && techniqueId === 'pomodoro') {
            requestNotificationPermission();
        }
    }, [isOpen, techniqueId, requestNotificationPermission]);

    // Generate AI content for applicable techniques
    const handleGenerateContent = async () => {
        setIsGenerating(true);
        const content = await generateAIContent(techniqueId);
        setAiContent(content);
        setIsGenerating(false);
    };

    const renderContent = () => {
        switch (techniqueId) {
            case 'pomodoro':
                return <PomodoroContent
                    timerState={timerState}
                    onStart={startTimer}
                    onPause={pauseTimer}
                    onReset={resetTimer}
                />;
            case 'spaced-repetition':
                return <SpacedRepetitionContent
                    weaknesses={studentData.weaknesses}
                />;
            case 'active-recall':
            case 'elaboration':
            case 'practice-testing':
                return <AIAssistedContent
                    techniqueId={techniqueId}
                    aiContent={aiContent}
                    isGenerating={isGenerating}
                    onGenerate={handleGenerateContent}
                    studentData={studentData}
                />;
            case 'interleaving':
                return <InterleavingContent
                    subjects={studentData.subjects}
                    aiContent={aiContent}
                    isGenerating={isGenerating}
                    onGenerate={handleGenerateContent}
                />;
            default:
                return <div>Coming soon...</div>;
        }
    };

    return (
        <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
            <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
                <DialogHeader>
                    <DialogTitle className="flex items-center gap-2">
                        <TechniqueIcon techniqueId={techniqueId} />
                        {techniqueName}
                    </DialogTitle>
                    <DialogDescription>
                        {getDescription(techniqueId)}
                    </DialogDescription>
                </DialogHeader>
                <div className="mt-4">
                    {renderContent()}
                </div>
            </DialogContent>
        </Dialog>
    );
}

// Pomodoro Timer Component
function PomodoroContent({
    timerState,
    onStart,
    onPause,
    onReset
}: {
    timerState: TimerState;
    onStart: () => void;
    onPause: () => void;
    onReset: (isBreak?: boolean) => void;
}) {
    const timeString = `${timerState.minutes.toString().padStart(2, '0')}:${timerState.seconds.toString().padStart(2, '0')}`;
    const totalSeconds = timerState.isBreak ? 5 * 60 : 25 * 60;
    const remainingSeconds = timerState.minutes * 60 + timerState.seconds;
    const progress = ((totalSeconds - remainingSeconds) / totalSeconds) * 100;

    return (
        <div className="space-y-6">
            {/* Timer Display */}
            <div className="relative flex flex-col items-center">
                <div className="w-48 h-48 rounded-full bg-secondary/50 flex items-center justify-center relative">
                    <svg className="absolute inset-0 w-full h-full -rotate-90">
                        <circle
                            cx="96"
                            cy="96"
                            r="88"
                            fill="none"
                            stroke="currentColor"
                            strokeWidth="8"
                            className="text-secondary"
                        />
                        <circle
                            cx="96"
                            cy="96"
                            r="88"
                            fill="none"
                            stroke="currentColor"
                            strokeWidth="8"
                            strokeDasharray={2 * Math.PI * 88}
                            strokeDashoffset={2 * Math.PI * 88 * (1 - progress / 100)}
                            className={timerState.isBreak ? 'text-success' : 'text-primary'}
                            strokeLinecap="round"
                        />
                    </svg>
                    <div className="text-center z-10">
                        <div className="text-4xl font-bold font-mono">{timeString}</div>
                        <div className="text-sm text-muted-foreground flex items-center gap-1 justify-center mt-1">
                            {timerState.isBreak ? (
                                <>
                                    <Coffee className="h-4 w-4" />
                                    Break Time
                                </>
                            ) : (
                                <>
                                    <Clock className="h-4 w-4" />
                                    Focus Time
                                </>
                            )}
                        </div>
                    </div>
                </div>
            </div>

            {/* Session Counter */}
            <div className="flex justify-center gap-2">
                {[1, 2, 3, 4].map((i) => (
                    <div
                        key={i}
                        className={`w-3 h-3 rounded-full ${i <= timerState.sessionsCompleted % 4 || (timerState.sessionsCompleted > 0 && timerState.sessionsCompleted % 4 === 0 && i <= 4)
                            ? 'bg-primary'
                            : 'bg-secondary'
                            }`}
                    />
                ))}
            </div>
            <p className="text-center text-sm text-muted-foreground">
                {timerState.sessionsCompleted} session{timerState.sessionsCompleted !== 1 ? 's' : ''} completed
            </p>

            {/* Controls */}
            <div className="flex justify-center gap-3">
                {timerState.isRunning ? (
                    <Button onClick={onPause} variant="outline" size="lg" className="gap-2">
                        <Pause className="h-5 w-5" />
                        Pause
                    </Button>
                ) : (
                    <Button onClick={onStart} size="lg" className="gap-2">
                        <Play className="h-5 w-5" />
                        {timerState.isPaused ? 'Resume' : 'Start'}
                    </Button>
                )}
                <Button onClick={() => onReset(false)} variant="outline" size="lg" className="gap-2">
                    <RotateCcw className="h-5 w-5" />
                    Reset
                </Button>
            </div>

            {/* Tips */}
            <div className="text-sm text-muted-foreground bg-secondary/30 p-3 rounded-lg">
                <strong>💡 Tips:</strong>
                <ul className="mt-1 space-y-1 list-disc list-inside">
                    <li>Complete 4 sessions for a longer 15-minute break</li>
                    <li>Put your phone in another room</li>
                    <li>Have water ready before starting</li>
                </ul>
            </div>
        </div>
    );
}

// Spaced Repetition Component
function SpacedRepetitionContent({
    weaknesses
}: {
    weaknesses: { label: string; count: number }[];
}) {
    const today = new Date();

    // Calculate review schedule based on SM-2 intervals
    const reviewItems = weaknesses.map((w, i) => {
        const intervals = [1, 3, 7, 14, 30]; // SM-2 inspired intervals
        const intervalIndex = Math.min(i, intervals.length - 1);
        const dueDate = new Date(today);
        dueDate.setDate(dueDate.getDate() + intervals[intervalIndex]);

        return {
            topic: w.label,
            count: w.count,
            dueDate,
            interval: intervals[intervalIndex],
            isDueToday: intervalIndex === 0
        };
    });

    const dueTodayCount = reviewItems.filter(r => r.isDueToday).length;

    return (
        <div className="space-y-4">
            {/* Summary */}
            <div className="flex items-center gap-3 p-4 bg-primary/10 rounded-lg">
                <div className="p-2 bg-primary/20 rounded-lg">
                    <RefreshCcw className="h-6 w-6 text-primary" />
                </div>
                <div>
                    <p className="font-semibold">
                        {dueTodayCount > 0 ? `${dueTodayCount} topic${dueTodayCount > 1 ? 's' : ''} to review today` : 'All caught up!'}
                    </p>
                    <p className="text-sm text-muted-foreground">Based on your practice history</p>
                </div>
            </div>

            {/* Review Schedule */}
            <div className="space-y-2">
                <h4 className="font-medium text-sm text-muted-foreground">Review Schedule</h4>
                {reviewItems.length > 0 ? (
                    reviewItems.map((item, i) => (
                        <div
                            key={i}
                            className={`flex items-center justify-between p-3 rounded-lg border ${item.isDueToday ? 'bg-warning/10 border-warning/20' : 'bg-card'
                                }`}
                        >
                            <div className="flex items-center gap-3">
                                {item.isDueToday ? (
                                    <Badge variant="secondary" className="bg-warning/20 text-warning-foreground">
                                        Due Today
                                    </Badge>
                                ) : (
                                    <Badge variant="secondary">
                                        In {item.interval} day{item.interval > 1 ? 's' : ''}
                                    </Badge>
                                )}
                                <span className="font-medium">{item.topic}</span>
                            </div>
                            <span className="text-sm text-muted-foreground">
                                {item.count} mistake{item.count > 1 ? 's' : ''}
                            </span>
                        </div>
                    ))
                ) : (
                    <p className="text-center text-muted-foreground py-4">
                        Complete some practice papers to build your review schedule!
                    </p>
                )}
            </div>

            {/* How it works */}
            <div className="text-sm text-muted-foreground bg-secondary/30 p-3 rounded-lg">
                <strong>📊 How Spaced Repetition Works:</strong>
                <p className="mt-1">
                    Topics you struggle with appear more frequently. As you improve, review intervals increase:
                    1 day → 3 days → 1 week → 2 weeks → 1 month.
                </p>
            </div>
        </div>
    );
}

// AI-Assisted Content Component (Active Recall, Elaboration, Practice Testing)
function AIAssistedContent({
    techniqueId,
    aiContent,
    isGenerating,
    onGenerate,
    studentData
}: {
    techniqueId: string;
    aiContent: string;
    isGenerating: boolean;
    onGenerate: () => void;
    studentData: { name: string; weaknesses: { label: string }[] };
}) {
    const [userResponse, setUserResponse] = React.useState('');

    const icons: Record<string, React.ReactNode> = {
        'active-recall': <Brain className="h-6 w-6 text-accent" />,
        'elaboration': <BookOpen className="h-6 w-6 text-warning" />,
        'practice-testing': <Target className="h-6 w-6 text-primary" />
    };

    const descriptions: Record<string, string> = {
        'active-recall': 'Test your memory by recalling information without looking at notes.',
        'elaboration': 'Deepen your understanding by explaining concepts and making connections.',
        'practice-testing': 'Quick-fire questions to test your knowledge on weak areas.'
    };

    return (
        <div className="space-y-4">
            {/* Description */}
            <div className="flex items-center gap-3 p-4 bg-secondary/30 rounded-lg">
                <div className="p-2 bg-background rounded-lg">
                    {icons[techniqueId]}
                </div>
                <div>
                    <p className="text-sm text-muted-foreground">{descriptions[techniqueId]}</p>
                    {studentData.weaknesses.length > 0 && (
                        <p className="text-sm mt-1">
                            <strong>Focus areas:</strong> {studentData.weaknesses.slice(0, 3).map(w => w.label).join(', ')}
                        </p>
                    )}
                </div>
            </div>

            {/* Generate Button */}
            {!aiContent && (
                <Button
                    onClick={onGenerate}
                    disabled={isGenerating}
                    className="w-full gap-2"
                    size="lg"
                >
                    {isGenerating ? (
                        <>
                            <Loader2 className="h-5 w-5 animate-spin" />
                            Generating prompts...
                        </>
                    ) : (
                        <>
                            <Sparkles className="h-5 w-5" />
                            Generate AI Prompts
                        </>
                    )}
                </Button>
            )}

            {/* AI Content */}
            {aiContent && (
                <div className="space-y-4">
                    <div className="p-4 bg-primary/5 rounded-lg border border-primary/20">
                        <div className="flex items-center gap-2 mb-2 text-primary">
                            <Sparkles className="h-4 w-4" />
                            <span className="text-sm font-medium">AI-Generated Prompts</span>
                        </div>
                        <div className="whitespace-pre-wrap text-sm">{aiContent}</div>
                    </div>

                    {/* Practice Area */}
                    {(techniqueId === 'active-recall' || techniqueId === 'elaboration') && (
                        <div className="space-y-2">
                            <label className="text-sm font-medium">Your Response</label>
                            <textarea
                                value={userResponse}
                                onChange={(e) => setUserResponse(e.target.value)}
                                placeholder="Write your answer here... Don't peek at your notes!"
                                className="w-full h-32 p-3 rounded-lg border bg-background resize-none focus:outline-none focus:ring-2 focus:ring-primary"
                            />
                            <p className="text-xs text-muted-foreground">
                                {userResponse.length > 0 && (
                                    <span className="flex items-center gap-1 text-success">
                                        <CheckCircle2 className="h-3 w-3" />
                                        Great work! Now check your notes to see how you did.
                                    </span>
                                )}
                            </p>
                        </div>
                    )}

                    <Button variant="outline" onClick={onGenerate} className="w-full gap-2">
                        <RefreshCcw className="h-4 w-4" />
                        Generate New Prompts
                    </Button>
                </div>
            )}
        </div>
    );
}

// Interleaving Content Component
function InterleavingContent({
    subjects,
    aiContent,
    isGenerating,
    onGenerate
}: {
    subjects: { id: string; name: string }[];
    aiContent: string;
    isGenerating: boolean;
    onGenerate: () => void;
}) {
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

// Helper Components
function TechniqueIcon({ techniqueId }: { techniqueId: string }) {
    const icons: Record<string, React.ReactNode> = {
        'pomodoro': <Timer className="h-5 w-5 text-destructive" />,
        'spaced-repetition': <RefreshCcw className="h-5 w-5 text-primary" />,
        'active-recall': <Brain className="h-5 w-5 text-accent" />,
        'interleaving': <Layers className="h-5 w-5 text-success" />,
        'elaboration': <BookOpen className="h-5 w-5 text-warning" />,
        'practice-testing': <Target className="h-5 w-5 text-primary" />
    };
    return icons[techniqueId] || null;
}

function getDescription(techniqueId: string): string {
    const descriptions: Record<string, string> = {
        'pomodoro': 'Stay focused with timed study sessions and regular breaks.',
        'spaced-repetition': 'Review topics at optimal intervals for long-term retention.',
        'active-recall': 'Strengthen memory by testing yourself without notes.',
        'interleaving': 'Mix different topics to build deeper connections.',
        'elaboration': 'Explain concepts in your own words to deepen understanding.',
        'practice-testing': 'Test yourself with quick questions on your weak areas.'
    };
    return descriptions[techniqueId] || '';
}

export default TechniqueModal;
