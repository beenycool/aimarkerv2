'use client';

import React, { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { BookOpenCheck, Sparkles, ArrowRight } from 'lucide-react';
import { getOrCreateStudentId } from '../../services/studentId';
import { getOrCreateSettings } from '../../services/studentOS';

function Card({ children, className = '' }) {
  return <div className={`bg-white rounded-2xl border border-slate-200 shadow-sm ${className}`}>{children}</div>;
}

const TECHNIQUES = [
  {
    title: 'Retrieval practice',
    why: 'Actively recalling information builds stronger memory than rereading.',
    do: 'Close notes → write what you remember → check → repeat tomorrow.',
    tryHref: '/daily',
  },
  {
    title: 'Spaced repetition',
    why: 'Spacing beats cramming. You forget a little, then strengthen the memory.',
    do: 'Revisit the same topic after 1 day, 3 days, 7 days, then 14 days.',
    tryHref: '/timetable',
  },
  {
    title: 'Interleaving',
    why: 'Mixing topics improves discrimination: you learn when to use which method.',
    do: 'Do 2 questions from different topics rather than 4 from one topic.',
    tryHref: '/daily',
  },
  {
    title: 'Practice papers (timed)',
    why: 'Exam technique is a skill. Timed practice reduces panic on the day.',
    do: 'Do 1 question timed → mark it → write a “fix checklist” for next time.',
    tryHref: '/exam',
  },
  {
    title: 'Mistake replay',
    why: 'Correcting errors is where most growth happens.',
    do: 'Redo the same question 24–48h later with one specific fix goal.',
    tryHref: '/daily',
  },
  {
    title: 'Self explanation',
    why: 'If you can teach it, you understand it.',
    do: 'Explain a concept in 5 sentences without notes. If you can’t, revise that.',
    tryHref: '/daily',
  },
];

export default function StudyTechniquesPage() {
  const [studentId, setStudentId] = useState(null);
  const [settings, setSettings] = useState(null);

  useEffect(() => {
    setStudentId(getOrCreateStudentId());
  }, []);

  useEffect(() => {
    if (!studentId) return;
    getOrCreateSettings(studentId)
      .then(setSettings)
      .catch(() => setSettings(null));
  }, [studentId]);

  const feedOn = Boolean(settings?.study_techniques_feed);

  return (
    <div className="space-y-6">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl md:text-3xl font-black tracking-tight text-slate-900">Study techniques</h1>
          <p className="text-slate-600 mt-2 max-w-2xl">
            Simple, evidence-based methods — turned into actions you can do today.
          </p>
        </div>
        <Sparkles className="h-6 w-6 text-indigo-600" />
      </div>

      <Card>
        <div className="p-5 border-b border-slate-100 flex items-start justify-between gap-4">
          <div>
            <div className="text-sm font-extrabold text-slate-900">Weekly feed</div>
            <div className="text-xs text-slate-500 mt-1">
              {feedOn ? 'Enabled' : 'Disabled'} · Toggle in Settings if you want gentle reminders.
            </div>
          </div>
          <Link href="/settings" className="text-sm font-bold text-indigo-600 hover:text-indigo-800">
            Settings →
          </Link>
        </div>
        <div className="p-5 text-sm text-slate-700">
          The app already uses these techniques behind the scenes (daily retrieval + spaced review). Turning the feed on
          just adds small nudges.
        </div>
      </Card>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {TECHNIQUES.map((t) => (
          <Card key={t.title}>
            <div className="p-5 border-b border-slate-100 flex items-start justify-between gap-4">
              <div>
                <div className="text-sm font-extrabold text-slate-900">{t.title}</div>
                <div className="text-xs text-slate-500 mt-1">{t.why}</div>
              </div>
              <BookOpenCheck className="h-5 w-5 text-indigo-600" />
            </div>
            <div className="p-5 space-y-3">
              <div className="text-sm text-slate-700">{t.do}</div>
              <Link
                href={t.tryHref}
                className="inline-flex items-center gap-2 text-sm font-extrabold text-indigo-600 hover:text-indigo-800"
              >
                Try now <ArrowRight className="h-4 w-4" />
              </Link>
            </div>
          </Card>
        ))}
      </div>
    </div>
  );
}
