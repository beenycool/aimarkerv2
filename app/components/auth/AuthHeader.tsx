import { BookOpen } from 'lucide-react';

export function AuthHeader() {
    return (
        <div className="text-center space-y-2">
            <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-primary/10 mb-4">
                <BookOpen className="h-8 w-8 text-primary" />
            </div>
            <h1 className="text-2xl font-semibold">GCSE Study Planner</h1>
            <p className="text-muted-foreground">AI-powered exam preparation</p>
        </div>
    );
}
