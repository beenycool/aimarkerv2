// @ts-nocheck
import { supabase } from '../supabaseClient';
import { MemoryItem } from './types';

export async function upsertMemoryItem(studentId: string, item: Partial<MemoryItem>): Promise<MemoryItem> {
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

export async function listMemoryItems(studentId: string): Promise<MemoryItem[]> {
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

export async function archiveMemoryItem(studentId: string, id: string): Promise<void> {
  if (!studentId) throw new Error('studentId required');
  const { error } = await supabase
    .from('memory_bank_items')
    .update({ archived: true, updated_at: new Date().toISOString() })
    .eq('student_id', studentId)
    .eq('id', id);
  if (error) throw error;
}
