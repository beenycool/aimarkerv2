import './globals.css';
import { ThemeProvider } from 'next-themes';
import { AuthProvider } from './components/AuthProvider';

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
                    </AuthProvider>
                </ThemeProvider>
            </body>
        </html>
    );
}
