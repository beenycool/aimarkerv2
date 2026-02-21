import { NextResponse } from 'next/server';
import { createClient } from '@/app/lib/supabase/server';

/**
 * API key status endpoint
 * Returns which keys are configured on the server (without exposing the actual keys)
 * Requires authentication to prevent information disclosure
 */

export async function GET() {
    try {
        const supabase = await createClient();
        const { data: { user }, error: authError } = await supabase.auth.getUser();

        if (authError || !user) {
            return NextResponse.json(
                { error: "Authentication required" },
                { status: 401 }
            );
        }

        return NextResponse.json({
            openrouter: !!process.env.OPENROUTER_API_KEY,
            hackclub: !!process.env.HACKCLUB_API_KEY,
            hackclub_search: !!process.env.HACKCLUB_SEARCH_API_KEY,
            gemini: !!process.env.GEMINI_API_KEY,
        });
    } catch (error) {
        console.error("Key status API error:", error);
        return NextResponse.json(
            { error: "Internal server error" },
            { status: 500 }
        );
    }
}
