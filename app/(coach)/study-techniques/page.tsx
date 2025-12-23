'use client';

import { useState, useEffect } from 'react';
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
    Clock,
    Sparkles,
    ExternalLink,
    TrendingUp
} from 'lucide-react';
import { TechniqueModal } from '@/app/components/study/TechniqueModal';
import { useStudyTechniques } from '@/app/hooks/useStudyTechniques';

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

const resources = [
    {
        title: '📚 Books',
        description: '"Make It Stick" by Peter Brown',
        url: 'https://www.amazon.co.uk/Make-Stick-Science-Successful-Learning/dp/0674729013'
    },
    {
        title: '🎥 Videos',
        description: 'Ali Abdaal\'s study tips on YouTube',
        url: 'https://www.youtube.com/@aliabdaal'
    },
    {
        title: '🔬 Research',
        description: 'Learning Scientists resources',
        url: 'https://www.learningscientists.org/downloadable-materials'
    }
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
    const [selectedTechnique, setSelectedTechnique] = useState<typeof techniques[0] | null>(null);
    const [isModalOpen, setIsModalOpen] = useState(false);
    const { studentData, loading } = useStudyTechniques();

    const handleTryTechnique = (technique: typeof techniques[0]) => {
        setSelectedTechnique(technique);
        setIsModalOpen(true);
    };

    const handleCloseModal = () => {
        setIsModalOpen(false);
        setSelectedTechnique(null);
    };

    // Get recommended techniques based on student data
    const getRecommendedTechniques = () => {
        const recommended: { id: string; reason: string }[] = [];

        if (studentData.weaknesses.length > 0) {
            recommended.push({
                id: 'active-recall',
                reason: `Practice recalling ${studentData.weaknesses[0]?.label || 'topics'} without notes`
            });
            recommended.push({
                id: 'practice-testing',
                reason: 'Test yourself on your weak areas'
            });
        }

        if (studentData.subjects.length >= 2) {
            recommended.push({
                id: 'interleaving',
                reason: 'Mix your subjects for deeper understanding'
            });
        }

        // Always recommend Pomodoro for focus
        if (recommended.length < 3) {
            recommended.push({
                id: 'pomodoro',
                reason: 'Stay focused with timed study sessions'
            });
        }

        return recommended.slice(0, 3);
    };

    const recommendedTechniques = getRecommendedTechniques();

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

            {/* AI Recommendations */}
            {!loading && recommendedTechniques.length > 0 && (
                <Card className="card-shadow bg-gradient-to-br from-primary/5 to-accent/5 border-primary/20">
                    <CardHeader className="pb-3">
                        <CardTitle className="text-lg flex items-center gap-2">
                            <Sparkles className="h-5 w-5 text-primary" />
                            Recommended for You
                        </CardTitle>
                        <CardDescription>
                            Based on your subjects and practice history
                        </CardDescription>
                    </CardHeader>
                    <CardContent>
                        <div className="grid sm:grid-cols-3 gap-3">
                            {recommendedTechniques.map((rec) => {
                                const technique = techniques.find(t => t.id === rec.id);
                                if (!technique) return null;
                                const IconComponent = technique.icon;
                                return (
                                    <div
                                        key={rec.id}
                                        className="p-4 rounded-lg bg-background/80 backdrop-blur border hover:border-primary/40 transition-colors cursor-pointer"
                                        onClick={() => handleTryTechnique(technique)}
                                    >
                                        <div className="flex items-center gap-2 mb-2">
                                            <div className={`p-1.5 rounded-md ${technique.color}`}>
                                                <IconComponent className="h-4 w-4" />
                                            </div>
                                            <span className="font-medium text-sm">{technique.name}</span>
                                        </div>
                                        <p className="text-xs text-muted-foreground">{rec.reason}</p>
                                        <div className="flex items-center gap-1 mt-2 text-xs text-primary">
                                            <TrendingUp className="h-3 w-3" />
                                            Try now
                                        </div>
                                    </div>
                                );
                            })}
                        </div>
                    </CardContent>
                </Card>
            )}

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
                            <Button
                                variant="outline"
                                className="w-full gap-2"
                                onClick={() => handleTryTechnique(technique)}
                            >
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
                        {resources.map((resource, index) => (
                            <a
                                key={index}
                                href={resource.url}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="p-4 rounded-lg bg-secondary/50 hover:bg-secondary/70 transition-colors group"
                            >
                                <div className="flex items-center justify-between mb-1">
                                    <h4 className="font-medium">{resource.title}</h4>
                                    <ExternalLink className="h-4 w-4 text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity" />
                                </div>
                                <p className="text-sm text-muted-foreground">
                                    {resource.description}
                                </p>
                            </a>
                        ))}
                    </div>
                </CardContent>
            </Card>

            {/* Technique Modal */}
            {selectedTechnique && (
                <TechniqueModal
                    isOpen={isModalOpen}
                    onClose={handleCloseModal}
                    techniqueId={selectedTechnique.id}
                    techniqueName={selectedTechnique.name}
                />
            )}
        </div>
    );
}
