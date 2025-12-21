import { NextResponse } from 'next/server';

const HACKCLUB_API_KEY = process.env.HACKCLUB_API_KEY || "";
const HACKCLUB_API_URL = process.env.HACKCLUB_API_URL || "https://ai.hackclub.com/proxy/v1/chat/completions";

export async function POST(request) {
    try {
        const body = await request.json();
        const { messages, model = "qwen/qwen3-32b", temperature = 0.2 } = body;

        // Use server-side key, or allow client to provide their own
        const apiKey = body.apiKey || HACKCLUB_API_KEY;

        if (!apiKey) {
            return NextResponse.json(
                { error: "Hack Club API key not configured. Please provide an API key." },
                { status: 400 }
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
