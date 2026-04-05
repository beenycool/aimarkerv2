import { MemoryItem } from './types';
import { clientOrDefault, type StudentOSSupabase } from './getSupabase';

export async function upsertMemoryItem(studentId: string, item: Partial<MemoryItem>, client?: StudentOSSupabase): Promise<MemoryItem> {
  if (!studentId) throw new Error('studentId required');
  const supabase = clientOrDefault(client);
  const payload = {
    ...item,
    student_id: studentId,
    updated_at: new Date().toISOString(),
  };
  const { data, error } = await supabase.from('memory_bank_items').upsert(payload as any).select('*').single();
  if (error) throw error;
  return data;
}

export async function listMemoryItems(studentId: string, client?: StudentOSSupabase): Promise<MemoryItem[]> {
  if (!studentId) throw new Error('studentId required');
  const supabase = clientOrDefault(client);
  const { data, error } = await supabase
    .from('memory_bank_items')
    .select('*')
    .eq('student_id', studentId)
    .eq('archived', false)
    .order('updated_at', { ascending: false });
  if (error) throw error;
  return data || [];
}

export async function archiveMemoryItem(studentId: string, id: string, client?: StudentOSSupabase): Promise<void> {
  if (!studentId) throw new Error('studentId required');
  const supabase = clientOrDefault(client);
  const { error } = await (supabase.from('memory_bank_items') as any)
    .update({ archived: true, updated_at: new Date().toISOString() })
    .eq('student_id', studentId)
    .eq('id', id);
  if (error) throw error;
}
