'use client';

import React, { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import { ArrowRight, RefreshCw, CheckCircle2, Shuffle, Sparkles } from 'lucide-react';
import { getOrCreateStudentId } from '../../services/studentId';
import { isoToday } from '../../services/dateUtils';
import {
  completeSession,
  getOrCreateTodayDailySession,
  listQuestionAttempts,
  listSubjects,
  pickTopWeaknesses,
  weaknessCountsFromAttempts,
} from '../../services/studentOS';

function Card({ children, className = '' }) {
  return <div className={`bg-white rounded-2xl border border-slate-200 shadow-sm ${className}`}>{children}</div>;
}

function Badge({ children }) {
  return <span className="text-xs font-black uppercase tracking-wide rounded-full bg-slate-100 border border-slate-200 px-2 py-1 text-slate-700">{children}</span>;
}

function makeId() {
  if (typeof window !== 'undefined' && window.crypto?.randomUUID) return window.crypto.randomUUID();
  return `${Date.now()}-${Math.random().toString(16).slice(2)}`;
}

function buildDailyItems({ subjectName, attempts }) {
  const counts = weaknessCountsFromAttempts(attempts);
  const top = pickTopWeaknesses(counts, 6);
  const flaws = top.map((t) => t.label);

  const lowScore = (attempts || [])
    .filter((a) => typeof a.marks_total === 'number' || a.marks_total)
    .sort((a, b) => (Number(a.marks_awarded || 0) / Math.max(1, Number(a.marks_total || 0))) - (Number(b.marks_awarded || 0) / Math.max(1, Number(b.marks_total || 0))))
    .slice(0, 10);

  const pickFlaw = (fallback) => flaws.shift() || fallback;

  const items = [];

  // 1) Retrieval x2
  items.push({
    id: makeId(),
    type: 'retrieval',
    title: 'Quick recall',
    prompt: `Without notes: write 6 bullet points you need to remember for ${subjectName}.\n\nIf you’re stuck, start with: definitions, key steps, and 2 examples.`,
  });

  const flaw1 = pickFlaw('Missing key points from mark scheme');
  items.push({
    id: makeId(),
    type: 'retrieval',
    title: 'Fix a weakness',
    prompt: `From memory: write a 3-step checklist to avoid this weakness:\n\n“${flaw1}”\n\nThen add one example of what “good” looks like.`,
    weakness: flaw1,
  });

  // 2) Exam-style question
  const attemptWithQuestion = (attempts || []).find((a) => a.question_text && String(a.question_text).trim().length > 20) || null;
  if (attemptWithQuestion) {
    items.push({
      id: makeId(),
      type: 'exam',
      title: 'Exam-style question',
      prompt: `Attempt this in 6–8 minutes (timed):\n\n${attemptWithQuestion.question_text}\n\nAfterwards: underline where you used your checklist.`,
      source_attempt_id: attemptWithQuestion.id,
    });
  } else {
    items.push({
      id: makeId(),
      type: 'exam',
      title: 'Exam-style question',
      prompt: `Pick ONE past-paper question for ${subjectName} and attempt it for 6–8 minutes (timed).\n\nRule: attempt first, look at notes after.`,
    });
  }

  // 3) Mistake replay
  const weakAttempt = lowScore.find((a) => a.primary_flaw) || (attempts || []).find((a) => a.primary_flaw) || null;
  const flaw2 = weakAttempt?.primary_flaw || pickFlaw('Weak structure / unclear method');
  items.push({
    id: makeId(),
    type: 'mistake_replay',
    title: 'Mistake replay',
    prompt: weakAttempt?.question_text
      ? `Redo this question, but specifically fix: “${flaw2}”\n\n${weakAttempt.question_text}`
      : `Rewrite a short answer focusing on fixing: “${flaw2}”.\n\nMake it 20% shorter and 2× clearer.`,
    weakness: flaw2,
    source_attempt_id: weakAttempt?.id || null,
  });

  // 4) Self explanation
  items.push({
    id: makeId(),
    type: 'self_explain',
    title: 'Explain it',
    prompt: `Teach it back: explain today’s key idea in 5 sentences (no notes).\n\nIf you can’t explain it, that’s the next topic to review tomorrow.`,
  });

  return items.slice(0, 5);
}

export default function DailyPage() {
  const searchParams = useSearchParams();
  const subjectId = searchParams.get('subject');

  const [studentId, setStudentId] = useState(null);
  const [subjects, setSubjects] = useState([]);
  const [session, setSession] = useState(null);
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState(null);

  const [checked, setChecked] = useState({});
  const [confidence, setConfidence] = useState(3);
  const [difficulty, setDifficulty] = useState(3);
  const [notes, setNotes] = useState('');

  useEffect(() => {
    setStudentId(getOrCreateStudentId());
  }, []);

  const subjectName = useMemo(() => {
    const s = subjects.find((x) => x.id === subjectId);
    return s?.name || 'your subjects';
  }, [subjects, subjectId]);

  const load = async (sid) => {
    setLoading(true);
    setError(null);
    try {
      const subs = await listSubjects(sid);
      setSubjects(subs);

      const atts = await listQuestionAttempts(sid, { subjectId: subjectId || null, limit: 250 });

      const generated = buildDailyItems({ subjectName: subjectId ? (subs.find((x) => x.id === subjectId)?.name || 'this subject') : 'your subjects', attempts: atts });

      const sess = await getOrCreateTodayDailySession(sid, { subjectId: subjectId || null, items: generated });

      setSession(sess);
      setItems(sess.items || generated);
      setChecked({});
    } catch (e) {
      setError(e?.message || 'Failed to load your daily session.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (!studentId) return;
    load(studentId);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [studentId, subjectId]);

  const swapPack = async () => {
    if (!studentId) return;
    setSaving(true);
    setError(null);
    try {
      const atts = await listQuestionAttempts(studentId, { subjectId: subjectId || null, limit: 250 });
      const generated = buildDailyItems({ subjectName, attempts: atts });

      // Update session items in DB
      if (session?.id) {
        const { supabase } = await import('../../services/supabaseClient');
        await supabase
          .from('study_sessions')
          .update({ items: generated, updated_at: new Date().toISOString() })
          .eq('student_id', studentId)
          .eq('id', session.id);
      }

      setItems(generated);
      setChecked({});
    } catch (e) {
      setError(e?.message || 'Failed to regenerate.');
    } finally {
      setSaving(false);
    }
  };

  const toggleItem = (id) => setChecked((p) => ({ ...p, [id]: !p[id] }));

  const completedCount = useMemo(() => Object.values(checked).filter(Boolean).length, [checked]);
  const todayISO = useMemo(() => isoToday(), []);

  const finish = async () => {
    if (!studentId || !session?.id) return;
    setSaving(true);
    setError(null);
    try {
      await completeSession(studentId, session.id, {
        confidence,
        difficulty,
        notes,
        completedItemIds: Object.keys(checked).filter((k) => checked[k]),
      });
      // Reload to show done state
      await load(studentId);
    } catch (e) {
      setError(e?.message || 'Failed to save reflection.');
    } finally {
      setSaving(false);
    }
  };

  const isDone = session?.status === 'done';

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row md:items-end md:justify-between gap-4">
        <div>
          <div className="text-xs font-bold text-slate-500 uppercase tracking-wide">Daily</div>
          <h1 className="text-2xl md:text-3xl font-black tracking-tight text-slate-900">
            5-a-day · {todayISO}
          </h1>
          <div className="text-slate-600 mt-2">
            {subjectId ? (
              <>
                Focus: <span className="font-bold text-slate-800">{subjectName}</span>
              </>
            ) : (
              'Mixed practice across subjects (interleaving).'
            )}
          </div>
        </div>

        <div className="flex gap-2">
          <button
            onClick={swapPack}
            disabled={saving || loading}
            className="inline-flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm font-extrabold text-slate-800 hover:bg-slate-50 disabled:opacity-60"
          >
            {saving ? <RefreshCw className="h-4 w-4 animate-spin" /> : <Shuffle className="h-4 w-4" />}
            Regenerate
          </button>

          <Link
            href="/exam"
            className="inline-flex items-center justify-center gap-2 rounded-xl bg-indigo-600 px-4 py-3 text-sm font-extrabold text-white shadow-sm hover:bg-indigo-700"
          >
            <Sparkles className="h-4 w-4" />
            Mark a paper
            <ArrowRight className="h-4 w-4" />
          </Link>
        </div>
      </div>

      {error ? (
        <Card>
          <div className="p-5 text-sm text-red-700 bg-red-50 rounded-2xl border border-red-200">{error}</div>
        </Card>
      ) : null}

      {loading ? (
        <Card>
          <div className="p-5 text-sm text-slate-500">Loading your daily pack…</div>
        </Card>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
          <Card className="lg:col-span-2">
            <div className="p-5 border-b border-slate-100 flex items-center justify-between gap-4">
              <div>
                <div className="text-sm font-extrabold text-slate-900">Today’s pack</div>
                <div className="text-xs text-slate-500 mt-1">Mostly retrieval + one exam-style question + one mistake replay.</div>
              </div>
              {isDone ? (
                <div className="inline-flex items-center gap-2 text-sm font-extrabold text-green-700 bg-green-50 border border-green-200 rounded-xl px-3 py-2">
                  <CheckCircle2 className="h-4 w-4" />
                  Completed
                </div>
              ) : (
                <div className="text-xs font-bold text-slate-500">{completedCount} / {items.length} done</div>
              )}
            </div>

            <div className="p-5 space-y-3">
              {items.map((it, idx) => {
                const itemKey = it.id || String(idx);
                return (
                  <div key={itemKey} className="rounded-xl border border-slate-200 p-4">
                  <div className="flex items-start justify-between gap-4">
                    <div className="min-w-0">
                      <div className="flex items-center gap-2">
                        <Badge>{it.type}</Badge>
                        {it.weakness ? <Badge>{it.weakness}</Badge> : null}
                      </div>
                      <div className="mt-2 font-extrabold text-slate-900">{it.title || `Item ${idx + 1}`}</div>
                      <pre className="mt-2 whitespace-pre-wrap text-sm text-slate-700 font-sans leading-relaxed">
                        {it.prompt}
                      </pre>
                    </div>

                    <button
                      onClick={() => toggleItem(itemKey)}
                      disabled={isDone}
                      className={[
                        'rounded-xl px-3 py-2 text-sm font-extrabold border',
                        checked[itemKey] ? 'bg-indigo-600 text-white border-indigo-600' : 'bg-white text-slate-800 border-slate-200 hover:bg-slate-50',
                        isDone ? 'opacity-50 cursor-not-allowed' : ''
                      ].join(' ')}
                    >
                      {checked[itemKey] ? 'Done' : 'Mark done'}
                    </button>
                  </div>
                  </div>
                );
              })}
            </div>
          </Card>

          <Card>
            <div className="p-5 border-b border-slate-100">
              <div className="text-sm font-extrabold text-slate-900">Reflection</div>
              <div className="text-xs text-slate-500 mt-1">30 seconds. Helps the plan adapt.</div>
            </div>

            <div className="p-5 space-y-5">
              <div>
                <div className="text-xs font-bold text-slate-500 uppercase tracking-wide">Confidence</div>
                <input
                  type="range"
                  min="1"
                  max="5"
                  value={confidence}
                  onChange={(e) => setConfidence(Number(e.target.value))}
                  className="w-full"
                  disabled={isDone}
                />
                <div className="text-sm font-bold text-slate-800">{confidence} / 5</div>
              </div>

              <div>
                <div className="text-xs font-bold text-slate-500 uppercase tracking-wide">Difficulty</div>
                <input
                  type="range"
                  min="1"
                  max="5"
                  value={difficulty}
                  onChange={(e) => setDifficulty(Number(e.target.value))}
                  className="w-full"
                  disabled={isDone}
                />
                <div className="text-sm font-bold text-slate-800">{difficulty} / 5</div>
              </div>

              <div>
                <div className="text-xs font-bold text-slate-500 uppercase tracking-wide">Notes</div>
                <textarea
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  rows={4}
                  className="w-full rounded-xl border border-slate-200 px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-indigo-500"
                  placeholder="Anything that felt confusing? Any quick win?"
                  disabled={isDone}
                />
              </div>

              <button
                onClick={finish}
                disabled={saving || loading || isDone}
                className={[
                  'w-full inline-flex items-center justify-center gap-2 rounded-xl px-4 py-3 text-sm font-extrabold',
                  isDone ? 'bg-slate-200 text-slate-400' : 'bg-slate-900 text-white hover:bg-slate-800',
                  (saving || loading) ? 'opacity-70' : ''
                ].join(' ')}
              >
                {saving ? <RefreshCw className="h-4 w-4 animate-spin" /> : <CheckCircle2 className="h-4 w-4" />}
                Finish & save reflection
              </button>

              <div className="text-xs text-slate-500 leading-relaxed">
                No guilt rule: if you miss a day, you don’t “owe” extra. Just restart tomorrow.
              </div>
            </div>
          </Card>
        </div>
      )}

      <div className="text-sm text-slate-600">
        <Link href="/dashboard" className="font-bold text-indigo-600 hover:text-indigo-800">← Back to dashboard</Link>
      </div>
    </div>
  );
}
