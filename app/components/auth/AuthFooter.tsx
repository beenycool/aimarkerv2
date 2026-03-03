import Link from 'next/link';
import { ArrowRight } from 'lucide-react';

export function AuthFooter() {
    return (
        <div className="text-center">
            <Link
                href="/dashboard"
                className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground transition-colors"
            >
                Continue without an account
                <ArrowRight className="h-4 w-4" />
            </Link>
            <p className="text-xs text-muted-foreground mt-1">
                Your data will be stored on this device only
            </p>
        </div>
    );
}
