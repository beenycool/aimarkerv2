'use client';

/**
 * AI Service abstraction layer
 * Centralizes all API calls using server-side API routes for security
 * Supports user-configurable models and global API toggles
 * Now supports per-feature provider/model configuration
 */

import { getOrCreateSettings, DEFAULT_AI_PREFERENCES } from './studentOS';
import { getMemoryContextForAI } from './memoryService';

// Feature descriptions for UI
export const AI_FEATURE_DESCRIPTIONS = {
    parsing: {
        name: "PDF Parsing",
        description: "Extracts questions and mark schemes from exam PDFs",
        requiresVision: true,
        visionWarning: "This feature requires vision capability. Hack Club API may not support PDF parsing."
    },
    grading: {
        name: "Answer Grading",
        description: "Evaluates student answers using mark scheme criteria",
        requiresVision: false
    },
    tutor: {
        name: "Tutor Feedback",
        description: "Generates explanatory feedback and model answers",
        requiresVision: false
    },
    planning: {
        name: "Schedule Planning",
        description: "Creates personalized weekly study schedules",
        requiresVision: false
    },
    hints: {
        name: "Hints & Tips",
        description: "Provides exam-specific hints without giving answers",
        requiresVision: false
    }
};

// --- API Enable Check ---
let cachedSettings = null;
let cacheExpiry = 0;
const CACHE_TTL = 60000; // 1 minute

/**
 * Get the feature configuration + global settings
 */
export function clearSettingsCache() {
    cachedSettings = null;
    cacheExpiry = 0;
}

export async function getFullAISettings(studentId) {
    if (!studentId) return { ai_preferences: DEFAULT_AI_PREFERENCES, custom_api_config: {} };

    try {
        if (cachedSettings && Date.now() < cacheExpiry) {
            return cachedSettings;
        }
        const settings = await getOrCreateSettings(studentId);
        cachedSettings = settings;
        cacheExpiry = Date.now() + CACHE_TTL;
        return settings;
    } catch (e) {
        console.warn('Failed to get AI settings:', e);
        return { ai_preferences: DEFAULT_AI_PREFERENCES, custom_api_config: {} };
    }
}

/**
 * Call OpenRouter via server-side API route
 */
async function callOpenRouterAPI(messages, files = [], apiKey = null, model = null, temperature = 0.2) {
    // Standardize 'messages' or 'prompt' format
    // Implementation expects standardized 'messages' array in new route, or handles conversion
    // But existing route supports both. Let's stick to the structure expected by route.js.

    // Check if we need to convert simple prompt to messages
    let payload = {};
    if (typeof messages === 'string') {
        payload = { prompt: messages, files, messages: null };
    } else {
        payload = { messages, files: [], prompt: null };
        // Note: files usually attached to messages in OpenAI format, 
        // but if passed separately, route might handle. 
        // Our updated route handles 'messages' with 'image_url'. 
        // If 'files' arg is present and 'messages' is string, we use legacy prop.
    }

    const response = await fetch('/api/openrouter', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
            ...payload,
            apiKey,
            model,
            temperature,
            maxTokens: 16384
        })
    });

    const data = await response.json();
    if (!response.ok) throw new Error(data.error || `OpenRouter API Error ${response.status}`);
    return data.text;
}

/**
 * Call Hack Club via server-side API route
 */
async function callHackClubAPI(messages, apiKey = null, model = "qwen/qwen3-32b") {
    const response = await fetch('/api/hackclub', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
            messages,
            apiKey,
            model,
            temperature: 0.2
        })
    });

    const data = await response.json();
    if (!response.ok) throw new Error(data.error || `Hack Club API Error ${response.status}`);
    return data.content;
}

/**
 * Call Gemini via server-side API route
 */
async function callGeminiAPI(messages, apiKey = null, model = "gemini-2.0-flash-001") {
    // Convert string prompt to messages if needed
    let formattedMessages = messages;
    if (typeof messages === 'string') {
        formattedMessages = [{ role: 'user', content: messages }];
    }

    const response = await fetch('/api/gemini', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
            messages: formattedMessages,
            apiKey,
            model,
            temperature: 0.2
        })
    });

    const data = await response.json();
    if (!response.ok) throw new Error(data.error || `Gemini API Error ${response.status}`);
    return data.text;
}

/**
 * Call Custom OpenAI Provider via server-side API route
 */
async function callCustomOpenAIAPI(messages, endpoint, apiKey, model) {
    let formattedMessages = messages;
    if (typeof messages === 'string') {
        formattedMessages = [{ role: 'user', content: messages }];
    }

    const response = await fetch('/api/custom_openai', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
            messages: formattedMessages,
            endpoint,
            apiKey,
            model,
            temperature: 0.2
        })
    });

    const data = await response.json();
    if (!response.ok) throw new Error(data.error || `Custom API Error ${response.status}`);
    return data.text;
}

/**
 * Unified AI caller
 */
export async function callAI(provider, messages, model, options = {}) {
    const { temperature = 0.2, files = [], apiKey, customConfig = {} } = options;

    // Attach files to messages if needed for providers supporting vision in standard way
    // For now keeping 'files' separated for OpenRouter legacy support in helper, 
    // but ideally we merge them.

    switch (provider) {
        case 'openrouter':
            return callOpenRouterAPI(messages, files, apiKey, model, temperature);
        case 'hackclub':
            return callHackClubAPI(messages, apiKey, model);
        case 'gemini':
            // Use gemini_key from customConfig if apiKey not provided
            const geminiApiKey = apiKey || customConfig?.gemini_key;
            return callGeminiAPI(messages, geminiApiKey, model);
        case 'custom_openai':
            const { openai_endpoint, openai_key } = customConfig;
            return callCustomOpenAIAPI(messages, openai_endpoint, openai_key, model);
        default:
            throw new Error(`Unknown provider: ${provider}`);
    }
}

/**
 * Helper to resolve configuration for a task
 */
async function resolveConfig(studentId, featureKey, overrideKey, overrideModel, overrideProvider) {
    const settings = await getFullAISettings(studentId);
    const prefs = settings.ai_preferences || DEFAULT_AI_PREFERENCES;
    const config = prefs[featureKey] || DEFAULT_AI_PREFERENCES[featureKey];

    let provider = config.provider;
    let model = overrideModel || config.model;
    let apiKey = undefined;

    // Only apply overrideKey if overrideProvider is also provided and matches the resolved provider
    if (overrideProvider && overrideProvider === provider && overrideKey) {
        apiKey = overrideKey;
    }
    // If overrideKey is present without overrideProvider, don't attach it
    // This allows the resolved provider to use its configured key from settings

    const customConfig = settings.custom_api_config || {};

    return { provider, model, apiKey, customConfig };
}

export function cleanGeminiJSON(text) {
    if (!text) return '';
    let cleaned = String(text).trim();

    const fencedMatch = cleaned.match(/```(?:json)?\s*([\s\S]*?)\s*```/i);
    if (fencedMatch?.[1]) {
        cleaned = fencedMatch[1].trim();
    }

    const firstBrace = cleaned.indexOf('{');
    const firstBracket = cleaned.indexOf('[');
    let start = -1;

    if (firstBrace !== -1 && firstBracket !== -1) {
        start = Math.min(firstBrace, firstBracket);
    } else {
        start = Math.max(firstBrace, firstBracket);
    }

    if (start > 0) {
        cleaned = cleaned.slice(start);
    }

    const lastBrace = cleaned.lastIndexOf('}');
    const lastBracket = cleaned.lastIndexOf(']');
    const end = Math.max(lastBrace, lastBracket);

    if (end !== -1 && end < cleaned.length - 1) {
        cleaned = cleaned.slice(0, end + 1);
    }

    return cleaned.trim();
}

async function fileToBase64(file) {
    if (!file) return null;
    if (typeof file === 'string') {
        if (file.startsWith('data:')) return file.split(',')[1] || '';
        return file;
    }
    if (file.data && typeof file.data === 'string' && !file.arrayBuffer) return file.data;
    if (typeof file.arrayBuffer !== 'function') return null;

    const buffer = await file.arrayBuffer();
    const bytes = new Uint8Array(buffer);
    let binary = '';

    for (let i = 0; i < bytes.length; i += 0x8000) {
        binary += String.fromCharCode(...bytes.subarray(i, i + 0x8000));
    }

    if (typeof btoa === 'function') {
        return btoa(binary);
    }
    if (typeof Buffer !== 'undefined') {
        return Buffer.from(binary, 'binary').toString('base64');
    }
    return null;
}

export const AIService = {
    checkServerKey: async () => { /* ... existing ... */ return true; }, // keeping implementations light here, actual checks should be done same as before
    // (Re-implementing checkServerKeys below properly)

    checkServerKey: async () => {
        try {
            const response = await fetch('/api/openrouter', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ prompt: 'test', apiKey: null })
            });
            const data = await response.json();
            return !(response.status === 400 && data.error?.includes('not configured'));
        } catch { return false; }
    },

    checkHackClubServerKey: async () => {
        try {
            const response = await fetch('/api/hackclub', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ messages: [{ role: 'user', content: 'test' }], apiKey: null })
            });
            const data = await response.json();
            return !(response.status === 400 && data.error?.includes('not configured'));
        } catch { return false; }
    },

    extractQuestions: async (paperFile, insertFile, customApiKey, model, studentId) => {
        const { provider, model: activeModel, apiKey, customConfig } = await resolveConfig(studentId, 'parsing', customApiKey, model);

        const paperBase64 = await fileToBase64(paperFile);
        let insertBase64 = null;
        if (insertFile) insertBase64 = await fileToBase64(insertFile);

        let extractionPrompt = PROMPTS.EXTRACTION;

        // Construct messages with images
        const content = [{ type: "text", text: extractionPrompt }];
        content.push({ type: "image_url", image_url: { url: `data:${paperFile.type || 'application/pdf'};base64,${paperBase64}` } });
        if (insertBase64) {
            content[0].text += "\n\nNOTE: An insert/source booklet is also provided as the second file.";
            content.push({ type: "image_url", image_url: { url: `data:${insertFile.type || 'application/pdf'};base64,${insertBase64}` } });
        }

        const messages = [{ role: "user", content }];

        const responseText = await callAI(provider, messages, activeModel, { apiKey, customConfig });

        const cleanedJson = cleanGeminiJSON(responseText);
        const parsed = JSON.parse(cleanedJson);
        return {
            questions: parsed.questions || [],
            metadata: parsed.metadata || {}
        };
    },

    extractInsertContent: async (insertFile, customApiKey, model, studentId) => {
        const { provider, model: activeModel, apiKey, customConfig } = await resolveConfig(studentId, 'parsing', customApiKey, model);

        const insertBase64 = await fileToBase64(insertFile);
        const content = [
            { type: "text", text: "Extract ALL text from this insert/source PDF so a student can quote from it. Output plain text only." },
            { type: "image_url", image_url: { url: `data:${insertFile.type || 'application/pdf'};base64,${insertBase64}` } }
        ];

        return await callAI(provider, [{ role: "user", content }], activeModel, { apiKey, customConfig });
    },

    parseMarkScheme: async (schemeFile, customApiKey, model, studentId) => {
        const { provider, model: activeModel, apiKey, customConfig } = await resolveConfig(studentId, 'parsing', customApiKey, model);

        const schemeBase64 = await fileToBase64(schemeFile);
        const content = [
            { type: "text", text: PROMPTS.MARK_SCHEME },
            { type: "image_url", image_url: { url: `data:${schemeFile.type || 'application/pdf'};base64,${schemeBase64}` } }
        ];

        const schemeRes = await callAI(provider, [{ role: "user", content }], activeModel, { apiKey, customConfig });
        const cleanedScheme = cleanGeminiJSON(schemeRes);
        const parsed = JSON.parse(cleanedScheme);
        return parsed.markScheme || {};
    },

    markQuestion: async (question, answer, scheme, hackClubKey, customApiKey, model, studentId) => {
        // Resolve Grading Config
        const gradingConfig = await resolveConfig(studentId, 'grading', hackClubKey, model);
        const tutorConfig = await resolveConfig(studentId, 'tutor', customApiKey, model);
        // Note: hackClubKey passed as override for grading, customApiKey for tutor, preserving loose legacy mapping 

        const studentAnswerText = stringifyAnswer(answer);

        // STEP 1: Strict grader
        const graderMessages = [
            { role: "system", content: PROMPTS.GRADER_SYSTEM },
            { role: "user", content: `Question (${question.marks} marks): ${question.question}\nScheme: ${JSON.stringify(scheme)}\nStudent: ${studentAnswerText}` }
        ];

        let graderResponseText = "";
        try {
            graderResponseText = await callAI(gradingConfig.provider, graderMessages, gradingConfig.model, {
                apiKey: gradingConfig.apiKey,
                customConfig: gradingConfig.customConfig
            });
        } catch (e) {
            console.warn("Grading failed, using fallback logic internally if needed or throwing", e);
            throw e; // Let UI handle fallback to local
        }

        const cleanedGrader = cleanGeminiJSON(graderResponseText);
        let parsedGrader = {};
        try { parsedGrader = JSON.parse(cleanedGrader); } catch (e) { }

        const numericScore = Math.min(question.marks, Number(parsedGrader.score ?? 0));
        const primaryFlaw = parsedGrader.primary_flaw ?? parsedGrader.primaryFlaw ?? "Missing analysis or contextual insight.";

        // STEP 2: Tutor with personalization
        const memoryContext = studentId ? await getMemoryContextForAI(studentId) : '';
        const personalizationNote = memoryContext
            ? `\n\nSTUDENT PERSONALIZATION (adapt your teaching style accordingly):\n${memoryContext}`
            : '';

        const tutorPrompt = `You are an expert English Literature tutor.${personalizationNote}\n\nSTUDENT SCORE: ${numericScore}/${question.marks}\nEXAMINER'S CRITICISM: "${primaryFlaw}"\nQUESTION: "${question.question}"\nSTUDENT ANSWER: "${studentAnswerText}"\n\nTASK:\n1) Tell the student their score.\n2) Explain why they got this score (cite the criticism).\n3) Write a short Model Paragraph that fixes the flaw.\n4) Keep it concise, encouraging, Markdown formatted.`;

        let tutorText = "";
        try {
            tutorText = await callAI(tutorConfig.provider, [{ role: "user", content: tutorPrompt }], tutorConfig.model, {
                apiKey: tutorConfig.apiKey,
                customConfig: tutorConfig.customConfig
            });
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

    getHint: async (question, scheme, hackClubKey, studentId) => {
        const { provider, model, apiKey, customConfig } = await resolveConfig(studentId, 'hints', hackClubKey, null);
        const messages = [
            { role: "system", content: "Provide a short, exam-specific hint. Do NOT give the full answer." },
            { role: "user", content: `Question: ${question.question}\nContext: ${question.context?.content || 'N/A'}\nMark scheme: ${JSON.stringify(scheme)}` }
        ];
        return await callAI(provider, messages, model, { apiKey, customConfig });
    },

    explainFeedback: async (question, answer, feedback, scheme, hackClubKey, studentId) => {
        const { provider, model, apiKey, customConfig } = await resolveConfig(studentId, 'tutor', hackClubKey, null);
        const messages = [
            { role: "system", content: "Explain the marking decision briefly in Markdown. Focus on what was missing relative to the mark scheme." },
            { role: "user", content: `Question: ${question.question}\nStudent answer: ${stringifyAnswer(answer)}\nFeedback: ${feedback.text}\nMark scheme: ${JSON.stringify(scheme)}\nScore: ${feedback.score}/${feedback.totalMarks}` }
        ];
        return await callAI(provider, messages, model, { apiKey, customConfig });
    },

    followUp: async (question, answer, feedback, chatHistory, hackClubKey, studentId) => {
        const { provider, model, apiKey, customConfig } = await resolveConfig(studentId, 'tutor', hackClubKey, null);
        const historyMessages = chatHistory.map(m => ({ role: m.role, content: m.text }));
        const messages = [
            { role: "system", content: "Act as a friendly tutor. Keep replies concise and practical." },
            { role: "user", content: `Question: ${question.question}\nStudent answer: ${stringifyAnswer(answer)}\nFeedback: ${feedback.text}` },
            ...historyMessages
        ];
        return await callAI(provider, messages, model, { apiKey, customConfig });
    },

    generateStudyPlan: async (percentage, weaknessCounts, questionCount, hackClubKey, studentId) => {
        const { provider, model, apiKey, customConfig } = await resolveConfig(studentId, 'planning', hackClubKey, null);
        const weaknessSummary = Object.entries(weaknessCounts).map(([k, v]) => `"${k}" (${v}x)`).join(', ');
        const messages = [
            { role: "system", content: "Create a concise 3-step revision plan in Markdown that targets the repeated weaknesses listed." },
            { role: "user", content: `Student scored ${percentage}%. Repeated weaknesses: ${weaknessSummary || 'Not enough data yet.'}. Total questions: ${questionCount}.` }
        ];
        return await callAI(provider, messages, model, { apiKey, customConfig });
    },

    generateWeeklySchedule: async (context, hackClubKey, studentId) => {
        const { provider, model, apiKey, customConfig } = await resolveConfig(studentId, 'planning', hackClubKey, null);

        const {
            subjects = [],
            subjectPerformance = {},
            weaknesses = {},
            upcomingAssessments = [],
            studyStreak = { current: 0, longest: 0 },
            settings = {},
            weekDates = [],
            // Enhanced context
            recentStudyHistory = [],
            topicPerformance = {},
            completionStats = {},
            preferredStudyTime = 'any',
        } = context;

        // Build subject summary with performance data
        const subjectSummary = subjects.map(s => {
            const perf = subjectPerformance[s.id];
            const grade = perf?.percentage ?? 'No data';
            const weaknessesForSubject = Object.entries(weaknesses).filter(([k]) => k.toLowerCase().includes(s.name.toLowerCase())).slice(0, 3).map(([k, v]) => `${k} (${v}x)`).join(', ');
            return `- ${s.name}: Grade ${grade}%${weaknessesForSubject ? `, Weaknesses: ${weaknessesForSubject}` : ''}`;
        }).join('\n');

        const assessmentSummary = upcomingAssessments.length > 0 ? upcomingAssessments.map(a => { const daysUntil = Math.ceil((new Date(a.date) - new Date()) / (1000 * 60 * 60 * 24)); const subjectName = subjects.find(s => s.id === a.subject_id)?.name || 'Unknown'; return `- ${subjectName} ${a.kind || 'assessment'} in ${daysUntil} days (${a.date})`; }).join('\n') : 'No upcoming assessments scheduled.';
        const topWeaknesses = Object.entries(weaknesses).sort((a, b) => b[1] - a[1]).slice(0, 5).map(([k, v]) => `"${k}" (${v}x)`).join(', ') || 'No weakness data yet.';
        const unavailableDays = settings.unavailable_days || [];
        const availableDates = weekDates.filter(d => !unavailableDays.includes(d.day));
        const datesStr = availableDates.map(d => `${d.day} ${d.isoDate || `${d.date} ${d.month}`}`).join(', ');
        const sessionLength = settings.session_length || 25;
        const maxSessions = settings.max_sessions_per_day || 2;
        const lightWeek = settings.light_week ? 'YES - reduce workload by 50%' : 'No';

        // Build recent study history for spaced repetition
        const recentTopicsStr = recentStudyHistory.length > 0
            ? recentStudyHistory.slice(0, 8).map(t => `- "${t.topic}" (${t.daysAgo} days ago)`).join('\n')
            : 'No recent study data.';

        // Topic performance for targeting specific weaknesses
        const weakTopics = Object.entries(topicPerformance)
            .filter(([_, stats]) => stats.percentage !== null && stats.percentage < 50)
            .sort((a, b) => a[1].percentage - b[1].percentage)
            .slice(0, 5)
            .map(([topic, stats]) => `- "${topic}": ${stats.percentage}% (${stats.count} attempts)`)
            .join('\n') || 'No topic-level data available.';

        // Session completion insights
        const completionInsightsStr = completionStats.insights?.length > 0
            ? completionStats.insights.join('; ')
            : '';
        const bestDaysStr = completionStats.bestDays?.length > 0
            ? `Student's most productive days: ${completionStats.bestDays.join(', ')}`
            : '';

        // Time preference
        const timePreferenceMap = {
            morning: 'Schedule sessions between 6:00-12:00',
            afternoon: 'Schedule sessions between 12:00-17:00',
            evening: 'Schedule sessions between 17:00-21:00',
            any: 'No specific time preference'
        };
        const timePreferenceStr = timePreferenceMap[preferredStudyTime] || timePreferenceMap.any;

        const systemPrompt = `You are an expert GCSE study coach and scheduling AI. Your job is to create an optimal weekly study schedule for a student.

RULES:
1. PRIORITIZE subjects with LOW grades (below 60%) - they need the most time.
2. If an assessment is within 7 days, allocate AT LEAST 2 revision sessions for that subject.
3. Each session should target a SPECIFIC weakness or topic, not generic "study".
4. Balance the schedule across available days - avoid cramming.
5. Session duration should be ${sessionLength} minutes (adjustable by ±15 min based on topic complexity).
6. Maximum ${maxSessions} sessions per day.
7. Light week mode: ${lightWeek}
8. SPACED REPETITION: Schedule review sessions for topics studied 3-7 days ago.
9. AVOID REPETITION: Don't schedule the same topic twice in one week unless it's a weak area.
10. TIME PREFERENCE: ${timePreferenceStr}
${completionInsightsStr ? `11. COMPLETION PATTERNS: ${completionInsightsStr}` : ''}
${bestDaysStr ? `12. ${bestDaysStr} - prioritize these for important sessions.` : ''}

OUTPUT FORMAT (JSON ONLY, no markdown):
{
  "analysis": "Brief 1-2 sentence analysis of student's situation",
  "priorityOrder": ["Subject1", "Subject2"],
  "sessions": [
    {
      "day": "Mon",
      "date": "2025-01-15",
      "subjectName": "Mathematics",
      "topic": "Quadratic equations - solving by factorisation",
      "duration": 30,
      "priority": "high",
      "reason": "Assessment in 5 days, lowest grade at 45%",
      "startTime": "16:00"
    }
  ]
}`;
        // Get memory context for personalization
        const memoryContext = studentId ? await getMemoryContextForAI(studentId) : '';

        const userPrompt = `Create an optimal study schedule for this student:

SUBJECTS & PERFORMANCE:
${subjectSummary || 'No subjects added yet.'}

TOP RECURRING WEAKNESSES:
${topWeaknesses}

WEAK TOPICS (need extra practice):
${weakTopics}

UPCOMING ASSESSMENTS (CRITICAL):
${assessmentSummary}

RECENTLY STUDIED (for spaced repetition - review topics from 3-7 days ago):
${recentTopicsStr}

STUDY STREAK: ${studyStreak.current} days current, ${studyStreak.longest} days longest
${completionStats.rate ? `SESSION COMPLETION RATE: ${completionStats.rate}%` : ''}

AVAILABLE DAYS THIS WEEK:
${datesStr || 'All days available'}
${memoryContext ? `
STUDENT PREFERENCES & LEARNING STYLE (consider when scheduling):
${memoryContext}
` : ''}
Generate a smart, personalized schedule that will maximize this student's exam performance. Include specific time slots (startTime) based on their preferences.`;

        const messages = [{ role: "system", content: systemPrompt }, { role: "user", content: userPrompt }];

        try {
            const response = await callAI(provider, messages, model, { apiKey, customConfig });
            const cleaned = cleanGeminiJSON(response);
            return JSON.parse(cleaned);
        } catch (e) {
            console.warn('AI schedule generation failed:', e);
            throw new Error('Failed to generate schedule. Please try again.');
        }
    },

    /**
     * Parse exam schedule from PDF
     * Uses 'parsing' feature configuration from settings
     */
    parseExamSchedule: async (pdfFile, studentId, subjects = []) => {
        const { provider, model, apiKey, customConfig } = await resolveConfig(studentId, 'parsing', null, null);

        const pdfBase64 = await fileToBase64(pdfFile);

        const subjectNames = (subjects || [])
            .map((subject) => (typeof subject === 'string' ? subject : subject?.name))
            .filter(Boolean);
        const subjectContext = subjectNames.length
            ? `ONLY include exams that match these subjects: ${subjectNames.join(', ')}.`
            : 'Extract ALL exams from this document.';

        const prompt = `You are an exam schedule parser. ${subjectContext}

For EACH exam found, extract the following information:
- title: The exam name (e.g., "Chemistry Paper 1", "Mathematics Higher Paper 2")
- subject: The subject name only (e.g., "Chemistry", "Mathematics")
- exam_date: The exam date in YYYY-MM-DD format
- exam_time: The exam start time in HH:MM format (24-hour), or null if not specified
- duration_minutes: Duration in minutes, or null if not specified
- location: Exam venue/room/hall, or null if not specified
- notes: Any additional relevant information (e.g., "Calculator allowed")

IMPORTANT RULES:
1. Only include exams that match the subject list when provided
2. Dates MUST be in YYYY-MM-DD format (e.g., 2025-05-15)
3. Times MUST be in HH:MM 24-hour format (e.g., 09:00, 14:30)
4. If the year is not specified, assume 2025 for dates in May-June, otherwise use current year context
5. Be thorough - don't miss any exams in the document

Return a JSON object with this exact structure:
{
  "exams": [
    {
      "title": "string",
      "subject": "string", 
      "exam_date": "YYYY-MM-DD",
      "exam_time": "HH:MM or null",
      "duration_minutes": number or null,
      "location": "string or null",
      "notes": "string or null"
    }
  ],
  "summary": "Brief one-line summary of what was parsed"
}`;

        const content = [
            { type: "text", text: prompt },
            { type: "image_url", image_url: { url: `data:${pdfFile.type || 'application/pdf'};base64,${pdfBase64}` } }
        ];

        const messages = [{ role: "user", content }];

        try {
            const response = await callAI(provider, messages, model, { apiKey, customConfig });
            const cleaned = cleanGeminiJSON(response);
            const parsed = JSON.parse(cleaned);
            return {
                exams: parsed.exams || [],
                summary: parsed.summary || `Parsed ${(parsed.exams || []).length} exams`
            };
        } catch (e) {
            console.error('Exam schedule parsing failed:', e);
            throw new Error('Failed to parse exam schedule. Please check the PDF and try again.');
        }
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

export const checkRegex = (regexStr, value) => {
    try {
        const safeRegex = regexStr.replace(/(^|[^\\'])(\/)/g, '$1\\/');
        const re = new RegExp(safeRegex, 'i');
        return re.test(String(value).trim());
    } catch (e) {
        console.warn("Invalid Regex provided by AI:", regexStr, e);
        return false;
    }
};

export const evaluateAnswerLocally = (question, answer, scheme) => {
    const totalMarks = question.marks || scheme?.totalMarks || 0;
    const answerText = stringifyAnswer(answer);
    const normalized = normalizeText(answerText);

    if (!normalized) return { score: 0, totalMarks, text: "No answer provided.", rewrite: "" };

    if (question.markingRegex && checkRegex(question.markingRegex, normalized)) {
        return { score: totalMarks, totalMarks, text: "Matched expected answer via regex.", rewrite: `**${answerText}**` };
    }

    if (scheme) {
        const acceptable = scheme.acceptableAnswers || [];
        const criteria = scheme.criteria || [];
        const matches = [];
        let score = 0;

        acceptable.forEach(ans => { if (normalized.includes(normalizeText(ans))) { matches.push(ans); score += 1; } });
        criteria.forEach(crit => { if (normalized.includes(normalizeText(crit))) { matches.push(crit); score += 0.5; } });

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

    return { score: 0, totalMarks, text: "Mark scheme unavailable. Compare your answer against the question requirements.", rewrite: answerText };
};

export const buildHintFromScheme = (question, scheme) => {
    const hints = [];
    if (question.context?.content) hints.push(`Re-read the provided context: "${question.context.content.slice(0, 160)}..."`);
    if (scheme?.criteria?.length) hints.push(`Checklist: ${scheme.criteria.slice(0, 3).join('; ')}`);
    if (question.type === 'multiple_choice' && question.options?.length) hints.push("Eliminate clearly wrong options before choosing.");
    if (question.type === 'long_text') hints.push("Plan your answer with bullet points before writing full sentences.");
    if (!hints.length) hints.push("Focus on the command words and allocate your marks accordingly.");
    return hints.map(h => `• ${h}`).join('\n');
};

export const buildExplanationFromFeedback = (question, answer, feedback, scheme) => {
    const lines = [`You scored ${feedback.score}/${feedback.totalMarks}.`, feedback.text || "Review the expected points for this question."];
    if (scheme?.criteria?.length) lines.push(`Key points to include next time: ${scheme.criteria.join('; ')}`);
    const answerText = stringifyAnswer(answer);
    if (answerText) lines.push(`Your answer: ${answerText}`);
    return lines.join('\n\n');
};

export const buildFollowUpReply = (userText, question, feedback) => {
    return `Note: AI tutor is currently offline. Please check your API settings.\n\nYour question about "${question.question.slice(0, 30)}..." has been noted. Access the full AI tutor by adding a key in Settings.`;
};

export const buildStudyPlan = (percentage, weaknessCounts) => {
    return `### Revision Plan (Offline Mode)\n\n1. **Review High-Value Topics**: You scored ${percentage}%. Focus on questions with high mark counts.\n2. **Practice Weaknesses**: Check your past papers for questions where you lost marks.\n3. **Use Mark Schemes**: Compare your answers strictly against the provided mark schemes.`;
};

export const DEFAULT_MODELS = { vision: "google/gemini-2.0-flash-001", chat: "google/gemini-2.0-flash-001" };
