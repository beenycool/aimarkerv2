import sys

# Read the file content
with open('app/api/custom_openai/route.js', 'r') as f:
    content = f.read()

# First block replacement
search_1 = """import { NextResponse } from 'next/server';
import { createClient } from '@/app/lib/supabase/server';

export async function POST(request) {"""

replace_1 = """import { NextResponse } from 'next/server';
import { createClient } from '@/app/lib/supabase/server';
import { normalizeOpenAIEndpoint } from '@/app/services/urlUtils';

export async function POST(request) {"""

# Second block replacement (careful with whitespace and template literals)
search_2 = """        // Ensure endpoint ends with /chat/completions if not already (common oversight)
        // However, some might provide the full path. Let's assume user provides base URL usually, e.g. http://localhost:11434/v1
        let url = endpoint;
        if (!url.endsWith('/chat/completions')) {
            url = ;
        }

        const response = await fetch(url, {"""

replace_2 = """        // Validate and normalize the endpoint to prevent SSRF
        let url;
        try {
            url = normalizeOpenAIEndpoint(endpoint);
        } catch (error) {
            return NextResponse.json(
                { error: error.message },
                { status: 400 }
            );
        }

        const response = await fetch(url, {"""

if search_1 not in content:
    print("Error: search_1 block not found")
    sys.exit(1)

if search_2 not in content:
    print("Error: search_2 block not found")
    # Let's print the surrounding area to debug if needed, but likely exact match issue
    sys.exit(1)

new_content = content.replace(search_1, replace_1).replace(search_2, replace_2)

with open('app/api/custom_openai/route.js', 'w') as f:
    f.write(new_content)

print("Successfully updated route.js")
