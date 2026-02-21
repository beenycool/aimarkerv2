import { supabase } from '../supabaseClient';
import { isoToday } from '../dateUtils';
import { UpcomingExam } from './types';

export async function listUpcomingExams(studentId: string): Promise<UpcomingExam[]> {
  if (!studentId) throw new Error('studentId required');
  const today = isoToday();
  const { data, error } = await supabase
    .from('upcoming_exams')
    .select('*')
    .eq('student_id', studentId)
    .gte('exam_date', today)
    .order('exam_date', { ascending: true });
  if (error) throw error;
  return data || [];
}

export async function createUpcomingExam(studentId: string, input: Partial<UpcomingExam>): Promise<UpcomingExam> {
  if (!studentId) throw new Error('studentId required');
  const payload = {
    student_id: studentId,
    subject_id: input.subject_id || null,
    title: input.title,
    exam_date: input.exam_date,
    exam_time: input.exam_time || null,
    duration_minutes: Number.isFinite(input.duration_minutes) ? input.duration_minutes : null,
    location: input.location || null,
    notes: input.notes || null,
    topics: Array.isArray(input.topics) ? input.topics : [],
    source: input.source || 'manual',
    type: input.type || 'real',
  };
  const { data, error } = await supabase.from('upcoming_exams').insert(payload).select('*').single();
  if (error) throw error;
  return data;
}

export async function updateUpcomingExam(studentId: string, examId: string, patch: Partial<UpcomingExam>): Promise<UpcomingExam> {
  if (!studentId) throw new Error('studentId required');
  const { data, error } = await supabase
    .from('upcoming_exams')
    .update({ ...patch, updated_at: new Date().toISOString() })
    .eq('student_id', studentId)
    .eq('id', examId)
    .select('*')
    .single();
  if (error) throw error;
  return data;
}

export async function deleteUpcomingExam(studentId: string, examId: string): Promise<void> {
  if (!studentId) throw new Error('studentId required');
  const { error } = await supabase
    .from('upcoming_exams')
    .delete()
    .eq('student_id', studentId)
    .eq('id', examId);
  if (error) throw error;
}

export async function bulkCreateUpcomingExams(studentId: string, exams: Partial<UpcomingExam>[]): Promise<UpcomingExam[]> {
  if (!studentId) throw new Error('studentId required');
  if (!exams?.length) return [];

  const payloads = exams.map(exam => ({
    student_id: studentId,
    subject_id: exam.subject_id || null,
    title: exam.title,
    exam_date: exam.exam_date,
    exam_time: exam.exam_time || null,
    duration_minutes: Number.isFinite(exam.duration_minutes) ? exam.duration_minutes : null,
    location: exam.location || null,
    notes: exam.notes || null,
    topics: Array.isArray(exam.topics) ? exam.topics : [],
    source: 'ai_parsed',
    type: exam.type || 'real',
  }));

  const { data, error } = await supabase.from('upcoming_exams').insert(payloads).select('*');
  if (error) throw error;
  return data || [];
}
