'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { useAuth } from '@/app/components/AuthProvider';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/app/components/ui/card';
import { Button } from '@/app/components/ui/button';
import { Input } from '@/app/components/ui/input';
import { Label } from '@/app/components/ui/label';
import { Loader2, UserPlus, BookOpen, ArrowRight, CheckCircle2, RefreshCw, Mail } from 'lucide-react';
import { createClient } from '@/app/lib/supabase/client';

export default function SignUpPage() {
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [confirmPassword, setConfirmPassword] = useState('');
    const [error, setError] = useState('');
    const [loading, setLoading] = useState(false);
    const [success, setSuccess] = useState(false);
    const [resending, setResending] = useState(false);
    const [resendSuccess, setResendSuccess] = useState(false);
    const { signUp } = useAuth();
    const router = useRouter();

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setError('');

        // Validate passwords match
        if (password !== confirmPassword) {
            setError('Passwords do not match');
            return;
        }

        // Validate password length
        if (password.length < 6) {
            setError('Password must be at least 6 characters');
            return;
        }

        setLoading(true);

        const { error } = await signUp(email, password);

        if (error) {
            setError(error.message);
            setLoading(false);
        } else {
            setSuccess(true);
            setLoading(false);
        }
    };

    const handleResendEmail = async () => {
        setResending(true);
        setResendSuccess(false);

        const supabase = createClient();
        const { error } = await supabase.auth.resend({
            type: 'signup',
            email: email,
            options: {
                emailRedirectTo: `${window.location.origin}/auth/callback`,
            },
        });

        setResending(false);
        if (!error) {
            setResendSuccess(true);
            // Reset success message after 5 seconds
            setTimeout(() => setResendSuccess(false), 5000);
        }
    };

    if (success) {
        return (
            <div className="min-h-screen flex items-center justify-center p-4 bg-gradient-to-br from-background via-background to-primary/5">
                <Card className="w-full max-w-md card-shadow">
                    <CardContent className="pt-8 pb-8 text-center space-y-4">
                        <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-success/10 mx-auto">
                            <CheckCircle2 className="h-8 w-8 text-success" />
                        </div>
                        <h2 className="text-xl font-semibold">Check your email</h2>
                        <p className="text-muted-foreground">
                            We&apos;ve sent a confirmation link to <strong>{email}</strong>.
                            Click the link to activate your account.
                        </p>

                        {resendSuccess && (
                            <div className="p-3 rounded-lg bg-success/10 border border-success/20">
                                <p className="text-sm text-success flex items-center justify-center gap-2">
                                    <Mail className="h-4 w-4" />
                                    Email sent! Check your inbox.
                                </p>
                            </div>
                        )}

                        <div className="pt-2 space-y-3">
                            <Button
                                variant="outline"
                                className="w-full gap-2"
                                onClick={handleResendEmail}
                                disabled={resending}
                            >
                                {resending ? (
                                    <Loader2 className="h-4 w-4 animate-spin" />
                                ) : (
                                    <RefreshCw className="h-4 w-4" />
                                )}
                                Resend confirmation email
                            </Button>
                            <Link href="/login">
                                <Button variant="ghost" className="w-full">
                                    Back to login
                                </Button>
                            </Link>
                        </div>
                    </CardContent>
                </Card>
            </div>
        );
    }


    return (
        <div className="min-h-screen flex items-center justify-center p-4 bg-gradient-to-br from-background via-background to-primary/5">
            <div className="w-full max-w-md space-y-6">
                {/* Logo/Brand */}
                <div className="text-center space-y-2">
                    <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-primary/10 mb-4">
                        <BookOpen className="h-8 w-8 text-primary" />
                    </div>
                    <h1 className="text-2xl font-semibold">GCSE Study Planner</h1>
                    <p className="text-muted-foreground">AI-powered exam preparation</p>
                </div>

                <Card className="card-shadow">
                    <CardHeader className="text-center pb-2">
                        <CardTitle className="text-xl">Create an Account</CardTitle>
                        <CardDescription>Sync your study progress across all your devices</CardDescription>
                    </CardHeader>
                    <CardContent className="pt-4">
                        <form onSubmit={handleSubmit} className="space-y-4">
                            <div className="space-y-2">
                                <Label htmlFor="email">Email</Label>
                                <Input
                                    id="email"
                                    type="email"
                                    value={email}
                                    onChange={(e) => setEmail(e.target.value)}
                                    placeholder="you@example.com"
                                    required
                                    autoComplete="email"
                                />
                            </div>
                            <div className="space-y-2">
                                <Label htmlFor="password">Password</Label>
                                <Input
                                    id="password"
                                    type="password"
                                    value={password}
                                    onChange={(e) => setPassword(e.target.value)}
                                    placeholder="••••••••"
                                    required
                                    autoComplete="new-password"
                                />
                                <p className="text-xs text-muted-foreground">Must be at least 6 characters</p>
                            </div>
                            <div className="space-y-2">
                                <Label htmlFor="confirmPassword">Confirm Password</Label>
                                <Input
                                    id="confirmPassword"
                                    type="password"
                                    value={confirmPassword}
                                    onChange={(e) => setConfirmPassword(e.target.value)}
                                    placeholder="••••••••"
                                    required
                                    autoComplete="new-password"
                                />
                            </div>

                            {error && (
                                <div className="p-3 rounded-lg bg-destructive/10 border border-destructive/20">
                                    <p className="text-sm text-destructive">{error}</p>
                                </div>
                            )}

                            <Button type="submit" className="w-full" disabled={loading}>
                                {loading ? (
                                    <Loader2 className="h-4 w-4 animate-spin mr-2" />
                                ) : (
                                    <UserPlus className="h-4 w-4 mr-2" />
                                )}
                                Create Account
                            </Button>
                        </form>

                        <div className="mt-6 text-center text-sm">
                            <span className="text-muted-foreground">Already have an account? </span>
                            <Link href="/login" className="text-primary font-medium hover:underline">
                                Sign in
                            </Link>
                        </div>
                    </CardContent>
                </Card>

                {/* Continue without account */}
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
            </div>
        </div>
    );
}
