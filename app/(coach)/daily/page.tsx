'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { useStudentId } from '../../components/AuthProvider';
import {
    pickTopWeaknesses,
    weaknessCountsFromAttempts,
    listQuestionAttempts,
    completeSession
} from '../../services/studentOS';
import { generateDailyQuestions } from '../../services/AICoachService';
import { AIService } from '../../services/AIService';
import { Card, CardContent, CardHeader, CardTitle } from '../../components/ui/card';
import { Button } from '../../components/ui/button';
import { Progress } from '../../components/ui/progress';
import { Badge } from '../../components/ui/badge';
import { Star, Flame, Target, ArrowRight, CheckCircle2, Circle, Clock, Loader2, Sparkles, Trophy, RotateCcw } from 'lucide-react';
import AdaptiveInput from '../../components/AdaptiveInput';
import { FeedbackBlock, MarkdownText } from '../../components/UIComponents';

export default function DailyPage() {
    const studentId = useStudentId();
    const [loading, setLoading] = useState(true);
    const [generating, setGenerating] = useState(false);

    // Session State
    const [questions, setQuestions] = useState<any[]>([]);

    // Quiz State
    const [currentIndex, setCurrentIndex] = useState(0);
    const [answers, setAnswers] = useState<any>({});
    const [feedbacks, setFeedbacks] = useState<any>({});
    const [marking, setMarking] = useState(false);
    const [completed, setCompleted] = useState(false);

    // Load Data
    useEffect(() => {
        if (!studentId) return;

        const init = async () => {
            setLoading(true);
            try {
                const attempts = await listQuestionAttempts(studentId, { limit: 200 });
                const counts = weaknessCountsFromAttempts(attempts || []);
                const topWeaknesses = pickTopWeaknesses(counts, 5);

                setGenerating(true);
                // Generate fresh questions each time for now
                // In a real app, we would cache this in the session
                const generated = await generateDailyQuestions(topWeaknesses, studentId);

                if (generated && Array.isArray(generated) && generated.length > 0) {
                     setQuestions(generated);
                } else {
                     // Fallback if generation fails
                     console.warn("Generation returned empty, using fallback");
                     setQuestions([]);
                }
                setGenerating(false);

            } catch (e) {
                console.error("Failed to init daily session", e);
            } finally {
                setLoading(false);
            }
        };

        init();
    }, [studentId]);

    const currentQuestion = questions[currentIndex];
    const currentAnswer = answers[currentIndex];
    const currentFeedback = feedbacks[currentIndex];

    const handleAnswerChange = (val: any) => {
        setAnswers({ ...answers, [currentIndex]: val });
    };

    const submitAnswer = async () => {
        if (!currentAnswer && currentAnswer !== 0) return;
        setMarking(true);
        try {
            const result = await AIService.markQuestion(
                currentQuestion,
                currentAnswer,
                currentQuestion.mark_scheme,
                null, // hackClubKey
                null, // customApiKey
                null, // model
                studentId
            );

            setFeedbacks({ ...feedbacks, [currentIndex]: result });

            // Play sound effect here if implemented
        } catch (e) {
            console.error(e);
        } finally {
            setMarking(false);
        }
    };

    const nextQuestion = () => {
        if (currentIndex < questions.length - 1) {
            setCurrentIndex(currentIndex + 1);
        } else {
            handleComplete();
        }
    };

    const handleComplete = async () => {
        setCompleted(true);
        // Calculate score
        const totalScore = Object.values(feedbacks).reduce((acc: number, curr: any) => acc + (curr.score || 0), 0);
        const maxScore = questions.reduce((acc, curr) => acc + (curr.marks || 0), 0);

        // Save completion
        try {
             await completeSession(studentId, "daily-session-" + Date.now(), {
                items_completed: questions.length,
                total_items: questions.length,
                score: totalScore,
                max_score: maxScore
            });
        } catch (e) {
            console.error("Failed to save session completion", e);
        }
    };

    if (loading || generating) {
        return (
            <div className="flex flex-col items-center justify-center min-h-[60vh] space-y-4 animate-in fade-in">
                <div className="relative">
                    <div className="absolute inset-0 bg-primary/20 blur-xl rounded-full animate-pulse"></div>
                    <Loader2 className="h-16 w-16 animate-spin text-primary relative z-10" />
                </div>
                <h2 className="text-xl font-semibold text-foreground">Creating your Daily 5...</h2>
                <p className="text-muted-foreground animate-pulse text-center max-w-md">
                    Analysing your recent performance and generating targeted questions.
                </p>
            </div>
        );
    }

    if (!questions || questions.length === 0) {
        return (
             <div className="p-8 text-center max-w-lg mx-auto mt-10">
                <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-muted mb-4">
                    <Target className="h-8 w-8 text-muted-foreground" />
                </div>
                <h2 className="text-xl font-bold mb-2">No questions generated</h2>
                <p className="text-muted-foreground mb-6">
                    We couldn't generate questions right now. Try marking some past papers first to identify weaknesses.
                </p>
                <Link href="/exam">
                    <Button>
                        Go to Exams <ArrowRight className="h-4 w-4 ml-2" />
                    </Button>
                </Link>
             </div>
        );
    }

    if (completed) {
        // Calculate score
        const totalScore = Object.values(feedbacks).reduce((acc: number, curr: any) => acc + (curr.score || 0), 0);
        const maxScore = questions.reduce((acc: any, curr: any) => acc + (curr.marks || 0), 0);
        const percentage = maxScore > 0 ? Math.round((totalScore / maxScore) * 100) : 0;

        return (
            <div className="p-6 max-w-2xl mx-auto text-center space-y-8 animate-in zoom-in-95 duration-500">
                <div>
                    <div className="inline-flex items-center justify-center w-24 h-24 rounded-full bg-success/10 mb-6 ring-8 ring-success/5 animate-bounce">
                        <Trophy className="h-12 w-12 text-success" />
                    </div>
                    <h1 className="text-4xl font-bold mb-2">Daily 5 Completed!</h1>
                    <p className="text-xl text-muted-foreground">
                        You scored <span className="font-bold text-foreground">{totalScore}</span> out of <span className="font-bold text-foreground">{maxScore}</span> ({percentage}%)
                    </p>
                </div>

                <Card className="text-left overflow-hidden border-border/50 shadow-lg">
                    <CardHeader className="bg-muted/30 pb-4">
                        <CardTitle className="text-lg">Session Summary</CardTitle>
                    </CardHeader>
                    <CardContent className="p-0">
                        <div className="divide-y divide-border">
                             {questions.map((q, i) => (
                                 <div key={i} className="flex justify-between items-center p-4 hover:bg-muted/20 transition-colors">
                                     <div className="flex items-center gap-3">
                                         <div className={`flex-shrink-0 w-8 h-8 rounded-full flex items-center justify-center font-bold text-xs ${feedbacks[i]?.score === q.marks ? 'bg-success/20 text-success' : feedbacks[i]?.score > 0 ? 'bg-warning/20 text-warning' : 'bg-destructive/20 text-destructive'}`}>
                                             {i + 1}
                                         </div>
                                         <span className="text-sm font-medium line-clamp-1">{q.topic || "General"}</span>
                                     </div>
                                     <Badge variant={feedbacks[i]?.score === q.marks ? "default" : feedbacks[i]?.score > 0 ? "secondary" : "destructive"}>
                                         {feedbacks[i]?.score || 0}/{q.marks}
                                     </Badge>
                                 </div>
                             ))}
                        </div>
                    </CardContent>
                </Card>

                <div className="flex gap-4 justify-center">
                    <Link href="/dashboard">
                        <Button size="lg" variant="outline" className="min-w-[150px]">
                            Dashboard
                        </Button>
                    </Link>
                    <Button size="lg" className="min-w-[150px]" onClick={() => window.location.reload()}>
                        <RotateCcw className="h-4 w-4 mr-2" /> Start Another
                    </Button>
                </div>
            </div>
        );
    }

    return (
        <div className="p-4 lg:p-8 max-w-3xl mx-auto space-y-6 animate-in slide-in-from-bottom-4 duration-500">
            {/* Header / Progress */}
            <div className="flex items-end justify-between gap-4">
                <div className="space-y-2 flex-1">
                    <div className="flex items-center justify-between">
                        <h1 className="text-2xl font-bold flex items-center gap-2">
                            Daily 5
                            <Badge variant="outline" className="ml-2 font-normal text-muted-foreground">
                                Question {currentIndex + 1} of {questions.length}
                            </Badge>
                        </h1>
                        <div className="text-right hidden sm:block">
                            <Badge variant="secondary" className="font-medium">
                                {currentQuestion.topic}
                            </Badge>
                        </div>
                    </div>
                    <Progress value={((currentIndex) / questions.length) * 100} className="h-2" />
                </div>
            </div>

            {/* Question Card */}
            <Card className="card-shadow border-t-4 border-t-primary overflow-hidden">
                <CardContent className="p-6 md:p-8 space-y-6">
                    <div className="space-y-4">
                         <div className="flex justify-between items-start gap-4">
                            <h2 className="text-lg md:text-xl font-medium leading-relaxed">
                                {currentQuestion.question}
                            </h2>
                            <Badge variant="outline" className="flex-shrink-0 mt-1">
                                {currentQuestion.marks} marks
                            </Badge>
                         </div>

                         {/* Options for MCQ if rendered manually, but AdaptiveInput handles it */}
                    </div>

                    {!currentFeedback ? (
                        <div className="space-y-6 pt-2">
                            <AdaptiveInput
                                type={currentQuestion.type}
                                options={currentQuestion.options}
                                value={currentAnswer}
                                onChange={handleAnswerChange}
                            />

                            <div className="pt-4">
                                <Button
                                    onClick={submitAnswer}
                                    disabled={!currentAnswer && currentAnswer !== 0 || marking}
                                    className="w-full h-12 text-lg font-semibold shadow-lg hover:shadow-xl transition-all"
                                    size="lg"
                                >
                                    {marking ? <Loader2 className="w-5 h-5 animate-spin mr-2" /> : <CheckCircle2 className="w-5 h-5 mr-2" />}
                                    {marking ? "Marking..." : "Submit Answer"}
                                </Button>
                            </div>
                        </div>
                    ) : (
                        <div className="animate-in fade-in slide-in-from-bottom-2 pt-2">
                            <FeedbackBlock
                                feedback={currentFeedback}
                                onNext={nextQuestion}
                                onRetry={() => {
                                    // Optional retry logic
                                }}
                            />
                        </div>
                    )}
                </CardContent>
            </Card>

            {/* Context/Tip */}
            {!currentFeedback && (
                <div className="flex items-center gap-2 text-sm text-muted-foreground justify-center opacity-75">
                    <Sparkles className="w-4 h-4" />
                    <span>Focus on quality. Take your time.</span>
                </div>
            )}
        </div>
    );
}
