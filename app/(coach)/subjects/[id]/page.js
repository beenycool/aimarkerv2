'use client';

import React, { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { useParams } from 'next/navigation';
import { ArrowRight, Flame, Play } from 'lucide-react';
import { useStudentId } from '../../../components/AuthProvider';
import { bandFromPercent, pct } from '../../../services/dateUtils';
import {
  getSubject,
  listQuestionAttempts,
  pickTopWeaknesses,
  weaknessCountsFromAttempts,
} from '../../../services/studentOS';

function Card({ children }) {
  return <div className="bg-white rounded-2xl border border-slate-200 shadow-sm">{children}</div>;
}

function ProgressBar({ value }) {
  const v = Math.max(0, Math.min(100, Number(value) || 0));
  return (
    <div className="h-2 w-full bg-slate-100 rounded-full overflow-hidden">
      <div className="h-full bg-indigo-600" style={{ width: `${v}%` }} />
    </div>
  );
}

export default function SubjectDetailPage() {
  const params = useParams();
  const subjectId = params?.id;

  const studentId = useStudentId();
  const [subject, setSubject] = useState(null);
  const [attempts, setAttempts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    if (!studentId || !subjectId) return;

    let cancelled = false;
    (async () => {
      setLoading(true);
      setError(null);
      try {
        const [sub, atts] = await Promise.all([
          getSubject(studentId, subjectId),
          listQuestionAttempts(studentId, { subjectId, limit: 250 }),
        ]);
        if (cancelled) return;
        setSubject(sub);
        setAttempts(atts);
      } catch (e) {
        if (cancelled) return;
        setError(e?.message || 'Failed to load subject.');
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [studentId, subjectId]);

  const stats = useMemo(() => {
    const earned = attempts.reduce((s, a) => s + Number(a.marks_awarded || 0), 0);
    const total = attempts.reduce((s, a) => s + Number(a.marks_total || 0), 0);
    const percent = pct(earned, total);
    return {
      earned,
      total,
      percent,
      gradeBand: bandFromPercent(percent),
      attempts: attempts.length,
    };
  }, [attempts]);

  const topWeaknesses = useMemo(() => {
    const counts = weaknessCountsFromAttempts(attempts);
    return pickTopWeaknesses(counts, 8);
  }, [attempts]);

  const nextActions = useMemo(() => {
    // Simple rule: pick top 3 weaknesses and turn into “revise next”.
    return topWeaknesses.slice(0, 5).map((w) => ({
      title: w.label,
      hint: `Fix this by doing one timed question + a short checklist.`,
    }));
  }, [topWeaknesses]);

  return (
    <div className="space-y-6">
      <div className="flex items-start justify-between gap-4">
        <div>
          <div className="text-xs font-bold text-slate-500 uppercase tracking-wide">Subject</div>
          <h1 className="text-2xl md:text-3xl font-black tracking-tight text-slate-900">
            {loading ? 'Loading…' : subject?.name || 'Subject'}
          </h1>
          <div className="text-slate-600 mt-2">
            {subject?.exam_board ? `${subject.exam_board} · ` : ''}Target {subject?.target_grade || '—'}
          </div>
        </div>

        <Link
          href={`/daily?subject=${subjectId}`}
          className="inline-flex items-center justify-center gap-2 rounded-xl bg-indigo-600 px-4 py-3 text-sm font-extrabold text-white shadow-sm hover:bg-indigo-700"
        >
          <Play className="h-4 w-4" />
          Start Focus 5-a-day
        </Link>
      </div>

      {error ? (
        <Card>
          <div className="p-5 text-sm text-red-700 bg-red-50 rounded-2xl border border-red-200">{error}</div>
        </Card>
      ) : null}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <Card>
          <div className="p-5 border-b border-slate-100">
            <div className="text-sm font-extrabold text-slate-900">Readiness</div>
            <div className="text-xs text-slate-500 mt-1">
              {stats.percent}% · estimated band {stats.gradeBand}
            </div>
          </div>
          <div className="p-5 space-y-3">
            <ProgressBar value={stats.percent} />
            <div className="text-xs text-slate-500">
              Based on your marked questions in this subject. Not a grade boundary prediction.
            </div>
          </div>
        </Card>

        <Card className="lg:col-span-2">
          <div className="p-5 border-b border-slate-100 flex items-start justify-between gap-4">
            <div>
              <div className="text-sm font-extrabold text-slate-900">Revise next</div>
              <div className="text-xs text-slate-500 mt-1">3–5 recommendations based on your repeated primary flaws.</div>
            </div>
            <Link href="/exam" className="text-sm font-bold text-indigo-600 hover:text-indigo-800">
              Mark more →
            </Link>
          </div>
          <div className="p-5 grid grid-cols-1 md:grid-cols-2 gap-3">
            {loading ? (
              <div className="text-sm text-slate-500">Loading…</div>
            ) : nextActions.length === 0 ? (
              <div className="text-sm text-slate-600 md:col-span-2">
                No weaknesses yet. Do a paper in <Link className="font-bold text-indigo-600 hover:text-indigo-800" href="/exam">Exam</Link> and this will fill automatically.
              </div>
            ) : (
              nextActions.map((a) => (
                <div key={a.title} className="rounded-xl border border-slate-200 p-4 bg-slate-50">
                  <div className="font-extrabold text-slate-900">{a.title}</div>
                  <div className="text-sm text-slate-600 mt-1">{a.hint}</div>
                  <Link
                    href={`/daily?subject=${subjectId}`}
                    className="mt-3 inline-flex items-center gap-2 text-sm font-bold text-indigo-600 hover:text-indigo-800"
                  >
                    Drill this now <ArrowRight className="h-4 w-4" />
                  </Link>
                </div>
              ))
            )}
          </div>
        </Card>
      </div>

      <Card>
        <div className="p-5 border-b border-slate-100 flex items-start justify-between gap-4">
          <div>
            <div className="text-sm font-extrabold text-slate-900">Skill weaknesses</div>
            <div className="text-xs text-slate-500 mt-1">Top repeated “primary flaw” tags for this subject.</div>
          </div>
          <Flame className="h-5 w-5 text-indigo-600" />
        </div>

        <div className="p-5">
          {loading ? (
            <div className="text-sm text-slate-500">Loading…</div>
          ) : topWeaknesses.length === 0 ? (
            <div className="text-sm text-slate-600">Nothing yet — mark a paper and the app will start tagging your weaknesses automatically.</div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              {topWeaknesses.map((w) => (
                <div key={w.label} className="rounded-xl border border-slate-200 p-4">
                  <div className="flex items-start justify-between gap-3">
                    <div className="font-extrabold text-slate-900">{w.label}</div>
                    <div className="text-xs font-black text-slate-700 bg-slate-50 border border-slate-200 rounded-full px-2 py-1">
                      {w.count}×
                    </div>
                  </div>
                  <div className="text-sm text-slate-600 mt-2">
                    Quick fix: write a 3-step checklist for this weakness, then apply it on your next 6-mark style question.
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </Card>

      <div className="text-sm text-slate-600">
        <Link href="/subjects" className="font-bold text-indigo-600 hover:text-indigo-800">
          ← Back to subjects
        </Link>
      </div>
    </div>
  );
}
