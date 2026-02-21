import { createBrowserClient } from '@supabase/ssr';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

let client = null;

export function getSupabase() {
    if (!client) {
        if (!supabaseUrl || !supabaseAnonKey) {
            if (typeof window === 'undefined') {
                // Server-side during build: return null
                return null;
            }
            throw new Error(
                'Missing Supabase environment variables. Please check your .env file.'
            );
        }
        client = createBrowserClient(supabaseUrl, supabaseAnonKey);
    }
    return client;
}

// For backwards compatibility - lazy initialization
export const supabase = new Proxy({}, {
    get(target, prop) {
        const client = getSupabase();
        if (!client) {
            return () => {};
        }
        return client[prop];
    }
});