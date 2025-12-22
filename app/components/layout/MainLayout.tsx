import { ReactNode } from "react";
import { AppSidebar } from "./AppSidebar";

interface MainLayoutProps {
    children: ReactNode;
}

export function MainLayout({ children }: MainLayoutProps) {
    return (
        <div className="flex min-h-screen w-full bg-background">
            <AppSidebar />
            <main className="flex-1 lg:pl-0 pl-0">
                <div className="min-h-screen pt-16 lg:pt-0">
                    {children}
                </div>
            </main>
        </div>
    );
}
