import { supabase } from './supabaseClient';
import { isoToday } from './dateUtils';

export const DEFAULT_SETTINGS = {
  exam_year: 2026,
  timezone: null,
  session_length: 25,
  max_sessions_per_day: 2,
  unavailable_days: [],
  light_week: false,
  study_techniques_feed: false,
  nightly_verification: false,
  // AI API settings
  openrouter_enabled: true,
  hackclub_enabled: true,
};

export async function getOrCreateSettings(studentId) {
  if (!studentId) throw new Error('studentId required');

  const { data, error } = await supabase
    .from('student_settings')
    .select('*')
    .eq('student_id', studentId)
    .maybeSingle();

  if (error && error.code !== 'PGRST116') {
    // PGRST116: No rows returned for maybeSingle
    throw error;
  }

  if (data) return data;

  const { data: inserted, error: insertError } = await supabase
    .from('student_settings')
    .insert({ student_id: studentId, ...DEFAULT_SETTINGS })
    .select('*')
    .single();

  if (insertError) throw insertError;
  return inserted;
}

export async function updateSettings(studentId, patch) {
  if (!studentId) throw new Error('studentId required');
  const { data, error } = await supabase
    .from('student_settings')
    .update({ ...patch, updated_at: new Date().toISOString() })
    .eq('student_id', studentId)
    .select('*')
    .single();
  if (error) throw error;
  return data;
}

export async function listSubjects(studentId) {
  if (!studentId) throw new Error('studentId required');
  const { data, error } = await supabase
    .from('subjects')
    .select('*')
    .eq('student_id', studentId)
    .order('created_at', { ascending: true });
  if (error) throw error;
  return data || [];
}

export async function getSubject(studentId, subjectId) {
  if (!studentId) throw new Error('studentId required');
  const { data, error } = await supabase
    .from('subjects')
    .select('*')
    .eq('student_id', studentId)
    .eq('id', subjectId)
    .single();
  if (error) throw error;
  return data;
}

export async function createSubject(studentId, input) {
  if (!studentId) throw new Error('studentId required');
  const payload = {
    student_id: studentId,
    name: (input?.name || '').trim(),
    exam_board: input?.exam_board || null,
    target_grade: input?.target_grade || null,
    weekly_minutes: Number.isFinite(input?.weekly_minutes) ? input.weekly_minutes : null,
    tier: input?.tier || null,
  };
  const { data, error } = await supabase.from('subjects').insert(payload).select('*').single();
  if (error) throw error;
  return data;
}

export async function deleteSubject(studentId, subjectId) {
  if (!studentId) throw new Error('studentId required');
  const { error } = await supabase.from('subjects').delete().eq('student_id', studentId).eq('id', subjectId);
  if (error) throw error;
}

export async function ensureSubjectForStudent(studentId, { name, exam_board }) {
  if (!studentId) throw new Error('studentId required');

  const subjectName = (name || '').trim() || 'Unknown Subject';
  const board = (exam_board || '').trim() || null;

  const { data: existing, error: selErr } = await supabase
    .from('subjects')
    .select('*')
    .eq('student_id', studentId)
    .eq('name', subjectName)
    .maybeSingle();

  if (selErr && selErr.code !== 'PGRST116') throw selErr;
  if (existing) return existing;

  const { data: inserted, error: insErr } = await supabase
    .from('subjects')
    .insert({
      student_id: studentId,
      name: subjectName,
      exam_board: board,
      // sensible defaults so the planner can work immediately
      target_grade: null,
      weekly_minutes: 90,
    })
    .select('*')
    .single();

  if (!insErr) return inserted;

  // If we raced a concurrent insert, try selecting again
  const { data: again } = await supabase
    .from('subjects')
    .select('*')
    .eq('student_id', studentId)
    .eq('name', subjectName)
    .maybeSingle();

  return again || null;
}

export async function listQuestionAttempts(studentId, { subjectId = null, limit = 200, sinceISO = null } = {}) {
  if (!studentId) throw new Error('studentId required');

  let q = supabase
    .from('question_attempts')
    .select('*')
    .eq('student_id', studentId)
    .order('attempted_at', { ascending: false })
    .limit(limit);

  if (subjectId) q = q.eq('subject_id', subjectId);
  if (sinceISO) q = q.gte('attempted_at', sinceISO);

  const { data, error } = await q;
  if (error) throw error;
  return data || [];
}

/**
 * Safe attempt logger: never throws (so it won’t break marking UX).
 */
export async function logQuestionAttemptSafe(row) {
  try {
    if (!row?.student_id) return;
    const payload = {
      ...row,
      attempted_at: row.attempted_at || new Date().toISOString(),
    };
    const { error } = await supabase.from('question_attempts').insert(payload);
    if (error) console.warn('logQuestionAttemptSafe error:', error);
  } catch (e) {
    console.warn('logQuestionAttemptSafe failed:', e);
  }
}

export function weaknessCountsFromAttempts(attempts) {
  const counts = {};
  for (const a of attempts || []) {
    const key = (a.primary_flaw || '').trim();
    if (!key) continue;
    counts[key] = (counts[key] || 0) + 1;
  }
  return counts;
}

export function pickTopWeaknesses(counts, limit = 5) {
  return Object.entries(counts || {})
    .sort((a, b) => b[1] - a[1])
    .slice(0, limit)
    .map(([label, count]) => ({ label, count }));
}

export async function getOrCreateTodayDailySession(studentId, { subjectId = null, items = [] } = {}) {
  if (!studentId) throw new Error('studentId required');

  const today = isoToday();

  let q = supabase
    .from('study_sessions')
    .select('*')
    .eq('student_id', studentId)
    .eq('session_type', 'daily5')
    .eq('planned_for', today)
    .order('created_at', { ascending: false })
    .limit(1);

  if (subjectId) q = q.eq('subject_id', subjectId);
  else q = q.is('subject_id', null);

  const { data: existing, error } = await q.maybeSingle();
  if (error && error.code !== 'PGRST116') throw error;
  if (existing) return existing;

  const { data: inserted, error: insErr } = await supabase
    .from('study_sessions')
    .insert({
      student_id: studentId,
      subject_id: subjectId,
      session_type: 'daily5',
      planned_for: today,
      duration_minutes: 15,
      status: 'planned',
      items,
    })
    .select('*')
    .single();

  if (insErr) throw insErr;
  return inserted;
}

export async function completeSession(studentId, sessionId, reflection) {
  if (!studentId) throw new Error('studentId required');
  const { data, error } = await supabase
    .from('study_sessions')
    .update({
      status: 'done',
      reflection,
      completed_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    })
    .eq('student_id', studentId)
    .eq('id', sessionId)
    .select('*')
    .single();
  if (error) throw error;
  return data;
}

export async function listSessions(studentId, { fromDateISO, toDateISO }) {
  if (!studentId) throw new Error('studentId required');

  let q = supabase.from('study_sessions').select('*').eq('student_id', studentId).order('planned_for', { ascending: true });

  if (fromDateISO) q = q.gte('planned_for', fromDateISO);
  if (toDateISO) q = q.lte('planned_for', toDateISO);

  const { data, error } = await q;
  if (error) throw error;
  return data || [];
}

export async function upsertMemoryItem(studentId, item) {
  if (!studentId) throw new Error('studentId required');
  const payload = {
    ...item,
    student_id: studentId,
    updated_at: new Date().toISOString(),
  };
  const { data, error } = await supabase.from('memory_bank_items').upsert(payload).select('*').single();
  if (error) throw error;
  return data;
}

export async function listMemoryItems(studentId) {
  if (!studentId) throw new Error('studentId required');
  const { data, error } = await supabase
    .from('memory_bank_items')
    .select('*')
    .eq('student_id', studentId)
    .eq('archived', false)
    .order('updated_at', { ascending: false });
  if (error) throw error;
  return data || [];
}

export async function archiveMemoryItem(studentId, id) {
  if (!studentId) throw new Error('studentId required');
  const { error } = await supabase
    .from('memory_bank_items')
    .update({ archived: true, updated_at: new Date().toISOString() })
    .eq('student_id', studentId)
    .eq('id', id);
  if (error) throw error;
}

export async function listAssessments(studentId) {
  if (!studentId) throw new Error('studentId required');
  const { data, error } = await supabase
    .from('assessments')
    .select('*')
    .eq('student_id', studentId)
    .order('date', { ascending: true });
  if (error) throw error;
  return data || [];
}

export async function createAssessment(studentId, input) {
  if (!studentId) throw new Error('studentId required');
  const payload = {
    student_id: studentId,
    subject_id: input.subject_id || null,
    kind: input.kind || 'mock',
    date: input.date || null,
    score: Number.isFinite(input.score) ? input.score : null,
    total: Number.isFinite(input.total) ? input.total : null,
    notes: input.notes || null,
    attachments: Array.isArray(input.attachments) ? input.attachments : [],
  };
  const { data, error } = await supabase.from('assessments').insert(payload).select('*').single();
  if (error) throw error;
  return data;
}

export async function uploadAssessmentFile(studentId, file) {
  if (!studentId) throw new Error('studentId required');
  if (!file) throw new Error('file required');

  const timestamp = Date.now();
  const safeName = file.name.replace(/[^a-zA-Z0-9._-]/g, '_');
  const path = `${studentId}/${timestamp}_${safeName}`;

  const { error } = await supabase.storage
    .from('assessment-pdfs')
    .upload(path, file, {
      contentType: file.type || 'application/pdf',
      upsert: false,
    });

  if (error) throw error;
  return { path };
}

export async function deleteAssessmentFiles(paths = []) {
  if (!paths.length) return;
  const { error } = await supabase.storage.from('assessment-pdfs').remove(paths);
  if (error) throw error;
}

export async function deleteAssessment(studentId, assessmentId, attachments = []) {
  if (!studentId) throw new Error('studentId required');
  const attachmentPaths = (attachments || [])
    .map((item) => (typeof item === 'string' ? item : item?.path))
    .filter(Boolean);
  if (attachmentPaths.length) {
    await deleteAssessmentFiles(attachmentPaths);
  }
  const { error } = await supabase
    .from('assessments')
    .delete()
    .eq('student_id', studentId)
    .eq('id', assessmentId);
  if (error) throw error;
}

/**
 * Calculate consecutive days with completed study sessions (streak)
 */
export async function getStudyStreak(studentId) {
  if (!studentId) return { current: 0, longest: 0 };

  try {
    const { data: sessions, error } = await supabase
      .from('study_sessions')
      .select('planned_for, status')
      .eq('student_id', studentId)
      .eq('status', 'done')
      .order('planned_for', { ascending: false })
      .limit(90);

    if (error || !sessions?.length) return { current: 0, longest: 0 };

    const completedDates = new Set(sessions.map(s => s.planned_for));
    const sortedDates = Array.from(completedDates).sort().reverse();

    let currentStreak = 0;
    const today = isoToday();
    let checkDate = new Date(today + 'T00:00:00');

    for (let i = 0; i < 365; i++) {
      const dateStr = checkDate.toISOString().split('T')[0];
      if (completedDates.has(dateStr)) {
        currentStreak++;
        checkDate.setDate(checkDate.getDate() - 1);
      } else if (i === 0) {
        checkDate.setDate(checkDate.getDate() - 1);
      } else {
        break;
      }
    }

    let longest = 0;
    let tempStreak = 0;
    let prevDate = null;

    for (const dateStr of sortedDates.reverse()) {
      const date = new Date(dateStr + 'T00:00:00');
      if (prevDate) {
        const diff = (date - prevDate) / (1000 * 60 * 60 * 24);
        if (diff === 1) {
          tempStreak++;
        } else {
          longest = Math.max(longest, tempStreak);
          tempStreak = 1;
        }
      } else {
        tempStreak = 1;
      }
      prevDate = date;
    }
    longest = Math.max(longest, tempStreak);

    return { current: currentStreak, longest };
  } catch (e) {
    console.warn('getStudyStreak error:', e);
    return { current: 0, longest: 0 };
  }
}

/**
 * Get weekly attempt statistics for trend comparison
 */
export async function getWeeklyAttemptStats(studentId) {
  if (!studentId) return { thisWeek: { earned: 0, total: 0 }, lastWeek: { earned: 0, total: 0 } };

  try {
    const now = new Date();
    const startOfThisWeek = new Date(now);
    startOfThisWeek.setDate(now.getDate() - now.getDay());
    startOfThisWeek.setHours(0, 0, 0, 0);

    const startOfLastWeek = new Date(startOfThisWeek);
    startOfLastWeek.setDate(startOfThisWeek.getDate() - 7);

    const { data: attempts, error } = await supabase
      .from('question_attempts')
      .select('marks_awarded, marks_total, attempted_at')
      .eq('student_id', studentId)
      .gte('attempted_at', startOfLastWeek.toISOString())
      .order('attempted_at', { ascending: false });

    if (error || !attempts?.length) {
      return { thisWeek: { earned: 0, total: 0 }, lastWeek: { earned: 0, total: 0 } };
    }

    const thisWeek = { earned: 0, total: 0 };
    const lastWeek = { earned: 0, total: 0 };

    for (const a of attempts) {
      const attemptDate = new Date(a.attempted_at);
      const bucket = attemptDate >= startOfThisWeek ? thisWeek : lastWeek;
      bucket.earned += Number(a.marks_awarded || 0);
      bucket.total += Number(a.marks_total || 0);
    }

    return { thisWeek, lastWeek };
  } catch (e) {
    console.warn('getWeeklyAttemptStats error:', e);
    return { thisWeek: { earned: 0, total: 0 }, lastWeek: { earned: 0, total: 0 } };
  }
}

/**
 * Delete all student data (for reset functionality)
 */
export async function deleteAllStudentData(studentId) {
  if (!studentId) throw new Error('studentId required');

  await supabase.from('question_attempts').delete().eq('student_id', studentId);
  await supabase.from('study_sessions').delete().eq('student_id', studentId);
  await supabase.from('memory_bank_items').delete().eq('student_id', studentId);
  await supabase.from('assessments').delete().eq('student_id', studentId);
  await supabase.from('subjects').delete().eq('student_id', studentId);

  await supabase
    .from('student_settings')
    .update({ ...DEFAULT_SETTINGS, updated_at: new Date().toISOString() })
    .eq('student_id', studentId);
}

/**
 * Create a new study session
 */
export async function createSession(studentId, sessionData) {
  if (!studentId) throw new Error('studentId required');
  const payload = {
    student_id: studentId,
    subject_id: sessionData.subject_id || null,
    session_type: sessionData.session_type || 'scheduled',
    planned_for: sessionData.planned_for,
    duration_minutes: sessionData.duration_minutes || 30,
    status: sessionData.status || 'planned',
    items: sessionData.items || [],
    notes: sessionData.notes || null,
    topic: sessionData.topic || null,
  };
  const { data, error } = await supabase.from('study_sessions').insert(payload).select('*').single();
  if (error) throw error;
  return data;
}

/**
 * Update an existing study session
 */
export async function updateSession(studentId, sessionId, patch) {
  if (!studentId) throw new Error('studentId required');
  const { data, error } = await supabase
    .from('study_sessions')
    .update({ ...patch, updated_at: new Date().toISOString() })
    .eq('student_id', studentId)
    .eq('id', sessionId)
    .select('*')
    .single();
  if (error) throw error;
  return data;
}

/**
 * Delete a study session
 */
export async function deleteSession(studentId, sessionId) {
  if (!studentId) throw new Error('studentId required');
  const { error } = await supabase
    .from('study_sessions')
    .delete()
    .eq('student_id', studentId)
    .eq('id', sessionId);
  if (error) throw error;
}

/**
 * Batch save sessions from AI-generated schedule
 * Clears existing planned sessions for the week and inserts new ones
 */
export async function saveSchedule(studentId, sessions, weekStartISO, weekEndISO) {
  if (!studentId) throw new Error('studentId required');

  // Delete existing planned sessions for this week (except completed ones)
  const { error: deleteError } = await supabase
    .from('study_sessions')
    .delete()
    .eq('student_id', studentId)
    .eq('status', 'planned')
    .gte('planned_for', weekStartISO)
    .lte('planned_for', weekEndISO);

  if (deleteError) throw deleteError;

  // Insert new sessions
  const payloads = sessions.map(s => ({
    student_id: studentId,
    subject_id: s.subject_id || null,
    session_type: s.session_type || 'ai_planned',
    planned_for: s.planned_for,
    duration_minutes: s.duration_minutes || 30,
    status: 'planned',
    items: s.items || [],
    notes: s.notes || null,
    topic: s.topic || null,
  }));

  if (payloads.length === 0) return [];

  const { data, error } = await supabase.from('study_sessions').insert(payloads).select('*');
  if (error) throw error;
  return data || [];
}

/**
 * Get subject performance stats (average score per subject)
 */
export async function getSubjectPerformance(studentId) {
  if (!studentId) return {};

  try {
    const { data: attempts, error } = await supabase
      .from('question_attempts')
      .select('subject_id, marks_awarded, marks_total')
      .eq('student_id', studentId)
      .order('attempted_at', { ascending: false })
      .limit(500);

    if (error || !attempts?.length) return {};

    const bySubject = {};
    for (const a of attempts) {
      const sid = a.subject_id || 'unknown';
      if (!bySubject[sid]) bySubject[sid] = { earned: 0, total: 0, count: 0 };
      bySubject[sid].earned += Number(a.marks_awarded || 0);
      bySubject[sid].total += Number(a.marks_total || 0);
      bySubject[sid].count += 1;
    }

    const result = {};
    for (const [sid, stats] of Object.entries(bySubject)) {
      result[sid] = {
        percentage: stats.total > 0 ? Math.round((stats.earned / stats.total) * 100) : null,
        questionCount: stats.count,
      };
    }
    return result;
  } catch (e) {
    console.warn('getSubjectPerformance error:', e);
    return {};
  }
}

/**
 * Get upcoming assessments (within next 30 days)
 */
export async function getUpcomingAssessments(studentId) {
  if (!studentId) return [];

  try {
    const today = isoToday();
    const thirtyDaysLater = new Date();
    thirtyDaysLater.setDate(thirtyDaysLater.getDate() + 30);
    const endDate = thirtyDaysLater.toISOString().split('T')[0];

    const { data, error } = await supabase
      .from('assessments')
      .select('*')
      .eq('student_id', studentId)
      .gte('date', today)
      .lte('date', endDate)
      .order('date', { ascending: true });

    if (error) throw error;
    return data || [];
  } catch (e) {
    console.warn('getUpcomingAssessments error:', e);
    return [];
  }
}
