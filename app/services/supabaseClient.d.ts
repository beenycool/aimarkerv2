import { SupabaseClient } from '@supabase/supabase-js';
import { Database } from '../lib/supabase/database.types';

export const supabase: SupabaseClient<Database>;
export function getSupabase(): SupabaseClient<Database>;
