'use client';

import React from 'react';
import { Button } from '@/app/components/ui/button';
import {
    Pause,
    Play,
    RotateCcw,
    Coffee,
    Clock
} from 'lucide-react';
import { TimerState } from '@/app/hooks/useStudyTechniques';

interface PomodoroContentProps {
    timerState: TimerState;
    onStart: () => void;
    onPause: () => void;
    onReset: (isBreak?: boolean) => void;
}

export function PomodoroContent({
    timerState,
    onStart,
    onPause,
    onReset
}: PomodoroContentProps) {
    const timeString = `${timerState.minutes.toString().padStart(2, '0')}:${timerState.seconds.toString().padStart(2, '0')}`;
    const isLongBreak = timerState.isBreak && timerState.sessionsCompleted > 0 && timerState.sessionsCompleted % 4 === 0;
    const totalSeconds = timerState.isBreak ? (isLongBreak ? 15 * 60 : 5 * 60) : 25 * 60;
    const remainingSeconds = timerState.minutes * 60 + timerState.seconds;
    const progress = ((totalSeconds - remainingSeconds) / totalSeconds) * 100;

    // Session counter logic
    const sessionsInCycle = timerState.sessionsCompleted % 4;
    const completedDots = (timerState.sessionsCompleted > 0 && sessionsInCycle === 0) ? 4 : sessionsInCycle;

    return (
        <div className="space-y-6">
            {/* Timer Display */}
            <div className="relative flex flex-col items-center">
                <div className="w-48 h-48 rounded-full bg-secondary/50 flex items-center justify-center relative">
                    <svg
                        className="absolute inset-0 w-full h-full -rotate-90"
                        role="progressbar"
                        aria-label={`Pomodoro Timer: ${timerState.isBreak ? 'Break Time' : 'Focus Time'}`}
                        aria-valuetext={timeString}
                        aria-valuenow={Math.min(100, Math.max(0, Math.round(progress)))}
                        aria-valuemin={0}
                        aria-valuemax={100}
                    >
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
                        className={`w-3 h-3 rounded-full ${i <= completedDots ? 'bg-primary' : 'bg-secondary'}`}
                    />
                ))}
            </div>
            <p className="text-center text-sm text-muted-foreground">
                {timerState.sessionsCompleted} session{timerState.sessionsCompleted !== 1 ? 's' : ''} completed
            </p>

            {/* Controls */}
            <div className="flex justify-center gap-3">
                {timerState.isRunning ? (
                    <Button type="button" onClick={onPause} variant="outline" size="lg" className="gap-2">
                        <Pause className="h-5 w-5" />
                        Pause
                    </Button>
                ) : (
                    <Button type="button" onClick={onStart} size="lg" className="gap-2">
                        <Play className="h-5 w-5" />
                        {timerState.isPaused ? 'Resume' : 'Start'}
                    </Button>
                )}
                <Button type="button" onClick={() => onReset(false)} variant="outline" size="lg" className="gap-2">
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
