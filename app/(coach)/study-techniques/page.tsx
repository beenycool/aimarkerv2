'use client';

import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/app/components/ui/card';
import { Button } from '@/app/components/ui/button';
import { Badge } from '@/app/components/ui/badge';
import {
    GraduationCap,
    Brain,
    Timer,
    Layers,
    RefreshCcw,
    ArrowRight,
    BookOpen,
    Target,
    CheckCircle2,
    Clock
} from 'lucide-react';

const techniques = [
    {
        id: 'pomodoro',
        name: 'Pomodoro Technique',
        description: 'Study in focused 25-minute intervals with short breaks.',
        icon: Timer,
        color: 'bg-destructive/10 text-destructive',
        difficulty: 'Beginner',
        timePerSession: '25 mins',
        steps: [
            'Set a timer for 25 minutes',
            'Focus on one task without distractions',
            'Take a 5-minute break',
            'Repeat 4 times, then take a longer break'
        ]
    },
    {
        id: 'spaced-repetition',
        name: 'Spaced Repetition',
        description: 'Review material at increasing intervals to boost retention.',
        icon: RefreshCcw,
        color: 'bg-primary/10 text-primary',
        difficulty: 'Intermediate',
        timePerSession: '15-30 mins',
        steps: [
            'Review new material today',
            'Review again tomorrow',
            'Review after 3 days',
            'Review after 1 week, then monthly'
        ]
    },
    {
        id: 'active-recall',
        name: 'Active Recall',
        description: 'Test yourself without looking at notes to strengthen memory.',
        icon: Brain,
        color: 'bg-accent/10 text-accent',
        difficulty: 'Beginner',
        timePerSession: '20 mins',
        steps: [
            'Close your notes and textbook',
            'Write down everything you remember',
            'Check against your notes',
            'Focus on gaps in next session'
        ]
    },
    {
        id: 'interleaving',
        name: 'Interleaving',
        description: 'Mix different topics in one session for deeper learning.',
        icon: Layers,
        color: 'bg-success/10 text-success',
        difficulty: 'Advanced',
        timePerSession: '45 mins',
        steps: [
            'Choose 2-3 related topics',
            'Switch between topics every 15 mins',
            'Connect concepts across topics',
            'Review all topics at end of session'
        ]
    },
    {
        id: 'elaboration',
        name: 'Elaboration',
        description: 'Explain concepts in your own words and make connections.',
        icon: BookOpen,
        color: 'bg-warning/10 text-warning-foreground',
        difficulty: 'Intermediate',
        timePerSession: '30 mins',
        steps: [
            'Read a section of your notes',
            'Explain it like you\'re teaching someone',
            'Connect it to things you already know',
            'Write summaries in your own words'
        ]
    },
    {
        id: 'practice-testing',
        name: 'Practice Testing',
        description: 'Take practice tests to identify gaps and reduce exam anxiety.',
        icon: Target,
        color: 'bg-primary/10 text-primary',
        difficulty: 'Beginner',
        timePerSession: 'Varies',
        steps: [
            'Find or create practice questions',
            'Answer under exam conditions',
            'Mark your answers honestly',
            'Review mistakes thoroughly'
        ]
    },
];

const getDifficultyColor = (difficulty: string) => {
    switch (difficulty) {
        case 'Beginner': return 'bg-success/10 text-success';
        case 'Intermediate': return 'bg-warning/10 text-warning-foreground';
        case 'Advanced': return 'bg-destructive/10 text-destructive';
        default: return 'bg-secondary';
    }
};

export default function StudyTechniquesPage() {
    return (
        <div className="p-6 lg:p-8 max-w-7xl mx-auto space-y-6 animate-fade-in">
            {/* Header */}
            <div className="space-y-1">
                <h1 className="text-2xl lg:text-3xl font-semibold text-foreground flex items-center gap-3">
                    <GraduationCap className="h-7 w-7 text-primary" />
                    Study Techniques
                </h1>
                <p className="text-muted-foreground">
                    Evidence-based learning strategies to maximise your study time.
                </p>
            </div>

            {/* Quick Tips */}
            <Card className="card-shadow bg-primary/5 border-primary/20">
                <CardContent className="p-4">
                    <div className="flex items-start gap-3">
                        <div className="p-2 rounded-lg bg-primary/10">
                            <Brain className="h-5 w-5 text-primary" />
                        </div>
                        <div className="flex-1">
                            <h3 className="font-semibold text-primary mb-1">💡 Pro Tip</h3>
                            <p className="text-sm text-muted-foreground">
                                The most effective students combine multiple techniques. Try pairing
                                <strong> Active Recall</strong> with <strong>Spaced Repetition</strong> for
                                maximum retention.
                            </p>
                        </div>
                    </div>
                </CardContent>
            </Card>

            {/* Techniques Grid */}
            <div className="grid md:grid-cols-2 gap-6">
                {techniques.map((technique) => (
                    <Card key={technique.id} className="card-shadow hover:card-shadow-hover transition-shadow">
                        <CardHeader>
                            <div className="flex items-start justify-between">
                                <div className={`p-2 rounded-lg ${technique.color}`}>
                                    <technique.icon className="h-5 w-5" />
                                </div>
                                <Badge
                                    variant="secondary"
                                    className={getDifficultyColor(technique.difficulty)}
                                >
                                    {technique.difficulty}
                                </Badge>
                            </div>
                            <CardTitle className="mt-3">{technique.name}</CardTitle>
                            <CardDescription>{technique.description}</CardDescription>
                        </CardHeader>
                        <CardContent className="space-y-4">
                            {/* Time */}
                            <div className="flex items-center gap-2 text-sm text-muted-foreground">
                                <Clock className="h-4 w-4" />
                                <span>{technique.timePerSession} per session</span>
                            </div>

                            {/* Steps */}
                            <div className="space-y-2">
                                <p className="text-sm font-medium">How it works:</p>
                                <ol className="space-y-1.5">
                                    {technique.steps.map((step, index) => (
                                        <li key={index} className="flex items-start gap-2 text-sm text-muted-foreground">
                                            <span className="flex-shrink-0 w-5 h-5 rounded-full bg-secondary flex items-center justify-center text-xs font-medium">
                                                {index + 1}
                                            </span>
                                            {step}
                                        </li>
                                    ))}
                                </ol>
                            </div>

                            {/* Action */}
                            <Button variant="outline" className="w-full gap-2">
                                Try This Technique
                                <ArrowRight className="h-4 w-4" />
                            </Button>
                        </CardContent>
                    </Card>
                ))}
            </div>

            {/* Resources */}
            <Card className="card-shadow">
                <CardHeader>
                    <CardTitle className="text-lg">Additional Resources</CardTitle>
                    <CardDescription>
                        Learn more about evidence-based study techniques
                    </CardDescription>
                </CardHeader>
                <CardContent>
                    <div className="grid sm:grid-cols-3 gap-4">
                        <div className="p-4 rounded-lg bg-secondary/50">
                            <h4 className="font-medium mb-1">📚 Books</h4>
                            <p className="text-sm text-muted-foreground">
                                &quot;Make It Stick&quot; by Peter Brown
                            </p>
                        </div>
                        <div className="p-4 rounded-lg bg-secondary/50">
                            <h4 className="font-medium mb-1">🎥 Videos</h4>
                            <p className="text-sm text-muted-foreground">
                                Ali Abdaal&apos;s study tips on YouTube
                            </p>
                        </div>
                        <div className="p-4 rounded-lg bg-secondary/50">
                            <h4 className="font-medium mb-1">🔬 Research</h4>
                            <p className="text-sm text-muted-foreground">
                                Learning Scientists resources
                            </p>
                        </div>
                    </div>
                </CardContent>
            </Card>
        </div>
    );
}
