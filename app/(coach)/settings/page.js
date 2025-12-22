'use client';

import React, { useEffect, useMemo, useState } from 'react';
import { Save, Settings as SettingsIcon } from 'lucide-react';
import { getOrCreateStudentId } from '../../services/studentId';
import { DEFAULT_SETTINGS, getOrCreateSettings, updateSettings } from '../../services/studentOS';

function Card({ children, className = '' }) {
  return <div className={`bg-white rounded-2xl border border-slate-200 shadow-sm ${className}`}>{children}</div>;
}

const SESSION_LENGTHS = [25, 45, 60];

const DAYS = [
  { value: 1, label: 'Mon' },
  { value: 2, label: 'Tue' },
  { value: 3, label: 'Wed' },
  { value: 4, label: 'Thu' },
  { value: 5, label: 'Fri' },
  { value: 6, label: 'Sat' },
  { value: 0, label: 'Sun' },
];

export default function SettingsPage() {
  const [studentId, setStudentId] = useState(null);
  const [settings, setSettings] = useState(DEFAULT_SETTINGS);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState(null);
  const [ok, setOk] = useState(false);

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
        const s = await getOrCreateSettings(studentId);
        if (cancelled) return;
        setSettings({ ...DEFAULT_SETTINGS, ...s });
      } catch (e) {
        if (cancelled) return;
        setError(e?.message || 'Failed to load settings.');
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [studentId]);

  const toggleUnavailable = (day) => {
    setSettings((p) => {
      const set = new Set(p.unavailable_days || []);
      if (set.has(day)) set.delete(day);
      else set.add(day);
      return { ...p, unavailable_days: Array.from(set) };
    });
  };

  const save = async () => {
    if (!studentId) return;
    setSaving(true);
    setError(null);
    setOk(false);
    try {
      const payload = {
        exam_year: settings.exam_year || 2026,
        timezone: settings.timezone || null,
        session_length: Number(settings.session_length) || 25,
        max_sessions_per_day: Number(settings.max_sessions_per_day) || 2,
        unavailable_days: settings.unavailable_days || [],
        light_week: Boolean(settings.light_week),
        study_techniques_feed: Boolean(settings.study_techniques_feed),
        nightly_verification: Boolean(settings.nightly_verification),
      };
      const saved = await updateSettings(studentId, payload);
      setSettings({ ...DEFAULT_SETTINGS, ...saved });
      setOk(true);
      setTimeout(() => setOk(false), 1500);
    } catch (e) {
      setError(e?.message || 'Failed to save.');
    } finally {
      setSaving(false);
    }
  };

  const unavailableSet = useMemo(() => new Set(settings.unavailable_days || []), [settings.unavailable_days]);

  return (
    <div className="space-y-6">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl md:text-3xl font-black tracking-tight text-slate-900">Settings</h1>
          <p className="text-slate-600 mt-2 max-w-2xl">
            Make the planner fit your life. It should feel calm — not demanding.
          </p>
        </div>
        <SettingsIcon className="h-6 w-6 text-indigo-600" />
      </div>

      {error ? (
        <Card>
          <div className="p-5 text-sm text-red-700 bg-red-50 rounded-2xl border border-red-200">{error}</div>
        </Card>
      ) : null}

      <Card>
        <div className="p-5 border-b border-slate-100">
          <div className="text-sm font-extrabold text-slate-900">Planner preferences</div>
          <div className="text-xs text-slate-500 mt-1">These control the timetable generator and daily pack.</div>
        </div>

        <div className="p-5 grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <div className="text-xs font-bold text-slate-500 uppercase tracking-wide">Session length</div>
            <select
              value={settings.session_length || 25}
              onChange={(e) => setSettings((p) => ({ ...p, session_length: Number(e.target.value) }))}
              className="mt-1 w-full rounded-xl border border-slate-200 px-3 py-3 text-sm font-semibold outline-none focus:ring-2 focus:ring-indigo-500 bg-white"
              disabled={loading}
            >
              {SESSION_LENGTHS.map((n) => (
                <option key={n} value={n}>
                  {n} min
                </option>
              ))}
            </select>
          </div>

          <div>
            <div className="text-xs font-bold text-slate-500 uppercase tracking-wide">Max sessions per day</div>
            <input
              type="number"
              min="1"
              max="8"
              value={settings.max_sessions_per_day || 2}
              onChange={(e) => setSettings((p) => ({ ...p, max_sessions_per_day: Number(e.target.value) }))}
              className="mt-1 w-full rounded-xl border border-slate-200 px-3 py-3 text-sm font-semibold outline-none focus:ring-2 focus:ring-indigo-500"
              disabled={loading}
            />
          </div>

          <div className="md:col-span-2">
            <div className="text-xs font-bold text-slate-500 uppercase tracking-wide">Unavailable days</div>
            <div className="mt-2 flex flex-wrap gap-2">
              {DAYS.map((d) => {
                const active = unavailableSet.has(d.value);
                return (
                  <button
                    key={d.value}
                    type="button"
                    onClick={() => toggleUnavailable(d.value)}
                    disabled={loading}
                    className={[
                      'rounded-xl px-3 py-2 text-sm font-extrabold border',
                      active ? 'bg-slate-900 text-white border-slate-900' : 'bg-white text-slate-800 border-slate-200 hover:bg-slate-50',
                    ].join(' ')}
                  >
                    {d.label}
                  </button>
                );
              })}
            </div>
            <div className="text-xs text-slate-500 mt-2">If you tick a day, the planner won’t schedule sessions there.</div>
          </div>

          <div className="md:col-span-2 grid grid-cols-1 md:grid-cols-3 gap-3">
            <Toggle
              label="Light week mode"
              value={Boolean(settings.light_week)}
              onChange={(v) => setSettings((p) => ({ ...p, light_week: v }))}
              disabled={loading}
              help="Reduces volume if you’re behind or stressed."
            />
            <Toggle
              label="Study techniques feed"
              value={Boolean(settings.study_techniques_feed)}
              onChange={(v) => setSettings((p) => ({ ...p, study_techniques_feed: v }))}
              disabled={loading}
              help="Optional weekly tips + “try now” actions."
            />
            <Toggle
              label="Nightly verification"
              value={Boolean(settings.nightly_verification)}
              onChange={(v) => setSettings((p) => ({ ...p, nightly_verification: v }))}
              disabled={loading}
              help="Optional web checks (JCQ dates, timetables)."
            />
          </div>

          <div className="md:col-span-2 flex items-center justify-between gap-3 pt-2">
            <div className="text-xs text-slate-500">
              Student ID (device): <span className="font-mono text-slate-700">{studentId || '—'}</span>
            </div>
            <button
              onClick={save}
              disabled={saving || loading}
              className="inline-flex items-center gap-2 rounded-xl bg-indigo-600 px-4 py-3 text-sm font-extrabold text-white shadow-sm hover:bg-indigo-700 disabled:opacity-60"
            >
              <Save className="h-4 w-4" />
              {ok ? 'Saved' : saving ? 'Saving…' : 'Save settings'}
            </button>
          </div>
        </div>
      </Card>
    </div>
  );
}

function Toggle({ label, value, onChange, disabled, help }) {
  return (
    <div className="rounded-xl border border-slate-200 p-4 bg-slate-50">
      <div className="flex items-start justify-between gap-3">
        <div>
          <div className="font-extrabold text-slate-900 text-sm">{label}</div>
          {help ? <div className="text-xs text-slate-600 mt-1">{help}</div> : null}
        </div>
        <button
          type="button"
          onClick={() => onChange(!value)}
          disabled={disabled}
          className={[
            'w-12 h-7 rounded-full border flex items-center px-1 transition-colors',
            value ? 'bg-indigo-600 border-indigo-600 justify-end' : 'bg-white border-slate-200 justify-start',
            disabled ? 'opacity-60' : ''
          ].join(' ')}
          aria-label={label}
        >
          <span className="w-5 h-5 rounded-full bg-white shadow-sm" />
        </button>
      </div>
    </div>
  );
}
