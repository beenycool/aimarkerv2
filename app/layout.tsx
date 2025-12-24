import './globals.css';
import 'katex/dist/katex.min.css';

import { ThemeProvider } from 'next-themes';
import { AuthProvider } from './components/AuthProvider';
import { Toaster } from './components/ui/sonner';

export const metadata = {
    title: 'GCSE Planner + AI Marker',
    description: 'A calm GCSE study planner with an AI-powered paper marker.',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
    return (
        <html lang="en" suppressHydrationWarning>
            <body className="bg-background text-foreground">
                <ThemeProvider attribute="class" defaultTheme="light" enableSystem>
                    <AuthProvider>
                        {children}
                        <Toaster />
                    </AuthProvider>
                </ThemeProvider>
            </body>
        </html>
    );
}
