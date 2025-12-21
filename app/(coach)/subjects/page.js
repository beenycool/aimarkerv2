'use client';

import React, { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { Plus, Trash2 } from 'lucide-react';
import { getOrCreateStudentId } from '../../services/studentId';
import { createSubject, deleteSubject, listSubjects } from '../../services/studentOS';

const BOARDS = ['AQA', 'Edexcel', 'OCR', 'WJEC', 'CCEA'];
const TARGETS = ['9', '8', '7', '6', '5', '4', '3'];

function Card({ children }) {
  return <div className="bg-white rounded-2xl border border-slate-200 shadow-sm">{children}</div>;
}

export default function SubjectsPage() {
  const [studentId, setStudentId] = useState(null);
  const [subjects, setSubjects] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const [form, setForm] = useState({
    name: '',
    exam_board: 'AQA',
    target_grade: '7',
    weekly_minutes: 90,
    tier: '',
  });

  useEffect(() => {
    setStudentId(getOrCreateStudentId());
  }, []);

  const reload = async (sid) => {
    setLoading(true);
    setError(null);
    try {
      const subs = await listSubjects(sid);
      setSubjects(subs);
    } catch (e) {
      setError(e?.message || 'Failed to load subjects.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (!studentId) return;
    reload(studentId);
  }, [studentId]);

  const canAdd = useMemo(() => form.name.trim().length >= 2, [form.name]);

  const onAdd = async (e) => {
    e.preventDefault();
    if (!studentId || !canAdd) return;
    setError(null);
    try {
      await createSubject(studentId, {
        name: form.name.trim(),
        exam_board: form.exam_board,
        target_grade: form.target_grade,
        weekly_minutes: Number(form.weekly_minutes) || 0,
        tier: form.tier || null,
      });
      setForm((p) => ({ ...p, name: '' }));
      await reload(studentId);
    } catch (e2) {
      setError(e2?.message || 'Failed to add subject.');
    }
  };

  const onDelete = async (id) => {
    if (!studentId) return;
    const ok = window.confirm('Remove this subject? (Your attempts and sessions may also be deleted if you enabled cascades.)');
    if (!ok) return;
    setError(null);
    try {
      await deleteSubject(studentId, id);
      await reload(studentId);
    } catch (e2) {
      setError(e2?.message || 'Failed to delete subject.');
    }
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl md:text-3xl font-black tracking-tight text-slate-900">Subjects</h1>
        <p className="text-slate-600 mt-2 max-w-2xl">
          Add the subjects you’re taking. Your board matters later for timetable import, but you can change it anytime.
        </p>
      </div>

      {error ? (
        <Card>
          <div className="p-5 text-sm text-red-700 bg-red-50 rounded-2xl border border-red-200">{error}</div>
        </Card>
      ) : null}

      <Card>
        <div className="p-5 border-b border-slate-100">
          <div className="text-sm font-extrabold text-slate-900">Add a subject</div>
          <div className="text-xs text-slate-500 mt-1">Keep it simple. You can refine topics later.</div>
        </div>

        <form onSubmit={onAdd} className="p-5 grid grid-cols-1 md:grid-cols-5 gap-3">
          <input
            value={form.name}
            onChange={(e) => setForm((p) => ({ ...p, name: e.target.value }))}
            placeholder="e.g. Maths, English Lit, Biology…"
            className="md:col-span-2 w-full rounded-xl border border-slate-200 px-3 py-3 text-sm font-semibold outline-none focus:ring-2 focus:ring-indigo-500"
          />

          <select
            value={form.exam_board}
            onChange={(e) => setForm((p) => ({ ...p, exam_board: e.target.value }))}
            className="w-full rounded-xl border border-slate-200 px-3 py-3 text-sm font-semibold outline-none focus:ring-2 focus:ring-indigo-500 bg-white"
          >
            {BOARDS.map((b) => (
              <option key={b} value={b}>
                {b}
              </option>
            ))}
          </select>

          <select
            value={form.target_grade}
            onChange={(e) => setForm((p) => ({ ...p, target_grade: e.target.value }))}
            className="w-full rounded-xl border border-slate-200 px-3 py-3 text-sm font-semibold outline-none focus:ring-2 focus:ring-indigo-500 bg-white"
          >
            {TARGETS.map((g) => (
              <option key={g} value={g}>
                Target {g}
              </option>
            ))}
          </select>

          <div className="flex gap-2">
            <input
              value={form.weekly_minutes}
              onChange={(e) => setForm((p) => ({ ...p, weekly_minutes: e.target.value }))}
              type="number"
              min={0}
              className="w-full rounded-xl border border-slate-200 px-3 py-3 text-sm font-semibold outline-none focus:ring-2 focus:ring-indigo-500"
              title="Weekly minutes"
            />
            <button
              type="submit"
              disabled={!canAdd}
              className={[
                'inline-flex items-center gap-2 rounded-xl px-4 py-3 text-sm font-extrabold',
                canAdd ? 'bg-indigo-600 text-white hover:bg-indigo-700' : 'bg-slate-200 text-slate-400'
              ].join(' ')}
            >
              <Plus className="h-4 w-4" />
              Add
            </button>
          </div>

          <div className="md:col-span-5 text-xs text-slate-500">
            Weekly minutes is used by the planner. Start with a realistic number and increase slowly.
          </div>
        </form>
      </Card>

      <Card>
        <div className="p-5 border-b border-slate-100 flex items-center justify-between">
          <div>
            <div className="text-sm font-extrabold text-slate-900">Your subjects</div>
            <div className="text-xs text-slate-500 mt-1">{loading ? 'Loading…' : `${subjects.length} subjects`}</div>
          </div>
          <Link href="/exam" className="text-sm font-bold text-indigo-600 hover:text-indigo-800">
            Mark a paper →
          </Link>
        </div>

        <div className="p-5">
          {loading ? (
            <div className="text-sm text-slate-500">Loading…</div>
          ) : subjects.length === 0 ? (
            <div className="text-sm text-slate-600">No subjects yet. Add one above to get started.</div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              {subjects.map((s) => (
                <div key={s.id} className="rounded-xl border border-slate-200 p-4 flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <Link href={`/subjects/${s.id}`} className="font-extrabold text-slate-900 hover:text-indigo-700">
                      {s.name}
                    </Link>
                    <div className="text-xs text-slate-500 mt-1">
                      {s.exam_board || '—'} · target {s.target_grade || '—'} · {s.weekly_minutes || 0} min/week
                    </div>
                  </div>

                  <button
                    onClick={() => onDelete(s.id)}
                    className="rounded-lg p-2 text-slate-400 hover:bg-red-50 hover:text-red-600"
                    title="Remove"
                  >
                    <Trash2 className="h-4 w-4" />
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>
      </Card>
    </div>
  );
}
