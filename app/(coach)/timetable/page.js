'use client';

import React, { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { CalendarDays, RefreshCw, Wand2 } from 'lucide-react';
import { getOrCreateStudentId } from '../../services/studentId';
import { isoToday } from '../../services/dateUtils';
import { DEFAULT_SETTINGS, getOrCreateSettings, listQuestionAttempts, listSubjects, pickTopWeaknesses, weaknessCountsFromAttempts } from '../../services/studentOS';
import { supabase } from '../../services/supabaseClient';

function Card({ children, className = '' }) {
  return <div className={`bg-white rounded-2xl border border-slate-200 shadow-sm ${className}`}>{children}</div>;
}

function startOfWeek(d) {
  // Monday as start
  const date = new Date(d);
  const day = date.getDay(); // 0 Sun .. 6 Sat
  const diff = (day === 0 ? -6 : 1) - day;
  date.setDate(date.getDate() + diff);
  date.setHours(0, 0, 0, 0);
  return date;
}

function addDays(date, n) {
  const d = new Date(date);
  d.setDate(d.getDate() + n);
  return d;
}

function toISODate(d) {
  const yyyy = d.getFullYear();
  const mm = String(d.getMonth() + 1).padStart(2, '0');
  const dd = String(d.getDate()).padStart(2, '0');
  return `${yyyy}-${mm}-${dd}`;
}

export default function TimetablePage() {
  const [studentId, setStudentId] = useState(null);
  const [settings, setSettings] = useState(DEFAULT_SETTINGS);
  const [subjects, setSubjects] = useState([]);
  const [sessions, setSessions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [working, setWorking] = useState(false);
  const [error, setError] = useState(null);

  useEffect(() => {
    setStudentId(getOrCreateStudentId());
  }, []);

  const weekStart = useMemo(() => startOfWeek(new Date()), []);
  const weekEnd = useMemo(() => addDays(weekStart, 6), [weekStart]);

  const load = async (sid) => {
    setLoading(true);
    setError(null);
    try {
      const s = await getOrCreateSettings(sid).catch(() => DEFAULT_SETTINGS);
      setSettings({ ...DEFAULT_SETTINGS, ...s });

      const subs = await listSubjects(sid);
      setSubjects(subs);

      const { data, error: sessErr } = await supabase
        .from('study_sessions')
        .select('*')
        .eq('student_id', sid)
        .gte('planned_for', toISODate(weekStart))
        .lte('planned_for', toISODate(weekEnd))
        .order('planned_for', { ascending: true });

      if (sessErr) throw sessErr;
      setSessions(data || []);
    } catch (e) {
      setError(e?.message || 'Failed to load timetable.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (!studentId) return;
    load(studentId);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [studentId]);

  const sessionsByDay = useMemo(() => {
    const map = {};
    for (let i = 0; i < 7; i++) {
      const dateISO = toISODate(addDays(weekStart, i));
      map[dateISO] = [];
    }
    for (const s of sessions) {
      if (!map[s.planned_for]) map[s.planned_for] = [];
      map[s.planned_for].push(s);
    }
    return map;
  }, [sessions, weekStart]);

  const generateWeekPlan = async () => {
    if (!studentId) return;
    if (subjects.length === 0) {
      setError('Add at least one subject first.');
      return;
    }

    setWorking(true);
    setError(null);
    try {
      // Clear existing planned sessions in this week (forgiving replans)
      await supabase
        .from('study_sessions')
        .delete()
        .eq('student_id', studentId)
        .gte('planned_for', toISODate(weekStart))
        .lte('planned_for', toISODate(weekEnd))
        .eq('status', 'planned');

      const sessionLength = Number(settings.session_length) || 25;
      const maxPerDay = Number(settings.max_sessions_per_day) || 2;
      const unavailable = new Set(settings.unavailable_days || []); // 0 Sun ... 6 Sat

      // Preload attempts for weakness-based titles
      const atts = await listQuestionAttempts(studentId, { limit: 400 }).catch(() => []);
      const attemptsBySubject = {};
      for (const a of atts) {
        (attemptsBySubject[a.subject_id] ||= []).push(a);
      }

      const daySlots = [];
      for (let i = 0; i < 7; i++) {
        const d = addDays(weekStart, i);
        const weekday = d.getDay();
        if (unavailable.has(weekday)) continue;
        daySlots.push(toISODate(d));
      }
      if (daySlots.length === 0) throw new Error('All days are marked unavailable. Update your Settings.');

      const newSessions = [];
      const dayCounts = Object.fromEntries(daySlots.map((d) => [d, 0]));
      let cursor = 0;

      for (const subject of subjects) {
        const weeklyMinutes = Number(subject.weekly_minutes) || 90;
        const sessionsNeeded = Math.max(1, Math.ceil(weeklyMinutes / Math.max(1, sessionLength)));
        const theseAttempts = attemptsBySubject[subject.id] || [];
        const top = pickTopWeaknesses(weaknessCountsFromAttempts(theseAttempts), 2);
        const focus = top.map((t) => t.label).join(' / ') || 'Core practice';

        for (let n = 0; n < sessionsNeeded; n++) {
          // Find next day with available capacity
          let tries = 0;
          while (tries < daySlots.length && dayCounts[daySlots[cursor]] >= maxPerDay) {
            cursor = (cursor + 1) % daySlots.length;
            tries++;
          }
          const planned_for = daySlots[cursor];
          dayCounts[planned_for] = (dayCounts[planned_for] || 0) + 1;
          cursor = (cursor + 1) % daySlots.length;

          newSessions.push({
            student_id: studentId,
            subject_id: subject.id,
            session_type: 'block',
            planned_for,
            duration_minutes: sessionLength,
            status: 'planned',
            items: [
              {
                id: `${subject.id}-${planned_for}-${n}`,
                type: 'focus_block',
                title: `Focus: ${subject.name}`,
                prompt: `25–45 min block. Target: ${focus}.\n\n1) Attempt 1 exam-style question\n2) Check mark scheme\n3) Write a short “fix checklist”\n4) Retry later (tomorrow/next week)`,
                focus,
              },
            ],
          });
        }
      }

      if (newSessions.length) {
        const { error: insErr } = await supabase.from('study_sessions').insert(newSessions);
        if (insErr) throw insErr;
      }

      await load(studentId);
    } catch (e) {
      setError(e?.message || 'Failed to generate plan.');
    } finally {
      setWorking(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row md:items-end md:justify-between gap-4">
        <div>
          <h1 className="text-2xl md:text-3xl font-black tracking-tight text-slate-900">Timetable</h1>
          <p className="text-slate-600 mt-2 max-w-2xl">
            A forgiving weekly plan. Missed sessions don’t snowball — regenerate anytime.
          </p>
        </div>

        <button
          onClick={generateWeekPlan}
          disabled={working || loading}
          className="inline-flex items-center justify-center gap-2 rounded-xl bg-indigo-600 px-4 py-3 text-sm font-extrabold text-white shadow-sm hover:bg-indigo-700 disabled:opacity-60"
        >
          {working ? <RefreshCw className="h-4 w-4 animate-spin" /> : <Wand2 className="h-4 w-4" />}
          Generate / Re-plan this week
        </button>
      </div>

      {error ? (
        <Card>
          <div className="p-5 text-sm text-red-700 bg-red-50 rounded-2xl border border-red-200">{error}</div>
        </Card>
      ) : null}

      <Card>
        <div className="p-5 border-b border-slate-100 flex items-start justify-between gap-4">
          <div>
            <div className="text-sm font-extrabold text-slate-900">This week</div>
            <div className="text-xs text-slate-500 mt-1">
              {toISODate(weekStart)} → {toISODate(weekEnd)} · session length {settings.session_length || 25} min · max {settings.max_sessions_per_day || 2}/day
            </div>
          </div>
          <CalendarDays className="h-5 w-5 text-indigo-600" />
        </div>

        <div className="p-5 space-y-4">
          {loading ? (
            <div className="text-sm text-slate-500">Loading…</div>
          ) : (
            Object.entries(sessionsByDay).map(([dateISO, daySessions]) => (
              <div key={dateISO} className="rounded-xl border border-slate-200 p-4">
                <div className="flex items-center justify-between gap-3">
                  <div className="font-extrabold text-slate-900">{dateISO}</div>
                  <div className="text-xs font-bold text-slate-500">{daySessions.length} session(s)</div>
                </div>

                {daySessions.length === 0 ? (
                  <div className="mt-2 text-sm text-slate-600">No sessions planned.</div>
                ) : (
                  <div className="mt-3 space-y-2">
                    {daySessions.map((s) => (
                      <div key={s.id} className="rounded-xl bg-slate-50 border border-slate-200 p-3">
                        <div className="flex items-start justify-between gap-3">
                          <div>
                            <div className="font-extrabold text-slate-900">
                              {(subjects.find((x) => x.id === s.subject_id)?.name) || 'Study session'}
                            </div>
                            <div className="text-xs text-slate-500 mt-1">
                              {s.session_type} · {s.duration_minutes || 25} min · {s.status}
                            </div>
                          </div>
                          <Link
                            href={s.session_type === 'daily5' ? '/daily' : `/daily?subject=${s.subject_id}`}
                            className="text-sm font-bold text-indigo-600 hover:text-indigo-800"
                          >
                            Start →
                          </Link>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            ))
          )}
        </div>
      </Card>

      <div className="text-sm text-slate-600">
        Adjust availability and strictness in <Link className="font-bold text-indigo-600 hover:text-indigo-800" href="/settings">Settings</Link>.
      </div>
    </div>
  );
}
