import { createBrowserClient } from '@supabase/ssr';
import type { SupabaseClient } from '@supabase/supabase-js';
import type { Database } from '../lib/supabase/database.types';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
const fallbackUrl = 'https://placeholder.supabase.co';
const fallbackAnonKey = 'placeholder-anon-key';

let client: SupabaseClient<Database> | null = null;

export function getSupabase() {
    if (!client) {
        client = createBrowserClient<Database>(
            supabaseUrl ?? fallbackUrl,
            supabaseAnonKey ?? fallbackAnonKey
        );
    }
    return client;
}

// For backwards compatibility - lazy initialization
export const supabase = new Proxy({} as SupabaseClient<Database>, {
    get(_target, prop: keyof SupabaseClient<Database>) {
        return getSupabase()[prop];
    }
}) as SupabaseClient<Database>;
