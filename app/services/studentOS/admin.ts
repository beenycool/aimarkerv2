import { supabase } from '../supabaseClient';
import { DEFAULT_SETTINGS } from './settings';

/**
 * Delete all student data (for reset functionality)
 */
export async function deleteAllStudentData(studentId: string): Promise<void> {
  if (!studentId) throw new Error('studentId required');

  await supabase.from('question_attempts').delete().eq('student_id', studentId);
  await supabase.from('study_sessions').delete().eq('student_id', studentId);
  await supabase.from('memory_bank_items').delete().eq('student_id', studentId);
  await supabase.from('assessments').delete().eq('student_id', studentId);
  await supabase.from('subjects').delete().eq('student_id', studentId);
  await supabase.from('upcoming_exams').delete().eq('student_id', studentId);

  await supabase
    .from('student_settings')
    .update({ ...DEFAULT_SETTINGS, updated_at: new Date().toISOString() })
    .eq('student_id', studentId);
}
