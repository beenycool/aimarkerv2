import { Suspense } from 'react';
import { Card, CardContent } from '@/app/components/ui/card';
import { Loader2 } from 'lucide-react';
import { AuthHeader } from '@/app/components/auth/AuthHeader';
import { AuthFooter } from '@/app/components/auth/AuthFooter';
import { LoginForm } from './LoginForm';

function LoginFormFallback() {
    return (
        <Card className="card-shadow">
            <CardContent className="pt-8 pb-8">
                <div className="flex justify-center">
                    <Loader2 className="h-8 w-8 animate-spin text-primary" />
                </div>
            </CardContent>
        </Card>
    );
}

export default function LoginPage() {
    return (
        <div className="min-h-screen flex items-center justify-center p-4 bg-gradient-to-br from-background via-background to-primary/5">
            <div className="w-full max-w-md space-y-6">
                <AuthHeader />
                <Suspense fallback={<LoginFormFallback />}>
                    <LoginForm />
                </Suspense>
                <AuthFooter />
            </div>
        </div>
    );
}
