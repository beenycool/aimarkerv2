import { createBrowserClient } from '@supabase/ssr';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

// Use SSR client so auth session is shared with AuthProvider
export const supabase = createBrowserClient(supabaseUrl, supabaseAnonKey);