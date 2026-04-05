import { Subject } from './types';
import { clientOrDefault, type StudentOSSupabase } from './getSupabase';

export async function listSubjects(studentId: string, client?: StudentOSSupabase): Promise<Subject[]> {
  if (!studentId) throw new Error('studentId required');
  const supabase = clientOrDefault(client);
  const { data, error } = await supabase
    .from('subjects')
    .select('*')
    .eq('student_id', studentId)
    .order('created_at', { ascending: true });
  if (error) throw error;
  return data || [];
}

export async function getSubject(studentId: string, subjectId: string, client?: StudentOSSupabase): Promise<Subject> {
  if (!studentId) throw new Error('studentId required');
  const supabase = clientOrDefault(client);
  const { data, error } = await supabase
    .from('subjects')
    .select('*')
    .eq('student_id', studentId)
    .eq('id', subjectId)
    .single();
  if (error) throw error;
  return data;
}

export async function createSubject(studentId: string, input: Partial<Subject>, client?: StudentOSSupabase): Promise<Subject> {
  if (!studentId) throw new Error('studentId required');
  const supabase = clientOrDefault(client);
  const payload = {
    student_id: studentId,
    name: (input?.name || '').trim(),
    exam_board: input?.exam_board || null,
    target_grade: input?.target_grade || null,
    weekly_minutes: Number.isFinite(input?.weekly_minutes) ? input.weekly_minutes : null,
    tier: input?.tier || null,
  };
  const { data, error } = await supabase.from('subjects').insert(payload as any).select('*').single();
  if (error) throw error;
  return data;
}

export async function deleteSubject(studentId: string, subjectId: string, client?: StudentOSSupabase): Promise<void> {
  if (!studentId) throw new Error('studentId required');
  const supabase = clientOrDefault(client);
  const { error } = await supabase.from('subjects').delete().eq('student_id', studentId).eq('id', subjectId);
  if (error) throw error;
}

export async function ensureSubjectForStudent(
  studentId: string,
  { name, exam_board }: { name?: string; exam_board?: string },
  client?: StudentOSSupabase
): Promise<Subject | null> {
  if (!studentId) throw new Error('studentId required');
  const supabase = clientOrDefault(client);

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
      target_grade: null,
      weekly_minutes: 90,
    } as any)
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
