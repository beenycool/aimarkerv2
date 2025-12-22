'use client';

import React, { useCallback, useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { Plus, Target } from 'lucide-react';
import { getOrCreateStudentId } from '../../services/studentId';
import { createAssessment, listAssessments, listSubjects } from '../../services/studentOS';
import { daysUntil, formatShort } from '../../services/dateUtils';

function Card({ children, className = '' }) {
  return <div className={`bg-white rounded-2xl border border-slate-200 shadow-sm ${className}`}>{children}</div>;
}

const KINDS = [
  { value: 'mock', label: 'Mock' },
  { value: 'past_paper', label: 'Past paper' },
  { value: 'quiz', label: 'Quiz' },
];

export default function AssessmentsPage() {
  const [studentId, setStudentId] = useState(null);
  const [subjects, setSubjects] = useState([]);
  const [assessments, setAssessments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const [form, setForm] = useState({
    subject_id: '',
    kind: 'mock',
    date: '',
    score: '',
    total: '',
    notes: '',
  });

  useEffect(() => {
    setStudentId(getOrCreateStudentId());
  }, []);

  const reload = useCallback(async (sid) => {
    setLoading(true);
    setError(null);
    try {
      const [subs, asses] = await Promise.all([
        listSubjects(sid),
        listAssessments(sid),
      ]);
      setSubjects(subs);
      setAssessments(asses);
    } catch (e) {
      setError(e?.message || 'Failed to load assessments.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (!studentId) return;
    reload(studentId);
  }, [studentId, reload]);

  const upcoming = useMemo(() => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    return (assessments || [])
      .filter((a) => a?.date && new Date(a.date + 'T00:00:00') >= today)
      .sort((a, b) => new Date(a.date) - new Date(b.date));
  }, [assessments]);

  const onAdd = async (e) => {
    e.preventDefault();
    if (!studentId) return;
    setError(null);
    try {
      await createAssessment(studentId, {
        subject_id: form.subject_id || null,
        kind: form.kind,
        date: form.date || null,
        score: form.score === '' ? null : Number(form.score),
        total: form.total === '' ? null : Number(form.total),
        notes: form.notes || null,
      });
      setForm({ subject_id: '', kind: 'mock', date: '', score: '', total: '', notes: '' });
      await reload(studentId);
    } catch (e2) {
      setError(e2?.message || 'Failed to add assessment.');
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row md:items-end md:justify-between gap-4">
        <div>
          <h1 className="text-2xl md:text-3xl font-black tracking-tight text-slate-900">Assessments</h1>
          <p className="text-slate-600 mt-2 max-w-2xl">
            Add your mocks and key assessments. The planner uses these dates to raise urgency automatically.
          </p>
        </div>

        <Link href="/timetable" className="text-sm font-bold text-indigo-600 hover:text-indigo-800">
          View timetable →
        </Link>
      </div>

      {error ? (
        <Card>
          <div className="p-5 text-sm text-red-700 bg-red-50 rounded-2xl border border-red-200">{error}</div>
        </Card>
      ) : null}

      <Card>
        <div className="p-5 border-b border-slate-100">
          <div className="text-sm font-extrabold text-slate-900">Add an assessment</div>
          <div className="text-xs text-slate-500 mt-1">Mocks matter: they influence scheduling urgency.</div>
        </div>

        <form onSubmit={onAdd} className="p-5 grid grid-cols-1 md:grid-cols-6 gap-3">
          <select
            value={form.subject_id}
            onChange={(e) => setForm((p) => ({ ...p, subject_id: e.target.value }))}
            className="md:col-span-2 w-full rounded-xl border border-slate-200 px-3 py-3 text-sm font-semibold outline-none focus:ring-2 focus:ring-indigo-500 bg-white"
          >
            <option value="">(Any subject)</option>
            {subjects.map((s) => (
              <option key={s.id} value={s.id}>
                {s.name}
              </option>
            ))}
          </select>

          <select
            value={form.kind}
            onChange={(e) => setForm((p) => ({ ...p, kind: e.target.value }))}
            className="w-full rounded-xl border border-slate-200 px-3 py-3 text-sm font-semibold outline-none focus:ring-2 focus:ring-indigo-500 bg-white"
          >
            {KINDS.map((k) => (
              <option key={k.value} value={k.value}>
                {k.label}
              </option>
            ))}
          </select>

          <input
            type="date"
            value={form.date}
            onChange={(e) => setForm((p) => ({ ...p, date: e.target.value }))}
            className="w-full rounded-xl border border-slate-200 px-3 py-3 text-sm font-semibold outline-none focus:ring-2 focus:ring-indigo-500"
          />

          <input
            type="number"
            value={form.score}
            onChange={(e) => setForm((p) => ({ ...p, score: e.target.value }))}
            placeholder="Score"
            className="w-full rounded-xl border border-slate-200 px-3 py-3 text-sm font-semibold outline-none focus:ring-2 focus:ring-indigo-500"
          />

          <input
            type="number"
            value={form.total}
            onChange={(e) => setForm((p) => ({ ...p, total: e.target.value }))}
            placeholder="Total"
            className="w-full rounded-xl border border-slate-200 px-3 py-3 text-sm font-semibold outline-none focus:ring-2 focus:ring-indigo-500"
          />

          <textarea
            value={form.notes}
            onChange={(e) => setForm((p) => ({ ...p, notes: e.target.value }))}
            placeholder="Notes (optional)"
            rows={2}
            className="md:col-span-6 w-full rounded-xl border border-slate-200 px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-indigo-500"
          />

          <button
            type="submit"
            className="md:col-span-6 inline-flex items-center justify-center gap-2 rounded-xl bg-indigo-600 px-4 py-3 text-sm font-extrabold text-white shadow-sm hover:bg-indigo-700"
          >
            <Plus className="h-4 w-4" />
            Add assessment
          </button>
        </form>
      </Card>

      <Card>
        <div className="p-5 border-b border-slate-100 flex items-start justify-between gap-4">
          <div>
            <div className="text-sm font-extrabold text-slate-900">Upcoming</div>
            <div className="text-xs text-slate-500 mt-1">{loading ? 'Loading…' : `${upcoming.length} upcoming`}</div>
          </div>
          <Target className="h-5 w-5 text-indigo-600" />
        </div>

        <div className="p-5">
          {loading ? (
            <div className="text-sm text-slate-500">Loading…</div>
          ) : upcoming.length === 0 ? (
            <div className="text-sm text-slate-600">No upcoming assessments yet.</div>
          ) : (
            <div className="space-y-3">
              {upcoming.map((a) => {
                const subjectName = subjects.find((s) => s.id === a.subject_id)?.name || 'Any subject';
                const days = a.date ? daysUntil(a.date) : null;
                return (
                  <div key={a.id} className="rounded-xl border border-slate-200 p-4">
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <div className="font-extrabold text-slate-900">
                          {formatShort(a.date)} · {a.kind} · {subjectName}
                        </div>
                        <div className="text-sm text-slate-600 mt-1">
                          {typeof a.score === 'number' && typeof a.total === 'number' ? `${a.score}/${a.total}` : 'No score yet'}
                          {a.notes ? ` · ${a.notes}` : ''}
                        </div>
                      </div>
                      <div className="text-sm font-bold text-slate-700">{days !== null ? `${days} days` : ''}</div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </Card>
    </div>
  );
}
