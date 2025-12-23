import { NextResponse } from 'next/server';
import { createClient } from '@/app/lib/supabase/server';

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
        const { messages, model, temperature = 0.2, apiKey, endpoint } = body;

        // Validation: messages is required, must be an array, and non-empty
        if (!Array.isArray(messages) || messages.length === 0) {
            return NextResponse.json(
                { error: "messages field is required and must be a non-empty array." },
                { status: 400 }
            );
        }

        if (!endpoint) {
            return NextResponse.json(
                { error: "Custom endpoint URL is required." },
                { status: 400 }
            );
        }

        // Ensure endpoint ends with /chat/completions if not already (common oversight)
        // However, some might provide the full path. Let's assume user provides base URL usually, e.g. http://localhost:11434/v1
        let url = endpoint;
        if (!url.endsWith('/chat/completions')) {
            url = `${url.replace(/\/+$/, '')}/chat/completions`;
        }

        const response = await fetch(url, {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
                "Authorization": `Bearer ${apiKey || 'sk-custom-placeholder'}` // Some local LLMs require a dummy key
            },
            body: JSON.stringify({
                model: model || "local-model",
                messages,
                temperature
            })
        });

        if (!response.ok) {
            const errorText = await response.text();
            return NextResponse.json(
                { error: `Custom API Error ${response.status}: ${errorText}` },
                { status: response.status }
            );
        }

        const data = await response.json();
        const text = data.choices?.[0]?.message?.content;

        if (!text) {
            return NextResponse.json(
                { error: "Custom API returned an unexpected response format." },
                { status: 502 }
            );
        }

        return NextResponse.json({ text, usage: data.usage });
    } catch (error) {
        console.error("Custom OpenAI API route error:", error.message);
        return NextResponse.json(
            { error: "An unexpected error occurred. Please try again later." },
            { status: 500 }
        );
    }
}
