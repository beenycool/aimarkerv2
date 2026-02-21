'use client';

import { createBrowserClient } from '@supabase/ssr';
import type { SupabaseClient } from '@supabase/supabase-js';

let client: SupabaseClient | null = null;

export function createClient() {
    // Return cached client if already created
    if (client) {
        return client;
    }

    const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

    // During build/SSR, env vars might not be available
    // Create a dummy client that will be replaced on client-side
    if (!url || !key) {
        if (typeof window === 'undefined') {
            // Server-side: return a minimal mock to prevent build errors
            // The real client will be created on the client-side
            return null as unknown as SupabaseClient;
        }
        throw new Error(
            'Missing Supabase environment variables. Please check your .env file.'
        );
    }

    client = createBrowserClient(url, key);
    return client;
}
