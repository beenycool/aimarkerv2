import { NextResponse } from 'next/server';
import { createClient } from '@/app/lib/supabase/server';

const GEMINI_API_KEY = process.env.GEMINI_API_KEY || "";

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
        const { messages, model, temperature = 0.2, apiKey: userApiKey } = body;

        // Use server key if user key not provided
        const apiKey = userApiKey || GEMINI_API_KEY;

        if (!apiKey) {
            return NextResponse.json(
                { error: "Gemini API key not configured." },
                { status: 500 }
            );
        }

        // Default to a known model if not provided, strip prefix if user passed "google/gemini..."
        let modelName = model || "gemini-2.0-flash-001";
        if (modelName.startsWith("google/")) {
            const parts = modelName.split("/");
            modelName = parts[1] || "gemini-2.0-flash-001";
        }

        // Convert OpenAI messages to Gemini format
        const contents = [];
        let systemInstruction = undefined;

        if (messages && Array.isArray(messages)) {
            for (const msg of messages) {
                if (msg.role === 'system') {
                    systemInstruction = { parts: [{ text: msg.content }] };
                    continue;
                }

                const role = msg.role === 'assistant' ? 'model' : 'user';
                const parts = [];

                if (Array.isArray(msg.content)) {
                    for (const p of msg.content) {
                        if (p.type === 'text') {
                            parts.push({ text: p.text });
                        } else if (p.type === 'image_url') {
                            // Extract base64 from data URL with validation and try/catch
                            const url = p.image_url?.url;
                            try {
                                if (typeof url !== 'string' || !url.startsWith('data:') || !url.includes(',')) {
                                    // skip this image part
                                    console.warn('Invalid data URL format for image_url:', url?.slice(0, 100));
                                    continue;
                                }
                                const [meta, data] = url.split(',');
                                if (!meta || !data) {
                                    console.warn('Malformed data URL: missing meta or data');
                                    continue;
                                }
                                const metaParts = meta.split(':');
                                if (metaParts.length < 2) {
                                    console.warn('Malformed data URL: missing mime segment');
                                    continue;
                                }
                                const mimeSegment = metaParts[1];
                                const mimeType = mimeSegment.split(';')[0];
                                if (!mimeType) {
                                    console.warn('Could not extract mime type');
                                    continue;
                                }
                                parts.push({ inline_data: { mime_type: mimeType, data } });
                            } catch (err) {
                                console.warn('Error processing data URL:', err.message, url?.slice(0, 100));
                                // skip this image part, continue with other parts
                            }
                        }
                    }
                } else {
                    parts.push({ text: msg.content });
                }

                contents.push({ role, parts });
            }
        }

        const url = `https://generativelanguage.googleapis.com/v1beta/models/${modelName}:generateContent`;

        const payload = {
            contents,
            generationConfig: {
                temperature
            }
        };

        if (systemInstruction) {
            payload.system_instruction = systemInstruction;
        }

        const response = await fetch(url, {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
                "x-goog-api-key": apiKey
            },
            body: JSON.stringify(payload)
        });

        if (!response.ok) {
            const errorText = await response.text();
            return NextResponse.json(
                { error: `Gemini API Error ${response.status}: ${errorText}` },
                { status: response.status }
            );
        }

        const data = await response.json();

        // Extract text from Gemini response structure
        const text = data.candidates?.[0]?.content?.parts?.map(p => p.text).join('') || "";

        return NextResponse.json({ text });
    } catch (error) {
        console.error("Gemini API route error:", error);
        return NextResponse.json(
            { error: error.message || "Internal server error" },
            { status: 500 }
        );
    }
}
