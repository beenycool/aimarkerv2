// @ts-nocheck
import { supabase } from '../supabaseClient';
import { isoToday } from '../dateUtils';
import { Assessment, AssessmentAttachment } from './types';

export async function listAssessments(studentId: string): Promise<Assessment[]> {
  if (!studentId) throw new Error('studentId required');
  const { data, error } = await supabase
    .from('assessments')
    .select('*')
    .eq('student_id', studentId)
    .order('date', { ascending: true });
  if (error) throw error;
  return data || [];
}

export async function createAssessment(studentId: string, input: Partial<Assessment>): Promise<Assessment> {
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

export async function uploadAssessmentFile(studentId: string, file: any): Promise<{ path: string }> {
  if (!studentId) throw new Error('studentId required');
  if (!file) throw new Error('file required');

  const timestamp = Date.now();
  // Safe filename handling
  const fileName = file.name || 'unnamed_file';
  const safeName = fileName.replace(/[^a-zA-Z0-9._-]/g, '_');
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

export async function deleteAssessmentFiles(paths: string[] = []): Promise<void> {
  if (!paths.length) return;
  const { error } = await supabase.storage.from('assessment-pdfs').remove(paths);
  if (error) throw error;
}

export async function deleteAssessment(studentId: string, assessmentId: string, attachments: (string | AssessmentAttachment)[] = []): Promise<void> {
  if (!studentId) throw new Error('studentId required');
  const attachmentPaths = (attachments || [])
    .map((item) => (typeof item === 'string' ? item : item?.path))
    .filter(Boolean);
  if (attachmentPaths.length) {
    await deleteAssessmentFiles(attachmentPaths as string[]);
  }
  const { error } = await supabase
    .from('assessments')
    .delete()
    .eq('student_id', studentId)
    .eq('id', assessmentId);
  if (error) throw error;
}

/**
 * Get upcoming assessments (within next 30 days)
 */
export async function getUpcomingAssessments(studentId: string): Promise<Assessment[]> {
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
