import { NextResponse } from 'next/server';
import { checkRateLimit } from '@/app/lib/rateLimit';
import { createClient } from '@/app/lib/supabase/server';
import { pickTopWeaknesses } from '@/app/services/studentOS';

const HACKCLUB_API_KEY = process.env.HACKCLUB_API_KEY || '';
const HACKCLUB_API_URL = process.env.HACKCLUB_API_URL || 'https://ai.hackclub.com/proxy/v1/chat/completions';

type AttemptRow = {
    primary_flaw: string | null;
    question_text: string | null;
    marks_awarded: number | null;
    marks_total: number | null;
    feedback_md: string | null;
};

function flawCounts(rows: Pick<AttemptRow, 'primary_flaw'>[]): Record<string, number> {
    const counts: Record<string, number> = {};
    for (const a of rows) {
        const key = (a.primary_flaw || '').trim();
        if (!key) continue;
        counts[key] = (counts[key] || 0) + 1;
    }
    return counts;
}

export async function POST(request: Request) {
    try {
        const supabase = await createClient();
        const {
            data: { user },
            error: authError,
        } = await supabase.auth.getUser();

        if (authError || !user) {
            return NextResponse.json({ error: 'Sign in to generate a weakness paper.' }, { status: 401 });
        }

        const { success } = await checkRateLimit(`weakness-paper:${user.id}`, 4);
        if (!success) {
            return NextResponse.json({ error: 'Too many requests. Try again in a minute.' }, { status: 429 });
        }

        let clientKey: string | undefined;
        try {
            const body = await request.json().catch(() => ({}));
            clientKey = typeof body?.apiKey === 'string' ? body.apiKey : undefined;
        } catch {
            clientKey = undefined;
        }

        const apiKey = clientKey || HACKCLUB_API_KEY;
        if (!apiKey) {
            return NextResponse.json(
                { error: 'No Hack Club API key available. Add one in Settings or configure the server key.' },
                { status: 500 }
            );
        }

        const { data: attempts, error: attErr } = await supabase
            .from('question_attempts')
            .select('primary_flaw, question_text, marks_awarded, marks_total, feedback_md')
            .eq('student_id', user.id)
            .order('attempted_at', { ascending: false })
            .limit(280);

        if (attErr) {
            return NextResponse.json({ error: 'Could not load your attempt history.' }, { status: 500 });
        }

        const rows = (attempts || []) as AttemptRow[];
        const topWeak = pickTopWeaknesses(flawCounts(rows), 5);

        const struggleSamples = rows
            .filter((a) => {
                const earned = Number(a.marks_awarded ?? 0);
                const total = Number(a.marks_total ?? 0);
                return total > 0 && earned < total;
            })
            .slice(0, 12)
            .map((a) => ({
                topic: (a.primary_flaw || 'unspecified').trim(),
                question: (a.question_text || '').slice(0, 400),
                note: (a.feedback_md || '').slice(0, 200),
            }));

        const weaknessLines =
            topWeak.length > 0
                ? topWeak.map((w) => `- ${w.label} (${w.count} flagged attempts)`).join('\n')
                : '- (No primary_flaw tags yet — use sample mistakes below)';

        const sampleBlock =
            struggleSamples.length > 0
                ? JSON.stringify(struggleSamples, null, 2)
                : '[]';

        const system = `You are an expert GCSE examiner. Write a printable practice exam in GitHub-flavoured Markdown only.
Rules:
- Title: "# Custom weakness practice paper"
- Short intro (2 sentences) telling the student this targets their weak areas.
- 8–12 questions, GCSE-style, varied marks (1–6 each). Include a mix of recall, applied, and one longer written question.
- Number questions clearly (1., 2., …). Include mark totals in brackets where appropriate.
- Do NOT copy source questions verbatim; write new questions that test the same ideas and skills.
- End with "## Mark scheme (brief)" with bullet-point acceptable answers.
- No HTML; Markdown only.`;

        const userMsg = `Top weakness themes from primary_flaw counts:
${weaknessLines}

Recent questions the student struggled with (trimmed for length):
${sampleBlock}

Generate the full practice paper Markdown now.`;

        const hcRes = await fetch(HACKCLUB_API_URL, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                Authorization: `Bearer ${apiKey}`,
            },
            body: JSON.stringify({
                model: 'qwen/qwen3-32b',
                temperature: 0.35,
                messages: [
                    { role: 'system', content: system },
                    { role: 'user', content: userMsg },
                ],
            }),
        });

        if (!hcRes.ok) {
            const errText = await hcRes.text();
            return NextResponse.json({ error: `AI error: ${hcRes.status} ${errText}` }, { status: 502 });
        }

        const data = await hcRes.json();
        const markdown = data.choices?.[0]?.message?.content?.trim() || '';

        if (!markdown) {
            return NextResponse.json({ error: 'Empty response from model.' }, { status: 502 });
        }

        return NextResponse.json({ markdown });
    } catch (e) {
        console.error('weakness-paper route:', e);
        const message = e instanceof Error ? e.message : 'Internal error';
        return NextResponse.json({ error: message }, { status: 500 });
    }
}
