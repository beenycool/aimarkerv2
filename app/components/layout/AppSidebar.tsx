"use client";

import { useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
    LayoutDashboard,
    BookOpen,
    Calendar,
    Star,
    ClipboardCheck,
    Brain,
    Settings,
    Menu,
    X,
    GraduationCap,
    PenLine,
} from "lucide-react";
import { cn } from "@/app/lib/utils";
import { Button } from "@/app/components/ui/button";

const navItems = [
    { title: "Dashboard", path: "/dashboard", icon: LayoutDashboard },
    { title: "Subjects", path: "/subjects", icon: BookOpen },
    { title: "Timetable", path: "/timetable", icon: Calendar },
    { title: "Daily 5-a-day", path: "/daily", icon: Star },
    { title: "Assessments", path: "/assessments", icon: ClipboardCheck },
    { title: "Memory Bank", path: "/memory", icon: Brain },
    { title: "Study Techniques", path: "/study-techniques", icon: GraduationCap },
    { title: "Settings", path: "/settings", icon: Settings },
];

export function AppSidebar() {
    const [isOpen, setIsOpen] = useState(false);
    const pathname = usePathname();

    return (
        <>
            {/* Mobile menu button */}
            <Button
                variant="ghost"
                size="icon"
                className="fixed top-4 left-4 z-50 lg:hidden"
                onClick={() => setIsOpen(!isOpen)}
            >
                {isOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
            </Button>

            {/* Overlay */}
            {isOpen && (
                <div
                    className="fixed inset-0 bg-foreground/20 z-40 lg:hidden"
                    onClick={() => setIsOpen(false)}
                />
            )}

            {/* Sidebar */}
            <aside
                className={cn(
                    "fixed lg:sticky top-0 left-0 z-40 h-screen w-64 bg-sidebar border-r border-sidebar-border transition-transform duration-200 ease-in-out",
                    isOpen ? "translate-x-0" : "-translate-x-full lg:translate-x-0"
                )}
            >
                <div className="flex flex-col h-full">
                    {/* Logo */}
                    <div className="flex items-center gap-3 px-6 py-5 border-b border-sidebar-border">
                        <div className="flex items-center justify-center w-10 h-10 rounded-lg bg-primary">
                            <GraduationCap className="h-5 w-5 text-primary-foreground" />
                        </div>
                        <div>
                            <h1 className="font-semibold text-sidebar-foreground">Aimarker</h1>
                            <p className="text-xs text-muted-foreground">GCSE Coach</p>
                        </div>
                    </div>

                    {/* Navigation */}
                    <nav className="flex-1 px-3 py-4 space-y-1 overflow-y-auto">
                        {navItems.map((item) => {
                            const isActive = pathname === item.path ||
                                (item.path !== "/dashboard" && pathname?.startsWith(item.path + "/"));
                            return (
                                <Link
                                    key={item.path}
                                    href={item.path}
                                    onClick={() => setIsOpen(false)}
                                    className={cn(
                                        "flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors",
                                        isActive
                                            ? "bg-sidebar-accent text-sidebar-primary"
                                            : "text-sidebar-foreground hover:bg-sidebar-accent/50"
                                    )}
                                >
                                    <item.icon className="h-5 w-5" />
                                    {item.title}
                                </Link>
                            );
                        })}
                    </nav>

                    {/* Exam Button */}
                    <div className="p-4 border-t border-sidebar-border">
                        <Link
                            href="/exam"
                            className="w-full inline-flex items-center justify-center gap-2 rounded-lg bg-primary px-3 py-3 text-sm font-semibold text-primary-foreground hover:bg-primary/90"
                        >
                            <PenLine className="h-4 w-4" />
                            Start a paper
                        </Link>
                    </div>

                    {/* Footer */}
                    <div className="px-4 py-4 border-t border-sidebar-border">
                        <div className="flex items-center gap-3 px-2">
                            <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center">
                                <span className="text-sm font-medium text-primary">S</span>
                            </div>
                            <div className="flex-1 min-w-0">
                                <p className="text-sm font-medium text-sidebar-foreground truncate">
                                    Student
                                </p>
                                <p className="text-xs text-muted-foreground truncate">
                                    Year 11
                                </p>
                            </div>
                        </div>
                    </div>
                </div>
            </aside>
        </>
    );
}
