import { NextResponse } from 'next/server';

const OPENROUTER_API_KEY = process.env.OPENROUTER_API_KEY || "";
const DEFAULT_MODEL = "google/gemini-2.0-flash-001";

export async function POST(request) {
    try {
        const body = await request.json();
        const { prompt, files, model, temperature = 0.2, maxTokens = 16384 } = body;

        // Use server-side key, or allow client to provide their own
        const apiKey = body.apiKey || OPENROUTER_API_KEY;

        if (!apiKey) {
            return NextResponse.json(
                { error: "OpenRouter API key not configured. Please provide an API key." },
                { status: 400 }
            );
        }

        const effectiveModel = model || DEFAULT_MODEL;

        // Build content array with text and optional images
        const content = [{ type: "text", text: prompt }];

        if (files && files.length > 0) {
            files.forEach(file => {
                content.push({
                    type: "image_url",
                    image_url: {
                        url: `data:${file.mimeType || 'application/pdf'};base64,${file.data}`
                    }
                });
            });
        }

        const response = await fetch("https://openrouter.ai/api/v1/chat/completions", {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
                "Authorization": `Bearer ${apiKey}`,
                "HTTP-Referer": process.env.NEXT_PUBLIC_APP_URL || "https://aimarker.app",
                "X-Title": "AI GCSE Marker"
            },
            body: JSON.stringify({
                model: effectiveModel,
                messages: [
                    {
                        role: "user",
                        content: content
                    }
                ],
                temperature,
                max_tokens: maxTokens
            })
        });

        if (!response.ok) {
            const errorText = await response.text();
            return NextResponse.json(
                { error: `OpenRouter API Error ${response.status}: ${errorText}` },
                { status: response.status }
            );
        }

        const data = await response.json();
        const text = data.choices?.[0]?.message?.content;

        return NextResponse.json({ text, usage: data.usage });
    } catch (error) {
        console.error("OpenRouter API route error:", error);
        return NextResponse.json(
            { error: error.message || "Internal server error" },
            { status: 500 }
        );
    }
}