'use client';

/**
 * AI Service abstraction layer
 * Centralizes all API calls using server-side API routes for security
 * Supports user-configurable models
 */

// Default model for tasks
export const DEFAULT_MODELS = {
    vision: "google/gemini-2.0-flash-001",  // For PDF parsing (needs vision capability)
    chat: "google/gemini-2.0-flash-001",    // For text-only tasks
};

// --- HELPER: CLEAN AI JSON ---
export function cleanGeminiJSON(text) {
    if (!text) return "";
    const firstBrace = text.indexOf('{');
    const lastBrace = text.lastIndexOf('}');
    if (firstBrace !== -1 && lastBrace !== -1 && lastBrace > firstBrace) {
        return text.substring(firstBrace, lastBrace + 1);
    }
    return text.replace(/```json\n?|```/g, '').trim();
}

// --- FILE TO BASE64 HELPER ---
export async function fileToBase64(file) {
    return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = () => {
            const result = reader.result;
            const base64 = result.split(',')[1];
            resolve(base64);
        };
        reader.onerror = reject;
        reader.readAsDataURL(file);
    });
}

// --- PROMPTS ---
export const PROMPTS = {
    EXTRACTION: `You are an expert GCSE English Literature paper analyzer. Extract EVERY question, including those referencing extracts or figures.

For EACH question found, output JSON in this EXACT format:
{
  "questions": [
    {
      "id": "1",
      "section": "Section name",
      "type": "multiple_choice|short_text|long_text|list|numerical|table|graph_drawing",
      "marks": 4,
      "pageNumber": 5, 
      "question": "The EXACT full question text",
      "options": ["A) option", "B) option"],
      "listCount": 3,
      "tableStructure": {
        "headers": ["Header A", "Header B"],
        "initialData": [["Pre-filled Item 1", null]]
      },
      "graphConfig": {
        "xLabel": "Concentration (mol/dm3)",
        "yLabel": "Change in Mass (%)",
        "xMin": 0, "xMax": 10,
        "yMin": -5, "yMax": 10
      },
      "context": {
        "type": "text",
        "title": "Source A",
        "content": "Source text...",
        "lines": "1-5"
      },
      "relatedFigure": "Description of image",
      "figurePage": 5,
      "markingRegex": "^(correct answer|answer)$" 
    }
  ]
}

CRITICAL RULES:
1. Extract EVERY question (including sub-questions for poetry/novel extracts).
2. **pageNumber**: The PDF page number where this question appears.
3. **context**: When an extract is referenced, capture a short snippet + line numbers so students can quote evidence.
4. **markingRegex**: If a 1-mark question has a definitive simple answer, provide a Javascript-compatible Regex.
5. Return ONLY the JSON object. Do NOT use markdown formatting blocks.

Also extract the PAPER METADATA in the root object:
{
  "metadata": {
    "subject": "English Literature",
    "board": "AQA",
    "year": 2023,
    "season": "June",
    "paperNumber": "Paper 1"
  },
  "questions": [...]
}`,

    MARK_SCHEME: `Analyze this mark scheme PDF and extract marking criteria for each question.
Output JSON: { "markScheme": { "1": { "totalMarks": 4, "criteria": ["Point 1"], "acceptableAnswers": ["Ans 1"] } } }
Return ONLY JSON.`,

    GRADER_SYSTEM: `You are a Senior Chief Examiner for GCSE English Literature.
Your job: assign precise marks using the supplied mark scheme. Be strict, never exceed the available marks.

PHASE 1: GENRE & CALIBRATION
- Novels/Plays: expect sustained argument tied to the extract and whole text.
- Poetry: reward concise, dense analysis over length.

PHASE 2: GATEKEEPER CHECKS
- If AO3 context is missing for set texts/anthology -> CAP at Level 4.
- If the answer mostly retells plot -> CAP at Level 2.

OUTPUT JSON ONLY:
{"score": number, "max_mark": number, "AO_breakdown": {"AO1": string, "AO2": string, "AO3": string}, "primary_flaw": "short title of main weakness"}`
};

/**
 * Call OpenRouter via server-side API route (secure)
 */
async function callOpenRouterAPI(prompt, files = [], apiKey = null, model = null, temperature = 0.2) {
    const response = await fetch('/api/openrouter', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
            prompt,
            files,
            apiKey, // Will use server key if null
            model: model || DEFAULT_MODELS.vision,
            temperature,
            maxTokens: 16384
        })
    });

    const data = await response.json();

    if (!response.ok) {
        throw new Error(data.error || `API Error ${response.status}`);
    }

    return data.text;
}

/**
 * Call Hack Club via server-side API route (secure)
 */
async function callHackClubAPI(messages, apiKey = null, model = "qwen/qwen3-32b") {
    const response = await fetch('/api/hackclub', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
            messages,
            apiKey, // Will use server key if null
            model,
            temperature: 0.2
        })
    });

    const data = await response.json();

    if (!response.ok) {
        throw new Error(data.error || `API Error ${response.status}`);
    }

    return data.content;
}

/**
 * AIService - Unified API for all AI operations
 */
export const AIService = {
    /**
     * Check if server has OpenRouter API key configured
     */
    checkServerKey: async () => {
        try {
            const response = await fetch('/api/openrouter', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ prompt: 'test', apiKey: null })
            });
            const data = await response.json();
            return !(response.status === 400 && data.error?.includes('not configured'));
        } catch {
            return false;
        }
    },

    /**
     * Check if server has Hack Club API key configured
     */
    checkHackClubServerKey: async () => {
        try {
            const response = await fetch('/api/hackclub', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ messages: [{ role: 'user', content: 'test' }], apiKey: null })
            });
            const data = await response.json();
            return !(response.status === 400 && data.error?.includes('not configured'));
        } catch {
            return false;
        }
    },

    /**
     * Extract questions from PDF files
     */
    extractQuestions: async (paperFile, insertFile, customApiKey, model) => {
        const paperBase64 = await fileToBase64(paperFile);
        let insertBase64 = null;

        if (insertFile) {
            insertBase64 = await fileToBase64(insertFile);
        }

        let extractionPrompt = PROMPTS.EXTRACTION;
        const filesToSend = [{ mimeType: paperFile.type || 'application/pdf', data: paperBase64 }];

        if (insertBase64) {
            extractionPrompt += "\n\nNOTE: An insert/source booklet is also provided as the second file.";
            filesToSend.push({ mimeType: insertFile.type || 'application/pdf', data: insertBase64 });
        }

        const responseText = await callOpenRouterAPI(extractionPrompt, filesToSend, customApiKey, model, 0.1);
        if (!responseText) throw new Error('No response from AI.');

        const cleanedJson = cleanGeminiJSON(responseText);
        const parsed = JSON.parse(cleanedJson);
        return {
            questions: parsed.questions || [],
            metadata: parsed.metadata || {}
        };
    },

    /**
     * Extract insert content for student reference
     */
    extractInsertContent: async (insertFile, customApiKey, model) => {
        const insertBase64 = await fileToBase64(insertFile);
        return await callOpenRouterAPI(
            "Extract ALL text from this insert/source PDF so a student can quote from it. Output plain text only.",
            [{ mimeType: insertFile.type || 'application/pdf', data: insertBase64 }],
            customApiKey,
            model,
            0.1
        );
    },

    /**
     * Parse mark scheme PDF
     */
    parseMarkScheme: async (schemeFile, customApiKey, model) => {
        const schemeBase64 = await fileToBase64(schemeFile);
        const schemeRes = await callOpenRouterAPI(
            PROMPTS.MARK_SCHEME,
            [{ mimeType: schemeFile.type || 'application/pdf', data: schemeBase64 }],
            customApiKey,
            model,
            0.2
        );
        const cleanedScheme = cleanGeminiJSON(schemeRes);
        const parsed = JSON.parse(cleanedScheme);
        return parsed.markScheme || {};
    },

    /**
     * Grade a student's answer
     */
    markQuestion: async (question, answer, scheme, hackClubKey, customApiKey, model) => {
        const studentAnswerText = stringifyAnswer(answer);

        // STEP 1: Strict grader (Kimi/Qwen via Hack Club)
        const graderMessages = [
            { role: "system", content: PROMPTS.GRADER_SYSTEM },
            { role: "user", content: `Question (${question.marks} marks): ${question.question}\nScheme: ${JSON.stringify(scheme)}\nStudent: ${studentAnswerText}` }
        ];

        let graderResponseText = "";
        try {
            graderResponseText = await callHackClubAPI(graderMessages, hackClubKey, "moonshotai/kimi-k2-thinking");
        } catch (primaryErr) {
            graderResponseText = await callHackClubAPI(graderMessages, hackClubKey); // fallback
        }

        const cleanedGrader = cleanGeminiJSON(graderResponseText);
        let parsedGrader = {};
        try { parsedGrader = JSON.parse(cleanedGrader); } catch (e) { }

        const numericScore = Math.min(question.marks, Number(parsedGrader.score ?? 0));
        const primaryFlaw = parsedGrader.primary_flaw ?? parsedGrader.primaryFlaw ?? "Missing analysis or contextual insight.";

        // STEP 2: Tutor (OpenRouter for explanation)
        const tutorPrompt = `You are an expert English Literature tutor.\n\nSTUDENT SCORE: ${numericScore}/${question.marks}\nEXAMINER'S CRITICISM: "${primaryFlaw}"\nQUESTION: "${question.question}"\nSTUDENT ANSWER: "${studentAnswerText}"\n\nTASK:\n1) Tell the student their score.\n2) Explain why they got this score (cite the criticism).\n3) Write a short Model Paragraph that fixes the flaw.\n4) Keep it concise, encouraging, Markdown formatted.`;

        let tutorText = "";
        try {
            tutorText = await callOpenRouterAPI(tutorPrompt, [], customApiKey, model, 0.3);
        } catch (tutorErr) {
            tutorText = `Score: ${numericScore}/${question.marks}. Focus on: ${primaryFlaw}`;
        }

        const rewrite = extractModelParagraph(tutorText) || "Model paragraph included in feedback.";

        return {
            score: numericScore,
            totalMarks: question.marks,
            text: tutorText,
            rewrite,
            primaryFlaw
        };
    },

    /**
     * Get a hint for a question
     */
    getHint: async (question, scheme, hackClubKey) => {
        const messages = [
            { role: "system", content: "Provide a short, exam-specific hint. Do NOT give the full answer." },
            { role: "user", content: `Question: ${question.question}\nContext: ${question.context?.content || 'N/A'}\nMark scheme: ${JSON.stringify(scheme)}` }
        ];
        return await callHackClubAPI(messages, hackClubKey);
    },

    /**
     * Explain feedback in detail
     */
    explainFeedback: async (question, answer, feedback, scheme, hackClubKey) => {
        const messages = [
            { role: "system", content: "Explain the marking decision briefly in Markdown. Focus on what was missing relative to the mark scheme." },
            { role: "user", content: `Question: ${question.question}\nStudent answer: ${stringifyAnswer(answer)}\nFeedback: ${feedback.text}\nMark scheme: ${JSON.stringify(scheme)}\nScore: ${feedback.score}/${feedback.totalMarks}` }
        ];
        return await callHackClubAPI(messages, hackClubKey);
    },

    /**
     * Handle follow-up tutor conversation
     */
    followUp: async (question, answer, feedback, chatHistory, hackClubKey) => {
        const history = chatHistory.map(m => `${m.role}: ${m.text}`).join('\n');
        const messages = [
            { role: "system", content: "Act as a friendly tutor. Keep replies concise and practical." },
            { role: "user", content: `Question: ${question.question}\nStudent answer: ${stringifyAnswer(answer)}\nFeedback: ${feedback.text}\nChat so far:\n${history}` }
        ];
        return await callHackClubAPI(messages, hackClubKey);
    },

    /**
     * Generate a study plan based on weaknesses
     */
    generateStudyPlan: async (percentage, weaknessCounts, questionCount, hackClubKey) => {
        const weaknessSummary = Object.entries(weaknessCounts).map(([k, v]) => `"${k}" (${v}x)`).join(', ');
        const messages = [
            { role: "system", content: "Create a concise 3-step revision plan in Markdown that targets the repeated weaknesses listed." },
            { role: "user", content: `Student scored ${percentage}%. Repeated weaknesses: ${weaknessSummary || 'Not enough data yet.'}. Total questions: ${questionCount}.` }
        ];
        return await callHackClubAPI(messages, hackClubKey);
    }
};

// --- LOCAL HELPERS ---
const normalizeText = (text) => (text || '').toString().toLowerCase().replace(/\s+/g, ' ').trim();

export const stringifyAnswer = (answer) => {
    if (answer === undefined || answer === null) return '';
    if (typeof answer === 'string' || typeof answer === 'number') return String(answer);
    if (Array.isArray(answer)) {
        if (answer.length && Array.isArray(answer[0])) return answer.map(row => row.join(' | ')).join('\n');
        return answer.join('\n');
    }
    if (typeof answer === 'object' && answer.points) {
        return `Graph submission: points ${JSON.stringify(answer.points)} lines ${JSON.stringify(answer.lines || [])}`;
    }
    return JSON.stringify(answer);
};

const extractModelParagraph = (markdown) => {
    if (!markdown) return null;
    const match = markdown.match(/Model Paragraph[:\-]*\s*([\s\S]*)/i);
    if (!match) return null;
    const chunk = match[1].split(/\n\s*\n/)[0];
    return chunk?.trim() || null;
};

/**
 * Safe regex checker with try/catch to handle invalid AI-generated patterns
 */
export const checkRegex = (regexStr, value) => {
    try {
        // Basic sanitization for common AI mistakes
        const safeRegex = regexStr.replace(/(^|[^\\'])(\/)/g, '$1\\/');
        const re = new RegExp(safeRegex, 'i');
        return re.test(String(value).trim());
    } catch (e) {
        console.warn("Invalid Regex provided by AI:", regexStr, e);
        return false;
    }
};

/**
 * Evaluate answer locally when API is unavailable
 */
export const evaluateAnswerLocally = (question, answer, scheme) => {
    const totalMarks = question.marks || scheme?.totalMarks || 0;
    const answerText = stringifyAnswer(answer);
    const normalized = normalizeText(answerText);

    if (!normalized) {
        return { score: 0, totalMarks, text: "No answer provided.", rewrite: "" };
    }

    // Check regex if available
    if (question.markingRegex) {
        if (checkRegex(question.markingRegex, normalized)) {
            return { score: totalMarks, totalMarks, text: "Matched expected answer via regex.", rewrite: `**${answerText}**` };
        }
    }

    if (scheme) {
        const acceptable = scheme.acceptableAnswers || [];
        const criteria = scheme.criteria || [];
        const matches = [];
        let score = 0;

        acceptable.forEach(ans => {
            if (normalized.includes(normalizeText(ans))) {
                matches.push(ans);
                score += 1;
            }
        });

        criteria.forEach(crit => {
            if (normalized.includes(normalizeText(crit))) {
                matches.push(crit);
                score += 0.5;
            }
        });

        const cappedScore = Math.min(totalMarks, Math.max(0, Math.round(score)));
        const uniqueMatches = Array.from(new Set(matches)).slice(0, 5);
        const feedbackParts = [];

        if (uniqueMatches.length) feedbackParts.push(`Matched mark scheme points: ${uniqueMatches.join('; ')}.`);
        if (criteria.length && !uniqueMatches.length) feedbackParts.push("Include the key points from the mark scheme to gain marks.");
        if (acceptable.length && cappedScore < totalMarks) feedbackParts.push("Try to mirror the sample answers more closely.");

        return {
            score: cappedScore,
            totalMarks,
            text: feedbackParts.join(' ') || "Partial credit awarded based on keyword matches.",
            rewrite: acceptable[0] ? `Model answer idea: **${acceptable[0]}**` : answerText
        };
    }

    return {
        score: 0,
        totalMarks,
        text: "Mark scheme unavailable. Compare your answer against the question requirements.",
        rewrite: answerText
    };
};

/**
 * Build a hint from mark scheme (fallback when API is unavailable)
 */
export const buildHintFromScheme = (question, scheme) => {
    const hints = [];
    if (question.context?.content) hints.push(`Re-read the provided context: "${question.context.content.slice(0, 160)}..."`);
    if (scheme?.criteria?.length) hints.push(`Checklist: ${scheme.criteria.slice(0, 3).join('; ')}`);
    if (question.type === 'multiple_choice' && question.options?.length) hints.push("Eliminate clearly wrong options before choosing.");
    if (question.type === 'long_text') hints.push("Plan your answer with bullet points before writing full sentences.");
    if (!hints.length) hints.push("Focus on the command words and allocate your marks accordingly.");
    return hints.map(h => `• ${h}`).join('\n');
};

/**
 * Build explanation from feedback (fallback when API is unavailable)
 */
export const buildExplanationFromFeedback = (question, answer, feedback, scheme) => {
    const lines = [
        `You scored ${feedback.score}/${feedback.totalMarks}.`,
        feedback.text || "Review the expected points for this question."
    ];
    if (scheme?.criteria?.length) lines.push(`Key points to include next time: ${scheme.criteria.join('; ')}`);
    const answerText = stringifyAnswer(answer);
    if (answerText) lines.push(`Your answer: ${answerText}`);
    return lines.join('\n\n');
};

/**
 * Build follow-up reply (fallback when API is unavailable)
 */
export const buildFollowUpReply = (userText, question, feedback) => {
    return `On "${question.question}", remember: ${feedback.text || 'focus on the required points.'} Regarding "${userText}", revisit the missing points and rewrite your answer with them included.`;
};

/**
 * Build study plan (fallback when API is unavailable)
 */
export const buildStudyPlan = (percentage, weaknessCounts) => {
    const sortedWeaknesses = Object.entries(weaknessCounts || {}).sort((a, b) => b[1] - a[1]);
    const topWeaknesses = sortedWeaknesses.slice(0, 3);
    const focusList = topWeaknesses.length
        ? topWeaknesses.map(([weak, count]) => `- ${weak} (seen ${count}x): drill 2 short paragraphs per day that fix this flaw.`).join('\n')
        : '- Mixed weaknesses: keep practicing timed extracts + quick AO3 notes.';

    return `### Quick Study Plan\n\nCurrent performance: ${percentage}%.\n\nFocus areas:\n${focusList}\n\nDaily loop:\n1) 15 mins: revisit a model paragraph and annotate techniques\n2) 15 mins: write a fresh paragraph fixing the listed weakness\n3) 10 mins: self-mark against AO1/AO2/AO3 and refine`;
};

export default AIService;