import { supabase } from '../supabaseClient';
import { isoToday } from '../dateUtils';
import { StudySession } from './types';

export async function getOrCreateTodayDailySession(studentId: string, { subjectId = null, items = [] }: { subjectId?: string | null; items?: any[] } = {}): Promise<StudySession> {
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

export async function completeSession(studentId: string, sessionId: string, reflection: string): Promise<StudySession> {
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

export async function listSessions(studentId: string, { fromDateISO, toDateISO }: { fromDateISO?: string; toDateISO?: string }): Promise<StudySession[]> {
  if (!studentId) throw new Error('studentId required');

  let q = supabase.from('study_sessions').select('*').eq('student_id', studentId).order('planned_for', { ascending: true });

  if (fromDateISO) q = q.gte('planned_for', fromDateISO);
  if (toDateISO) q = q.lte('planned_for', toDateISO);

  const { data, error } = await q;
  if (error) throw error;
  return data || [];
}

/**
 * Create a new study session
 */
export async function createSession(studentId: string, sessionData: Partial<StudySession>): Promise<StudySession> {
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
    start_time: sessionData.start_time || null,
  };
  const { data, error } = await supabase.from('study_sessions').insert(payload).select('*').single();
  if (error) throw error;
  return data;
}

/**
 * Update an existing study session
 */
export async function updateSession(studentId: string, sessionId: string, patch: Partial<StudySession>): Promise<StudySession> {
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
export async function deleteSession(studentId: string, sessionId: string): Promise<void> {
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
export async function saveSchedule(studentId: string, sessions: Partial<StudySession>[], weekStartISO: string, weekEndISO: string): Promise<StudySession[]> {
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
    start_time: s.start_time || null,
  }));

  if (payloads.length === 0) return [];

  const { data, error } = await supabase.from('study_sessions').insert(payloads).select('*');
  if (error) throw error;
  return data || [];
}

/**
 * Calculate consecutive days with completed study sessions (streak)
 */
export async function getStudyStreak(studentId: string) {
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
    let prevDate: Date | null = null;

    for (const dateStr of sortedDates.reverse()) {
      // @ts-ignore
      const date = new Date(dateStr + 'T00:00:00');
      if (prevDate) {
        // @ts-ignore
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
 * Get recent study history (last 14 days) to avoid repetition in AI scheduling
 * Returns topics that were recently studied so AI can schedule spaced repetition
 */
export async function getRecentStudyHistory(studentId: string, days = 14) {
  if (!studentId) return { recentTopics: [], completedSessions: [], skippedCount: 0 };

  try {
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - days);
    const startISO = startDate.toISOString().split('T')[0];

    const { data: sessions, error } = await supabase
      .from('study_sessions')
      .select('id, subject_id, topic, status, planned_for, duration_minutes, session_type')
      .eq('student_id', studentId)
      .gte('planned_for', startISO)
      .order('planned_for', { ascending: false });

    if (error || !sessions?.length) {
      return { recentTopics: [], completedSessions: [], skippedCount: 0 };
    }

    // Extract recently studied topics (from completed sessions)
    const recentTopics = sessions
      .filter(s => s.status === 'done' && s.topic)
      .map(s => ({
        topic: s.topic,
        subjectId: s.subject_id,
        studiedOn: s.planned_for,
        daysAgo: Math.ceil((Date.now() - new Date(s.planned_for).getTime()) / (1000 * 60 * 60 * 24))
      }));

    // Track completed sessions for feedback
    const completedSessions = sessions.filter(s => s.status === 'done');
    const skippedCount = sessions.filter(s =>
      s.status === 'planned' && new Date(s.planned_for) < new Date()
    ).length;

    return { recentTopics, completedSessions, skippedCount };
  } catch (e) {
    console.warn('getRecentStudyHistory error:', e);
    return { recentTopics: [], completedSessions: [], skippedCount: 0 };
  }
}

/**
 * Get session completion stats for AI feedback loop
 * Tracks patterns in when sessions are completed vs skipped
 */
export async function getSessionCompletionStats(studentId: string) {
  if (!studentId) return { completionRate: 0, byDayOfWeek: {}, byTimeOfDay: {}, insights: [] };

  try {
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
    const startISO = thirtyDaysAgo.toISOString().split('T')[0];

    const { data: sessions, error } = await supabase
      .from('study_sessions')
      .select('id, status, planned_for, session_type, duration_minutes, start_time')
      .eq('student_id', studentId)
      .gte('planned_for', startISO)
      .order('planned_for', { ascending: false });

    if (error || !sessions?.length) {
      return { completionRate: 0, byDayOfWeek: {}, byTimeOfDay: {}, insights: [] };
    }

    const pastSessions = sessions.filter(s => new Date(s.planned_for) < new Date());
    const completed = pastSessions.filter(s => s.status === 'done').length;
    const completionRate = pastSessions.length > 0
      ? Math.round((completed / pastSessions.length) * 100)
      : 0;

    // Analyze by day of week
    const byDayOfWeek: Record<string, any> = {
      Mon: { done: 0, total: 0 }, Tue: { done: 0, total: 0 }, Wed: { done: 0, total: 0 },
      Thu: { done: 0, total: 0 }, Fri: { done: 0, total: 0 }, Sat: { done: 0, total: 0 },
      Sun: { done: 0, total: 0 }
    };
    const days = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

    for (const s of pastSessions) {
      // @ts-ignore
      const dayName = days[new Date(s.planned_for).getDay()];
      byDayOfWeek[dayName].total++;
      if (s.status === 'done') byDayOfWeek[dayName].done++;
    }

    // Analyze by time of day (if start_time is tracked)
    const byTimeOfDay: Record<string, any> = { morning: { done: 0, total: 0 }, afternoon: { done: 0, total: 0 }, evening: { done: 0, total: 0 } };
    for (const s of pastSessions.filter(x => x.start_time)) {
      // @ts-ignore
      const hour = parseInt(s.start_time.split(':')[0], 10);
      const period = hour < 12 ? 'morning' : hour < 17 ? 'afternoon' : 'evening';
      byTimeOfDay[period].total++;
      if (s.status === 'done') byTimeOfDay[period].done++;
    }

    // Generate insights for AI
    const insights: string[] = [];

    // Find worst day
    const worstDay = Object.entries(byDayOfWeek)
      .filter(([_, stats]) => stats.total >= 2)
      .sort((a, b) => (a[1].done / a[1].total) - (b[1].done / b[1].total))[0];
    if (worstDay && (worstDay[1].done / worstDay[1].total) < 0.5) {
      insights.push(`Student often skips sessions on ${worstDay[0]}`);
    }

    // Find best day
    const bestDay = Object.entries(byDayOfWeek)
      .filter(([_, stats]) => stats.total >= 2)
      .sort((a, b) => (b[1].done / b[1].total) - (a[1].done / a[1].total))[0];
    if (bestDay && (bestDay[1].done / bestDay[1].total) > 0.8) {
      insights.push(`Student is most consistent on ${bestDay[0]}`);
    }

    if (completionRate < 50) {
      insights.push('Low completion rate - consider fewer, shorter sessions');
    }

    return { completionRate, byDayOfWeek, byTimeOfDay, insights };
  } catch (e) {
    console.warn('getSessionCompletionStats error:', e);
    return { completionRate: 0, byDayOfWeek: {}, byTimeOfDay: {}, insights: [] };
  }
}
