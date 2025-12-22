'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import React, { useMemo, useState } from 'react';
import {
  LayoutDashboard,
  BookOpen,
  CalendarDays,
  ListChecks,
  ClipboardList,
  Brain,
  Sparkles,
  Settings,
  PenLine,
  X,
  Menu
} from 'lucide-react';

const NAV = [
  { href: '/dashboard', label: 'Dashboard', icon: LayoutDashboard },
  { href: '/subjects', label: 'Subjects', icon: BookOpen },
  { href: '/timetable', label: 'Timetable', icon: CalendarDays },
  { href: '/daily', label: 'Daily 5-a-day', icon: ListChecks },
  { href: '/study-techniques', label: 'Study techniques', icon: Sparkles },
  { href: '/assessments', label: 'Assessments', icon: ClipboardList },
  { href: '/memory', label: 'Memory bank', icon: Brain },
  { href: '/settings', label: 'Settings', icon: Settings },
];

function NavItem({ href, label, Icon, active, onClick }) {
  return (
    <Link
      href={href}
      onClick={onClick}
      className={[
        'flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-semibold transition-colors',
        active ? 'bg-indigo-600 text-white shadow-sm' : 'text-slate-700 hover:bg-slate-100'
      ].join(' ')}
    >
      <Icon className="h-4 w-4" />
      <span>{label}</span>
    </Link>
  );
}

export default function CoachShell({ children }) {
  const pathname = usePathname();
  const [open, setOpen] = useState(false);

  const navItems = useMemo(() => {
    return NAV.map((item) => ({
      ...item,
      active: pathname === item.href || (item.href !== '/dashboard' && pathname?.startsWith(item.href + '/')),
    }));
  }, [pathname]);

  return (
    <div className="min-h-screen bg-slate-50">
      {/* Mobile top bar */}
      <div className="md:hidden sticky top-0 z-30 bg-white border-b border-slate-200">
        <div className="flex items-center justify-between px-4 py-3">
          <button
            onClick={() => setOpen(true)}
            className="inline-flex items-center justify-center rounded-lg p-2 text-slate-700 hover:bg-slate-100"
            aria-label="Open menu"
          >
            <Menu className="h-5 w-5" />
          </button>

          <Link href="/dashboard" className="font-extrabold tracking-tight text-slate-900">
            GCSE Planner
          </Link>

          <Link
            href="/exam"
            className="inline-flex items-center gap-2 rounded-lg bg-indigo-600 px-3 py-2 text-sm font-bold text-white"
          >
            <PenLine className="h-4 w-4" />
            Exam
          </Link>
        </div>
      </div>

      <div className="flex">
        {/* Sidebar */}
        <aside
          className={[
            'fixed inset-y-0 left-0 z-40 w-72 bg-white border-r border-slate-200 md:sticky md:translate-x-0',
            open ? 'translate-x-0' : '-translate-x-full',
            'transition-transform md:transition-none'
          ].join(' ')}
        >
          <div className="flex h-full flex-col">
            <div className="flex items-center justify-between px-5 py-4 border-b border-slate-200">
              <Link href="/dashboard" className="flex items-center gap-2">
                <div className="h-9 w-9 rounded-xl bg-indigo-600 text-white flex items-center justify-center font-black">
                  G
                </div>
                <div className="leading-tight">
                  <div className="font-extrabold text-slate-900">GCSE Coach</div>
                  <div className="text-xs text-slate-500">calm, clear, consistent</div>
                </div>
              </Link>

              <button
                onClick={() => setOpen(false)}
                className="md:hidden inline-flex items-center justify-center rounded-lg p-2 text-slate-700 hover:bg-slate-100"
                aria-label="Close menu"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <nav className="flex-1 px-3 py-4 space-y-1">
              {navItems.map((item) => (
                <NavItem
                  key={item.href}
                  href={item.href}
                  label={item.label}
                  Icon={item.icon}
                  active={item.active}
                  onClick={() => setOpen(false)}
                />
              ))}
            </nav>

            <div className="p-4 border-t border-slate-200">
              <Link
                href="/exam"
                className="w-full inline-flex items-center justify-center gap-2 rounded-lg bg-slate-900 px-3 py-3 text-sm font-extrabold text-white hover:bg-slate-800"
              >
                <PenLine className="h-4 w-4" />
                Start a paper
              </Link>

              <div className="mt-3 text-xs text-slate-500 leading-relaxed">
                Tip: aim for one <span className="font-semibold text-slate-700">25–45 min</span> session + the{' '}
                <span className="font-semibold text-slate-700">5-a-day</span> most days.
              </div>
            </div>
          </div>
        </aside>

        {/* Backdrop for mobile */}
        {open && (
          <button
            className="fixed inset-0 z-30 bg-black/30 md:hidden"
            onClick={() => setOpen(false)}
            aria-label="Close menu backdrop"
          />
        )}

        {/* Main */}
        <main className="flex-1 min-w-0 px-4 py-6 md:px-10 md:py-10">
          {children}
        </main>
      </div>
    </div>
  );
}
