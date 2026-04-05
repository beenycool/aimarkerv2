import { getSupabase } from '../supabaseClient';
import type { SupabaseClient } from '@supabase/supabase-js';
import type { Database } from '@/app/lib/supabase/database.types';

export type StudentOSSupabase = SupabaseClient<Database>;

export function clientOrDefault(client?: StudentOSSupabase): StudentOSSupabase {
  return client ?? getSupabase();
}
