'use client';

import React, { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { ArrowRight, CalendarDays, Flame, Play, TrendingUp } from 'lucide-react';
import { getOrCreateStudentId } from '../../services/studentId';
import { GCSE_KEY_DATES_2026 } from '../../services/gcseDates';
import { bandFromPercent, daysUntil, formatShort, pct } from '../../services/dateUtils';
import {
  listAssessments,
  listQuestionAttempts,
  listSubjects,
  pickTopWeaknesses,
  weaknessCountsFromAttempts,
} from '../../services/studentOS';

function Card({ children }) {
  return <div className="bg-white rounded-2xl border border-slate-200 shadow-sm">{children}</div>;
}

function CardHeader({ title, subtitle, right }) {
  return (
    <div className="p-5 border-b border-slate-100 flex items-start justify-between gap-4">
      <div>
        <div className="text-sm font-extrabold text-slate-900">{title}</div>
        {subtitle ? <div className="text-xs text-slate-500 mt-1">{subtitle}</div> : null}
      </div>
      {right}
    </div>
  );
}

function ProgressBar({ value }) {
  const v = Math.max(0, Math.min(100, Number(value) || 0));
  return (
    <div className="h-2 w-full bg-slate-100 rounded-full overflow-hidden">
      <div className="h-full bg-indigo-600" style={{ width: `${v}%` }} />
    </div>
  );
}

export default function DashboardPage() {
  const [studentId, setStudentId] = useState(null);
  const [loading, setLoading] = useState(true);
  const [subjects, setSubjects] = useState([]);
  const [attempts, setAttempts] = useState([]);
  const [assessments, setAssessments] = useState([]);
  const [error, setError] = useState(null);

  useEffect(() => {
    setStudentId(getOrCreateStudentId());
  }, []);

  useEffect(() => {
    if (!studentId) return;

    let cancelled = false;
    (async () => {
      setLoading(true);
      setError(null);
      try {
        const [subs, atts, asses] = await Promise.all([
          listSubjects(studentId),
          listQuestionAttempts(studentId, { limit: 250 }),
          listAssessments(studentId).catch(() => []), // assessments optional for MVP
        ]);

        if (cancelled) return;
        setSubjects(subs);
        setAttempts(atts);
        setAssessments(asses);
      } catch (e) {
        if (cancelled) return;
        setError(e?.message || 'Failed to load dashboard data.');
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [studentId]);

  const subjectStats = useMemo(() => {
    const byId = {};
    for (const s of subjects) {
      byId[s.id] = { subject: s, earned: 0, total: 0, lastAttempt: null };
    }
    for (const a of attempts) {
      const bucket = byId[a.subject_id];
      if (!bucket) continue;
      bucket.earned += Number(a.marks_awarded || 0);
      bucket.total += Number(a.marks_total || 0);
      if (!bucket.lastAttempt || new Date(a.attempted_at) > new Date(bucket.lastAttempt)) bucket.lastAttempt = a.attempted_at;
    }

    return Object.values(byId).map((row) => {
      const percent = pct(row.earned, row.total);
      return {
        ...row,
        percent,
        gradeBand: bandFromPercent(percent),
      };
    });
  }, [subjects, attempts]);

  const overallReadiness = useMemo(() => {
    const earned = attempts.reduce((s, a) => s + Number(a.marks_awarded || 0), 0);
    const total = attempts.reduce((s, a) => s + Number(a.marks_total || 0), 0);
    return pct(earned, total);
  }, [attempts]);

  const topWeaknesses = useMemo(() => {
    const counts = weaknessCountsFromAttempts(attempts);
    return pickTopWeaknesses(counts, 6);
  }, [attempts]);

  const nextMock = useMemo(() => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const upcoming = (assessments || [])
      .filter((a) => a?.date && new Date(a.date + 'T00:00:00') >= today)
      .sort((a, b) => new Date(a.date) - new Date(b.date));
    return upcoming[0] || null;
  }, [assessments]);

  return (
    <div className="space-y-8">
      <div className="flex flex-col md:flex-row md:items-end md:justify-between gap-4">
        <div>
          <h1 className="text-2xl md:text-3xl font-black tracking-tight text-slate-900">Dashboard</h1>
          <p className="text-slate-600 mt-2 max-w-2xl">
            Calm, clear progress. Small daily practice. Your plan adapts automatically.
          </p>
        </div>

        <Link
          href="/daily"
          className="inline-flex items-center justify-center gap-2 rounded-xl bg-indigo-600 px-4 py-3 text-sm font-extrabold text-white shadow-sm hover:bg-indigo-700"
        >
          <Play className="h-4 w-4" />
          Start Next Best Session
          <ArrowRight className="h-4 w-4" />
        </Link>
      </div>

      {error ? (
        <Card>
          <CardHeader title="Setup needed" subtitle={error} />
          <div className="p-5 text-sm text-slate-600">
            If this is your first time, make sure you’ve created the Student OS tables in Supabase and set your env vars.
          </div>
        </Card>
      ) : null}

      {/* Readiness + countdown */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <Card>
          <CardHeader
            title="Readiness"
            subtitle={loading ? 'Loading…' : `${overallReadiness}% (estimated grade band: ${bandFromPercent(overallReadiness)})`}
            right={<TrendingUp className="h-5 w-5 text-indigo-600" />}
          />
          <div className="p-5 space-y-3">
            <ProgressBar value={overallReadiness} />
            <div className="text-xs text-slate-500">
              This is a simple rolling average of your marked questions — it will get smarter as you do more work.
            </div>
          </div>
        </Card>

        <Card className="lg:col-span-2">
          <CardHeader title="Countdowns" subtitle="Built-in Summer 2026 key dates + your mocks." right={<CalendarDays className="h-5 w-5 text-indigo-600" />} />
          <div className="p-5 grid grid-cols-1 md:grid-cols-2 gap-3">
            {GCSE_KEY_DATES_2026.map((d) => {
              const days = daysUntil(d.date);
              const isPast = days < 0;
              return (
                <div key={d.id} className="rounded-xl border border-slate-200 p-4 bg-slate-50">
                  <div className="text-xs font-bold text-slate-500 uppercase tracking-wide">{d.label}</div>
                  <div className="mt-1 flex items-end justify-between gap-3">
                    <div className="text-lg font-extrabold text-slate-900">{formatShort(d.date)}</div>
                    <div className="text-sm font-bold text-slate-700">
                      {isPast ? 'done' : `${days} days`}
                    </div>
                  </div>
                </div>
              );
            })}

            <div className="rounded-xl border border-slate-200 p-4 bg-white md:col-span-2">
              <div className="text-xs font-bold text-slate-500 uppercase tracking-wide">Next mock</div>
              {nextMock ? (
                <div className="mt-2 flex flex-col md:flex-row md:items-center md:justify-between gap-2">
                  <div className="font-extrabold text-slate-900">
                    {formatShort(nextMock.date)} · {nextMock.kind || 'mock'}
                  </div>
                  <Link href="/assessments" className="text-sm font-bold text-indigo-600 hover:text-indigo-800 inline-flex items-center gap-1">
                    Manage <ArrowRight className="h-4 w-4" />
                  </Link>
                </div>
              ) : (
                <div className="mt-2 text-sm text-slate-600">
                  Add your mock dates in <Link className="font-bold text-indigo-600 hover:text-indigo-800" href="/assessments">Assessments</Link>.
                </div>
              )}
            </div>
          </div>
        </Card>
      </div>

      {/* Subjects */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <Card className="lg:col-span-2">
          <CardHeader
            title="Subjects"
            subtitle={subjects.length ? 'Your tiles update as you do papers.' : 'Add subjects to unlock the planner.'}
            right={<Link href="/subjects" className="text-sm font-bold text-indigo-600 hover:text-indigo-800">Edit</Link>}
          />
          <div className="p-5">
            {loading ? (
              <div className="text-sm text-slate-500">Loading…</div>
            ) : subjects.length === 0 ? (
              <div className="rounded-xl bg-slate-50 border border-slate-200 p-4">
                <div className="font-extrabold text-slate-900">Start by adding your subjects</div>
                <div className="text-sm text-slate-600 mt-1">Then do a paper in the Exam tab — your weaknesses will appear here automatically.</div>
                <Link href="/subjects" className="mt-3 inline-flex items-center gap-2 rounded-lg bg-indigo-600 px-3 py-2 text-sm font-extrabold text-white">
                  Add subjects <ArrowRight className="h-4 w-4" />
                </Link>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                {subjectStats.map((s) => (
                  <Link
                    key={s.subject.id}
                    href={`/subjects/${s.subject.id}`}
                    className="rounded-xl border border-slate-200 p-4 hover:bg-slate-50 transition-colors"
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <div className="font-extrabold text-slate-900">{s.subject.name}</div>
                        <div className="text-xs text-slate-500 mt-1">
                          {s.subject.exam_board ? `${s.subject.exam_board} · ` : ''}Target {s.subject.target_grade || '—'}
                        </div>
                      </div>
                      <div className="text-right">
                        <div className="text-xl font-black text-slate-900">{s.percent}%</div>
                        <div className="text-xs font-bold text-slate-500">Band {s.gradeBand}</div>
                      </div>
                    </div>
                    <div className="mt-3">
                      <ProgressBar value={s.percent} />
                      <div className="mt-2 text-xs text-slate-500">
                        {s.lastAttempt ? `Last marked: ${new Date(s.lastAttempt).toLocaleDateString()}` : 'No marked questions yet'}
                      </div>
                    </div>
                  </Link>
                ))}
              </div>
            )}
          </div>
        </Card>

        {/* Weaknesses */}
        <Card>
          <CardHeader title="Top weaknesses" subtitle="Pulled from your “primary flaw” tags when marking." right={<Flame className="h-5 w-5 text-indigo-600" />} />
          <div className="p-5">
            {loading ? (
              <div className="text-sm text-slate-500">Loading…</div>
            ) : topWeaknesses.length === 0 ? (
              <div className="text-sm text-slate-600">
                Mark a paper in <Link className="font-bold text-indigo-600 hover:text-indigo-800" href="/exam">Exam</Link> to populate this automatically.
              </div>
            ) : (
              <div className="space-y-3">
                {topWeaknesses.map((w) => (
                  <div key={w.label} className="rounded-xl border border-slate-200 p-3 bg-slate-50">
                    <div className="flex items-center justify-between gap-3">
                      <div className="text-sm font-extrabold text-slate-900 leading-snug">{w.label}</div>
                      <div className="text-xs font-black text-slate-700 bg-white border border-slate-200 rounded-full px-2 py-1">
                        {w.count}×
                      </div>
                    </div>
                  </div>
                ))}
                <Link href="/daily" className="inline-flex items-center gap-2 text-sm font-bold text-indigo-600 hover:text-indigo-800">
                  Use these in today’s 5-a-day <ArrowRight className="h-4 w-4" />
                </Link>
              </div>
            )}
          </div>
        </Card>
      </div>

      {/* Study technique nudge */}
      <Card>
        <CardHeader title="What to do today" subtitle="One focused block + a short daily pack beats cramming." right={<TrendingUp className="h-5 w-5 text-indigo-600" />} />
        <div className="p-5 grid grid-cols-1 md:grid-cols-3 gap-3 text-sm">
          <div className="rounded-xl border border-slate-200 p-4 bg-slate-50">
            <div className="font-extrabold text-slate-900">1) Start Next Best Session</div>
            <div className="text-slate-600 mt-1">Your daily pack will target your biggest “primary flaw” themes.</div>
          </div>
          <div className="rounded-xl border border-slate-200 p-4 bg-slate-50">
            <div className="font-extrabold text-slate-900">2) Mark one question properly</div>
            <div className="text-slate-600 mt-1">Quality feedback creates the plan. Use the Exam tab when you can.</div>
          </div>
          <div className="rounded-xl border border-slate-200 p-4 bg-slate-50">
            <div className="font-extrabold text-slate-900">3) Reflect (30 seconds)</div>
            <div className="text-slate-600 mt-1">Confidence + difficulty helps the planner adapt without guilt.</div>
          </div>
        </div>
      </Card>
    </div>
  );
}
