import { NextResponse } from 'next/server';
import { randomUUID } from 'crypto';
import { rateLimit } from '../_lib/rateLimit';

const HACKCLUB_API_KEY = process.env.HACKCLUB_API_KEY || "";
const HACKCLUB_API_URL = process.env.HACKCLUB_API_URL || "https://ai.hackclub.com/proxy/v1/chat/completions";

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

const DEFAULT_TIMEOUT_MS = 60_000;

function jsonError(message, status = 400, extra = {}) {
    return NextResponse.json({ error: message, ...extra }, { status });
}

export async function POST(request) {
    try {
        const rl = rateLimit(request, { keyPrefix: 'hackclub', limit: 60, windowMs: 60_000 });
        if (!rl.ok) {
            return jsonError('Rate limit exceeded. Please slow down.', 429, {
                limit: rl.limit,
                windowMs: rl.windowMs,
            });
        }

        const body = await request.json();
        const { messages, model = "qwen/qwen3-32b", temperature = 0.2, responseFormat } = body;

        if (!Array.isArray(messages) || messages.length === 0) {
            return jsonError('Missing "messages" array.', 400);
        }

        // Use server-side key, or allow client to provide their own
        const apiKey = body.apiKey || HACKCLUB_API_KEY;

        if (!apiKey) return jsonError("Hack Club API key not configured. Please provide an API key.", 400);

        const requestId = randomUUID();
        const controller = new AbortController();
        const timeout = setTimeout(() => controller.abort(), DEFAULT_TIMEOUT_MS);

        const payload = {
            model,
            messages,
            temperature,
        };

        if (responseFormat && typeof responseFormat === 'object') {
            payload.response_format = responseFormat;
        }

        const response = await fetch(HACKCLUB_API_URL, {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
                "Authorization": `Bearer ${apiKey}`,
                "X-Request-Id": requestId,
            },
            body: JSON.stringify(payload),
            signal: controller.signal,
        });

        clearTimeout(timeout);

        if (!response.ok) {
            const errorText = await response.text();
            return jsonError(`Hack Club API Error ${response.status}: ${errorText}`, response.status, { requestId });
        }

        const data = await response.json();
        const content = data.choices?.[0]?.message?.content || "";

        return NextResponse.json({ content, usage: data.usage, requestId });
    } catch (error) {
        const message = error?.name === 'AbortError'
            ? 'Hack Club request timed out.'
            : (error.message || "Internal server error");

        console.error("Hack Club API route error:", error);
        return jsonError(message, 500, { requestId: requestId ?? undefined });
    }
}