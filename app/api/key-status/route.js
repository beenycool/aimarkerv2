/**
 * API key status endpoint
 * Returns which keys are configured on the server (without exposing the actual keys)
 */

export async function GET() {
    return Response.json({
        openrouter: !!process.env.OPENROUTER_API_KEY,
        hackclub: !!process.env.HACKCLUB_API_KEY,
        hackclub_search: !!process.env.HACKCLUB_SEARCH_API_KEY,
        gemini: !!process.env.GEMINI_API_KEY,
    });
}
