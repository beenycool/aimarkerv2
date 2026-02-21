import { SupabaseClient } from '@supabase/supabase-js';
export const supabase: SupabaseClient;
export function getSupabase(): SupabaseClient | null;
