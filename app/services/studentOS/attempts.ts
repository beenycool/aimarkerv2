import { QuestionAttempt, PerformanceStatsBase } from './types';
import { pickTopWeaknesses as pickTopWeaknessesUtil } from '../mathUtils';
import { clientOrDefault, type StudentOSSupabase } from './getSupabase';

export async function listQuestionAttempts(
  studentId: string,
  { subjectId = null, limit = 200, sinceISO = null }: { subjectId?: string | null; limit?: number; sinceISO?: string | null } = {},
  client?: StudentOSSupabase
): Promise<QuestionAttempt[]> {
  if (!studentId) throw new Error('studentId required');
  const supabase = clientOrDefault(client);

  let q = supabase
    .from('question_attempts')
    .select('*')
    .eq('student_id', studentId)
    .order('attempted_at', { ascending: false })
    .limit(limit);

  if (subjectId) q = q.eq('subject_id', subjectId);
  if (sinceISO) q = q.gte('attempted_at', sinceISO);

  const { data, error } = await q.returns<QuestionAttempt[]>();
  if (error) throw error;
  return data || [];
}

/**
 * Safe attempt logger: never throws (so it won’t break marking UX).
 */
export async function logQuestionAttemptSafe(row: Partial<QuestionAttempt>, client?: StudentOSSupabase): Promise<void> {
  try {
    if (!row?.student_id) return;
    const supabase = clientOrDefault(client);
    const payload = {
      ...row,
      attempted_at: row.attempted_at || new Date().toISOString(),
    };
    const { error } = await supabase.from('question_attempts').insert(payload as any);
    if (error) console.warn('logQuestionAttemptSafe error:', error);
  } catch (e) {
    console.warn('logQuestionAttemptSafe failed:', e);
  }
}

export function weaknessCountsFromAttempts(
  attempts: { primary_flaw?: string | null }[]
): Record<string, number> {
  const counts: Record<string, number> = {};
  for (const a of attempts || []) {
    const key = (a.primary_flaw || '').trim();
    if (!key) continue;
    counts[key] = (counts[key] || 0) + 1;
  }
  return counts;
}

export function pickTopWeaknesses(counts: Record<string, number>, limit = 5): { label: string; count: number }[] {
  return pickTopWeaknessesUtil(counts, limit);
}

/**
 * Get weekly attempt statistics for trend comparison
 */
export async function getWeeklyAttemptStats(studentId: string, client?: StudentOSSupabase) {
  if (!studentId) return { thisWeek: { earned: 0, total: 0 }, lastWeek: { earned: 0, total: 0 } };

  try {
    const supabase = clientOrDefault(client);
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
      .order('attempted_at', { ascending: false })
      .returns<{ marks_awarded: number | null; marks_total: number | null; attempted_at: string }[]>();

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
 * Get topic-level performance (more granular than subject-level)
 * Groups attempts by topic/question_type to identify specific weak areas
 */
export async function getTopicPerformance(studentId: string, client?: StudentOSSupabase) {
  if (!studentId) return { byTopic: {}, byQuestionType: {} };

  try {
    const supabase = clientOrDefault(client);
    const { data: attempts, error } = await supabase
      .from('question_attempts')
      .select('subject_id, marks_awarded, marks_total, primary_flaw, question_type')
      .eq('student_id', studentId)
      .order('attempted_at', { ascending: false })
      .returns<
        {
          subject_id: string | null;
          marks_awarded: number | null;
          marks_total: number | null;
          primary_flaw: string | null;
          question_type: string | null;
        }[]
      >();

    if (error || !attempts?.length) return { byTopic: {}, byQuestionType: {} };

    type TopicStats = PerformanceStatsBase & { percentage?: number | null };
    const byTopic: Record<string, TopicStats> = {};
    const byQuestionType: Record<string, TopicStats> = {};

    for (const a of attempts) {
      // Group by primary_flaw (topic/skill area)
      const topic = (a.primary_flaw || '').trim();
      if (topic) {
        if (!byTopic[topic]) byTopic[topic] = { earned: 0, total: 0, count: 0 };
        byTopic[topic].earned += Number(a.marks_awarded || 0);
        byTopic[topic].total += Number(a.marks_total || 0);
        byTopic[topic].count += 1;
      }

      // Group by question type
      const qType = (a.question_type || 'unknown').trim();
      if (!byQuestionType[qType]) byQuestionType[qType] = { earned: 0, total: 0, count: 0 };
      byQuestionType[qType].earned += Number(a.marks_awarded || 0);
      byQuestionType[qType].total += Number(a.marks_total || 0);
      byQuestionType[qType].count += 1;
    }

    // Calculate percentages
    for (const [key, stats] of Object.entries(byTopic)) {
      byTopic[key].percentage = stats.total > 0 ? Math.round((stats.earned / stats.total) * 100) : null;
    }
    for (const [key, stats] of Object.entries(byQuestionType)) {
      byQuestionType[key].percentage = stats.total > 0 ? Math.round((stats.earned / stats.total) * 100) : null;
    }

    return { byTopic, byQuestionType };
  } catch (e) {
    console.warn('getTopicPerformance error:', e);
    return { byTopic: {}, byQuestionType: {} };
  }
}

/**
 * Get subject performance stats (average score per subject)
 */
export async function getSubjectPerformance(studentId: string, client?: StudentOSSupabase) {
  if (!studentId) return {};

  try {
    const supabase = clientOrDefault(client);
    const { data: attempts, error } = await supabase
      .from('question_attempts')
      .select('subject_id, marks_awarded, marks_total')
      .eq('student_id', studentId)
      .order('attempted_at', { ascending: false })
      .returns<{ subject_id: string | null; marks_awarded: number | null; marks_total: number | null }[]>();

    if (error || !attempts?.length) return {};

    const bySubject: Record<string, PerformanceStatsBase> = {};
    for (const a of attempts) {
      const sid = a.subject_id || 'unknown';
      if (!bySubject[sid]) bySubject[sid] = { earned: 0, total: 0, count: 0 };
      bySubject[sid].earned += Number(a.marks_awarded || 0);
      bySubject[sid].total += Number(a.marks_total || 0);
      bySubject[sid].count += 1;
    }

    const result: Record<string, { percentage: number | null; questionCount: number }> = {};
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
