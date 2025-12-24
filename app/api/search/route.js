/**
 * Hack Club Search API Route
 * Provides web search functionality using Hack Club's free Brave Search proxy
 * https://search.hackclub.com - Free for Hack Club members
 */

import { NextResponse } from 'next/server';

const HACKCLUB_SEARCH_API_KEY = process.env.HACKCLUB_SEARCH_API_KEY;

export async function GET(request) {
    const { searchParams } = new URL(request.url);
    const q = searchParams.get('q');
    const count = searchParams.get('count') || '5';

    if (!q) {
        return NextResponse.json({ error: 'Query parameter "q" is required' }, { status: 400 });
    }

    // Check for API key (from env or passed as header for user's personal key)
    const userApiKey = request.headers.get('x-hackclub-search-key');
    const apiKey = userApiKey || HACKCLUB_SEARCH_API_KEY;

    if (!apiKey) {
        return NextResponse.json({
            error: 'Hack Club Search API key not configured. Get one at search.hackclub.com'
        }, { status: 400 });
    }

    try {
        const response = await fetch(
            `https://search.hackclub.com/res/v1/web/search?q=${encodeURIComponent(q)}&count=${count}`,
            {
                headers: {
                    'Accept': 'application/json',
                    'Authorization': `Bearer ${apiKey}`
                }
            }
        );

        if (!response.ok) {
            const errorText = await response.text();
            console.error('Hack Club Search API error:', response.status, errorText);
            return NextResponse.json(
                { error: `Hack Club Search API error: ${response.status}` },
                { status: response.status }
            );
        }

        const data = await response.json();

        // Extract relevant results for easier consumption (same format as Brave)
        const results = (data.web?.results || []).map(r => ({
            title: r.title,
            url: r.url,
            description: r.description,
            snippet: r.description
        }));

        return NextResponse.json({
            query: data.query?.original || q,
            results,
            totalResults: data.web?.total || results.length
        });

    } catch (error) {
        console.error('Hack Club Search error:', error);
        return NextResponse.json(
            { error: 'Failed to perform search: ' + error.message },
            { status: 500 }
        );
    }
}

