import { NextResponse } from 'next/server';
import { createClient } from '@/app/lib/supabase/server';

const HACKCLUB_API_KEY = process.env.HACKCLUB_API_KEY || "";
const HACKCLUB_API_URL = process.env.HACKCLUB_API_URL || "https://ai.hackclub.com/proxy/v1/chat/completions";

export async function POST(request) {
    try {
        // Enforce authentication
        const supabase = await createClient();
        const { data: { user }, error: authError } = await supabase.auth.getUser();

        if (authError || !user) {
            return NextResponse.json(
                { error: "Authentication required. Please sign in to use this feature." },
                { status: 401 }
            );
        }

        const body = await request.json();
        const { messages, model = "qwen/qwen3-32b", temperature = 0.2 } = body;

        // Use server-side key only (no longer accept client keys for security)
        const apiKey = HACKCLUB_API_KEY;

        if (!apiKey) {
            return NextResponse.json(
                { error: "Hack Club API key not configured on server." },
                { status: 500 }
            );
        }

        const response = await fetch(HACKCLUB_API_URL, {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
                "Authorization": `Bearer ${apiKey}`
            },
            body: JSON.stringify({
                model,
                messages,
                temperature
            })
        });

        if (!response.ok) {
            const errorText = await response.text();
            return NextResponse.json(
                { error: `Hack Club API Error ${response.status}: ${errorText}` },
                { status: response.status }
            );
        }

        const data = await response.json();
        const content = data.choices?.[0]?.message?.content || "";

        return NextResponse.json({ content, usage: data.usage });
    } catch (error) {
        console.error("Hack Club API route error:", error);
        return NextResponse.json(
            { error: error.message || "Internal server error" },
            { status: 500 }
        );
    }
}