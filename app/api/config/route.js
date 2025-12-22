import { NextResponse } from 'next/server';

// This endpoint intentionally returns only booleans (no secrets)
// so the client can decide whether to prompt the user for BYOK keys.
export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function GET() {
  return NextResponse.json({
    hasOpenRouterKey: Boolean(process.env.OPENROUTER_API_KEY),
    hasHackClubKey: Boolean(process.env.HACKCLUB_API_KEY),
  });
}
