import { NextResponse } from 'next/server';
import { createClient } from '@/app/lib/supabase/server';

const OPENROUTER_API_KEY = process.env.OPENROUTER_API_KEY || "";
const DEFAULT_MODEL = "google/gemini-2.0-flash-001";

function buildFileContent(files = []) {
    return files.map(file => ({
        type: "image_url",
        image_url: {
            url: `data:${file.mimeType || 'application/pdf'};base64,${file.data}`
        }
    }));
}

function attachFilesToMessages(messages, files) {
    if (!files || files.length === 0) return messages;

    const messagesCopy = messages.map(message => ({ ...message }));
    const fileContent = buildFileContent(files);

    let lastUserIndex = -1;
    for (let i = messagesCopy.length - 1; i >= 0; i -= 1) {
        if (messagesCopy[i]?.role === "user") {
            lastUserIndex = i;
            break;
        }
    }

    if (lastUserIndex === -1) {
        return [...messagesCopy, { role: "user", content: fileContent }];
    }

    const userMessage = messagesCopy[lastUserIndex];
    if (Array.isArray(userMessage.content)) {
        userMessage.content = [...userMessage.content, ...fileContent];
        return messagesCopy;
    }

    if (typeof userMessage.content === "string" && userMessage.content.length > 0) {
        userMessage.content = [{ type: "text", text: userMessage.content }, ...fileContent];
        return messagesCopy;
    }

    if (userMessage.content) {
        userMessage.content = [{ type: "text", text: String(userMessage.content) }, ...fileContent];
        return messagesCopy;
    }

    userMessage.content = fileContent;
    return messagesCopy;
}

export async function POST(request) {
    try {
        const supabase = await createClient();
        const { data: { user }, error: authError } = await supabase.auth.getUser();

        if (authError || !user) {
            return NextResponse.json(
                { error: "Authentication required. Please sign in to use this feature." },
                { status: 401 }
            );
        }

        const body = await request.json();
        const { prompt, files, messages, model, temperature = 0.2, maxTokens = 16384 } = body;

        // Use server-side key only (no longer accept client keys for security)
        const apiKey = OPENROUTER_API_KEY;

        if (!apiKey) {
            return NextResponse.json(
                { error: "OpenRouter API key not configured on server." },
                { status: 500 }
            );
        }

        const effectiveModel = model || DEFAULT_MODEL;

        // Determine message structure: use messages directly if provided, else build from prompt+files
        let requestMessages;

        if (messages && Array.isArray(messages) && messages.length > 0) {
            // Direct messages payload (new flexible approach)
            requestMessages = attachFilesToMessages(messages, files);
        } else if (prompt) {
            // Legacy approach: build content array with text and optional images
            const content = [{ type: "text", text: prompt }];

            if (files && files.length > 0) {
                content.push(...buildFileContent(files));
            }

            requestMessages = [
                {
                    role: "user",
                    content: content
                }
            ];
        } else {
            return NextResponse.json(
                { error: "Either 'messages' or 'prompt' must be provided." },
                { status: 400 }
            );
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
                messages: requestMessages,
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
