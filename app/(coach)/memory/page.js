'use client';

import React, { useEffect, useMemo, useState } from 'react';
import { Brain, Plus, Save, Trash2 } from 'lucide-react';
import { getOrCreateStudentId } from '../../services/studentId';
import { archiveMemoryItem, listMemoryItems, upsertMemoryItem } from '../../services/studentOS';

function Card({ children, className = '' }) {
  return <div className={`bg-white rounded-2xl border border-slate-200 shadow-sm ${className}`}>{children}</div>;
}

const CATEGORIES = [
  'Preferences',
  'Constraints',
  'Patterns',
  'Goals',
  'Other',
];

export default function MemoryPage() {
  const [studentId, setStudentId] = useState(null);
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [working, setWorking] = useState(false);
  const [error, setError] = useState(null);

  const [form, setForm] = useState({
    category: 'Preferences',
    content: '',
    confidence: 80,
    source: 'user',
  });

  useEffect(() => {
    setStudentId(getOrCreateStudentId());
  }, []);

  const reload = async (sid) => {
    setLoading(true);
    setError(null);
    try {
      const data = await listMemoryItems(sid);
      setItems(data);
    } catch (e) {
      setError(e?.message || 'Failed to load memory bank.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (!studentId) return;
    reload(studentId);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [studentId]);

  const canAdd = useMemo(() => form.content.trim().length >= 3, [form.content]);

  const add = async (e) => {
    e.preventDefault();
    if (!studentId || !canAdd) return;
    setWorking(true);
    setError(null);
    try {
      await upsertMemoryItem(studentId, {
        category: form.category,
        content: form.content.trim(),
        confidence: form.confidence === '' ? 50 : Number(form.confidence),
        source: form.source,
        last_confirmed: new Date().toISOString(),
        archived: false,
      });
      setForm((p) => ({ ...p, content: '' }));
      await reload(studentId);
    } catch (e2) {
      setError(e2?.message || 'Failed to add memory item.');
    } finally {
      setWorking(false);
    }
  };

  const updateItem = async (item) => {
    if (!studentId) return;
    setWorking(true);
    setError(null);
    try {
      await upsertMemoryItem(studentId, {
        ...item,
        last_confirmed: new Date().toISOString(),
      });
      await reload(studentId);
    } catch (e2) {
      setError(e2?.message || 'Failed to update memory item.');
    } finally {
      setWorking(false);
    }
  };

  const archive = async (id) => {
    if (!studentId) return;
    const ok = window.confirm('Archive this memory item?');
    if (!ok) return;
    setWorking(true);
    setError(null);
    try {
      await archiveMemoryItem(studentId, id);
      await reload(studentId);
    } catch (e2) {
      setError(e2?.message || 'Failed to archive memory item.');
    } finally {
      setWorking(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl md:text-3xl font-black tracking-tight text-slate-900">Memory bank</h1>
          <p className="text-slate-600 mt-2 max-w-2xl">
            Editable personalization. Nothing is silently changed — you stay in control.
          </p>
        </div>
        <Brain className="h-6 w-6 text-indigo-600" />
      </div>

      {error ? (
        <Card>
          <div className="p-5 text-sm text-red-700 bg-red-50 rounded-2xl border border-red-200">{error}</div>
        </Card>
      ) : null}

      <Card>
        <div className="p-5 border-b border-slate-100">
          <div className="text-sm font-extrabold text-slate-900">Add a memory item</div>
          <div className="text-xs text-slate-500 mt-1">Examples: “Prefer 25 min sessions”, “Hates Monday evenings”, “AO2 is weak”.</div>
        </div>

        <form onSubmit={add} className="p-5 grid grid-cols-1 md:grid-cols-6 gap-3">
          <select
            value={form.category}
            onChange={(e) => setForm((p) => ({ ...p, category: e.target.value }))}
            className="md:col-span-2 w-full rounded-xl border border-slate-200 px-3 py-3 text-sm font-semibold outline-none focus:ring-2 focus:ring-indigo-500 bg-white"
          >
            {CATEGORIES.map((c) => (
              <option key={c} value={c}>
                {c}
              </option>
            ))}
          </select>

          <select
            value={form.source}
            onChange={(e) => setForm((p) => ({ ...p, source: e.target.value }))}
            className="w-full rounded-xl border border-slate-200 px-3 py-3 text-sm font-semibold outline-none focus:ring-2 focus:ring-indigo-500 bg-white"
          >
            <option value="user">User</option>
            <option value="ai">AI suggestion</option>
          </select>

          <input
            type="number"
            min="0"
            max="100"
            value={form.confidence}
            onChange={(e) => setForm((p) => ({ ...p, confidence: e.target.value }))}
            className="w-full rounded-xl border border-slate-200 px-3 py-3 text-sm font-semibold outline-none focus:ring-2 focus:ring-indigo-500"
            title="Confidence (0–100)"
          />

          <textarea
            value={form.content}
            onChange={(e) => setForm((p) => ({ ...p, content: e.target.value }))}
            placeholder="Write the memory item…"
            rows={2}
            className="md:col-span-6 w-full rounded-xl border border-slate-200 px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-indigo-500"
          />

          <button
            type="submit"
            disabled={!canAdd || working}
            className={[
              'md:col-span-6 inline-flex items-center justify-center gap-2 rounded-xl px-4 py-3 text-sm font-extrabold shadow-sm',
              canAdd ? 'bg-indigo-600 text-white hover:bg-indigo-700' : 'bg-slate-200 text-slate-400'
            ].join(' ')}
          >
            <Plus className="h-4 w-4" />
            Add
          </button>
        </form>
      </Card>

      <Card>
        <div className="p-5 border-b border-slate-100 flex items-start justify-between gap-4">
          <div>
            <div className="text-sm font-extrabold text-slate-900">Your memory items</div>
            <div className="text-xs text-slate-500 mt-1">{loading ? 'Loading…' : `${items.length} active`}</div>
          </div>
          <div className="text-xs text-slate-500">Confidence + last confirmed helps keep this clean.</div>
        </div>

        <div className="p-5 space-y-3">
          {loading ? (
            <div className="text-sm text-slate-500">Loading…</div>
          ) : items.length === 0 ? (
            <div className="text-sm text-slate-600">Nothing yet. Add a couple of preferences and constraints above.</div>
          ) : (
            items.map((it) => (
              <MemoryRow key={it.id} item={it} onSave={updateItem} onArchive={archive} disabled={working} />
            ))
          )}
        </div>
      </Card>
    </div>
  );
}

function MemoryRow({ item, onSave, onArchive, disabled }) {
  const [draft, setDraft] = useState(item);
  const [editing, setEditing] = useState(false);

  useEffect(() => {
    setDraft(item);
  }, [item]);

  const save = async () => {
    try {
      await onSave(draft);
      setEditing(false);
    } catch {
      // Parent handles error; keep editing so user can retry
    }
  };

  return (
    <div className="rounded-xl border border-slate-200 p-4">
      <div className="flex items-start justify-between gap-4">
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2">
            <span className="text-xs font-black uppercase tracking-wide rounded-full bg-slate-100 border border-slate-200 px-2 py-1 text-slate-700">
              {draft.category}
            </span>
            <span className="text-xs font-bold text-slate-500">{draft.source}</span>
            {draft.last_confirmed ? (
              <span className="text-xs text-slate-400">· last confirmed {new Date(draft.last_confirmed).toLocaleDateString()}</span>
            ) : null}
          </div>

          {editing ? (
            <textarea
              value={draft.content || ''}
              onChange={(e) => setDraft((p) => ({ ...p, content: e.target.value }))}
              rows={3}
              className="mt-2 w-full rounded-xl border border-slate-200 px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-indigo-500"
            />
          ) : (
            <div className="mt-2 text-sm text-slate-800 whitespace-pre-wrap">{draft.content}</div>
          )}

          <div className="mt-3 flex items-center gap-3">
            <div className="text-xs font-bold text-slate-500 uppercase tracking-wide">Confidence</div>
            <input
              type="range"
              min="0"
              max="100"
              value={Number(draft.confidence || 0)}
              onChange={(e) => setDraft((p) => ({ ...p, confidence: Number(e.target.value) }))}
              disabled={!editing}
              className="flex-1"
            />
            <div className="text-sm font-bold text-slate-800 w-14 text-right">{Number(draft.confidence || 0)}%</div>
          </div>
        </div>

        <div className="flex flex-col gap-2">
          {editing ? (
            <button
              onClick={save}
              disabled={disabled}
              className="inline-flex items-center gap-2 rounded-xl bg-slate-900 px-3 py-2 text-sm font-extrabold text-white hover:bg-slate-800 disabled:opacity-60"
            >
              <Save className="h-4 w-4" />
              Save
            </button>
          ) : (
            <button
              onClick={() => setEditing(true)}
              disabled={disabled}
              className="inline-flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm font-extrabold text-slate-800 hover:bg-slate-50 disabled:opacity-60"
            >
              Edit
            </button>
          )}

          <button
            onClick={() => onArchive(item.id)}
            disabled={disabled}
            className="inline-flex items-center gap-2 rounded-xl border border-red-200 bg-red-50 px-3 py-2 text-sm font-extrabold text-red-700 hover:bg-red-100 disabled:opacity-60"
          >
            <Trash2 className="h-4 w-4" />
            Archive
          </button>
        </div>
      </div>
    </div>
  );
}
