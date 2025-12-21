import { NextResponse } from 'next/server';
import { rateLimit } from '../_lib/rateLimit';
import { randomUUID } from 'crypto';

const OPENROUTER_API_KEY = process.env.OPENROUTER_API_KEY || "";
const DEFAULT_MODEL = "google/gemini-2.0-flash-001";

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

const OPENROUTER_URL = "https://openrouter.ai/api/v1/chat/completions";
const DEFAULT_TIMEOUT_MS = 60_000;

function jsonError(message, status = 400, extra = {}) {
    return NextResponse.json({ error: message, ...extra }, { status });
}

export async function POST(request) {
    try {
        const rl = rateLimit(request, { keyPrefix: 'openrouter', limit: 30, windowMs: 60_000 });
        if (!rl.ok) {
            return jsonError('Rate limit exceeded. Please slow down.', 429, {
                limit: rl.limit,
                windowMs: rl.windowMs,
            });
        }

        const body = await request.json();
        const { prompt, files, model, temperature = 0.2, maxTokens = 16384, responseFormat } = body;

        if (typeof prompt !== 'string' || !prompt.trim()) {
            return jsonError('Missing "prompt" string.', 400);
        }

        // Use server-side key, or allow client to provide their own
        const apiKey = body.apiKey || OPENROUTER_API_KEY;

        if (!apiKey) {
            return jsonError("OpenRouter API key not configured. Please provide an API key.", 400);
        }

        const effectiveModel = model || DEFAULT_MODEL;

        // Build content array with text and optional images
        const content = [{ type: "text", text: prompt }];

        if (files && files.length > 0) {
            // OpenRouter multimodal expects images via `image_url`. This may not work for PDFs,
            // so the client should prefer text extraction when possible.
            files.forEach((file) => {
                if (!file?.data) return;
                content.push({
                    type: "image_url",
                    image_url: {
                        url: `data:${file.mimeType || 'application/pdf'};base64,${file.data}`
                    }
                });
            });
        }

        const requestId = randomUUID();
        const controller = new AbortController();
        const timeout = setTimeout(() => controller.abort(), DEFAULT_TIMEOUT_MS);

        const payload = {
            model: effectiveModel,
            messages: [
                {
                    role: "user",
                    content
                }
            ],
            temperature,
            max_tokens: maxTokens,
        };

        if (responseFormat && typeof responseFormat === 'object') {
            payload.response_format = responseFormat;
            // If the caller requests JSON mode/schema, enable OpenRouter's
            // response-healing plugin to automatically repair malformed JSON.
            // Docs: https://openrouter.ai/docs/guides/features/plugins/response-healing
            payload.plugins = [{ id: 'response-healing' }];
        }

        const response = await fetch(OPENROUTER_URL, {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
                "Authorization": `Bearer ${apiKey}`,
                "HTTP-Referer": process.env.NEXT_PUBLIC_APP_URL || "https://aimarker.app",
                "X-Title": "AI GCSE Marker",
                "X-Request-Id": requestId,
            },
            body: JSON.stringify(payload),
            signal: controller.signal,
        });

        clearTimeout(timeout);

        if (!response.ok) {
            const errorText = await response.text();
            return jsonError(`OpenRouter API Error ${response.status}: ${errorText}`, response.status, { requestId });
        }

        const data = await response.json();
        const text = data.choices?.[0]?.message?.content;

        return NextResponse.json({ text, usage: data.usage, requestId });
    } catch (error) {
        const message = error?.name === 'AbortError'
            ? 'OpenRouter request timed out.'
            : (error.message || 'Internal server error');

        console.error("OpenRouter API route error:", error);
        return jsonError(message, 500);
    }
}