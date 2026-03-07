// @ts-nocheck
'use client';

/**
 * AI Coach Service
 * Generates personalized, AI-powered dashboard insights
 * Uses Memory Bank for personalization context
 */

import { cleanGeminiJSON } from './AIService';
import { getMemoryContextForAI } from './memoryService';

/**
 * Call Hack Club API for cost-effective AI completions
 */
async function callHackClubAPI(messages, apiKey = null, model = "qwen/qwen3-32b") {
    const response = await fetch('/api/hackclub', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
            messages,
            apiKey,
            model,
            temperature: 0.4
        })
    });

    const data = await response.json();
    if (!response.ok) {
        throw new Error(data.error || `API Error ${response.status}`);
    }
    return data.content;
}

// ⚡ Bolt: In-memory cache for dashboard insights to prevent redundant expensive API calls
// Map size is limited to prevent memory leaks
const INSIGHTS_CACHE = new Map();
const INSIGHTS_CACHE_TTL = 5 * 60 * 1000; // 5 minutes
const MAX_CACHE_SIZE = 100; // Limit cache to avoid memory leaks

/**
 * Generate comprehensive dashboard insights using AI
 * @param {Object} studentData - Student's performance data
 * @param {string} studentData.studentId - Student's ID for memory lookup
 * @param {string} studentData.name - Student's name from settings
 * @param {number} studentData.overallPercent - Overall performance percentage
 * @param {Array} studentData.topWeaknesses - Top weakness areas [{label, count}]
 * @param {Object} studentData.weekStats - {thisWeek: {earned, total}, lastWeek: {earned, total}}
 * @param {number} studentData.streakDays - Consecutive study days
 * @param {Array} studentData.subjects - List of subjects
 * @param {string} hackClubKey - API key for Hack Club
 */
export async function generateDashboardInsights(studentData, hackClubKey = null) {
    const {
        studentId,
        name = 'Student',
        overallPercent = 0,
        topWeaknesses = [],
        weekStats = { thisWeek: { earned: 0, total: 0 }, lastWeek: { earned: 0, total: 0 } },
        streakDays = 0,
        subjects = []
    } = studentData;

    // Get current time for greeting and caching
    const hour = new Date().getHours();
    const timeOfDay = hour < 12 ? 'morning' : hour < 17 ? 'afternoon' : 'evening';

    // Calculate actual trend
    const thisWeekPct = weekStats.thisWeek.total > 0
        ? Math.round((weekStats.thisWeek.earned / weekStats.thisWeek.total) * 100)
        : null;
    const lastWeekPct = weekStats.lastWeek.total > 0
        ? Math.round((weekStats.lastWeek.earned / weekStats.lastWeek.total) * 100)
        : null;

    const trendChange = (thisWeekPct !== null && lastWeekPct !== null)
        ? thisWeekPct - lastWeekPct
        : 0;

    // ⚡ Bolt: Check cache before making expensive API calls, using all variables that affect the output
    const cacheKey = JSON.stringify({
        studentId,
        name, // Crucial for correct greeting
        overallPercent,
        trendChange, // Crucial for accurate trend insight
        topWeaknesses: topWeaknesses.slice(0, 3).map((w: any) => w.topic || w.label),
        streakDays,
        timeOfDay,
        subjects: subjects.length
    });

    const cached = INSIGHTS_CACHE.get(cacheKey);
    if (cached) {
        if (Date.now() - cached.timestamp < INSIGHTS_CACHE_TTL) {
            return cached.data;
        } else {
            INSIGHTS_CACHE.delete(cacheKey); // Prune expired entry
        }
    }

  // Get memory context for personalization
  const memoryContext = studentId ? await getMemoryContextForAI(studentId) : '';

  // Build AI prompt
    const weaknessStr = topWeaknesses.length > 0
        ? topWeaknesses.map(w => `"${w.label}" (${w.count}x)`).join(', ')
        : 'No specific weaknesses identified yet';

    const subjectStr = subjects.length > 0
        ? subjects.map(s => s.name).join(', ')
        : 'No subjects added yet';

    const prompt = `You are a professional GCSE study coach. Generate personalized dashboard content for a student.

STUDENT DATA:
- Name: ${name}
- Time of day: ${timeOfDay}
- Overall score: ${overallPercent}%
- Study streak: ${streakDays} consecutive days
- Week-over-week change: ${trendChange >= 0 ? '+' : ''}${trendChange}% (this week: ${thisWeekPct ?? 'N/A'}%, last week: ${lastWeekPct ?? 'N/A'}%)
- Top weaknesses: ${weaknessStr}
- Subjects: ${subjectStr}
${memoryContext ? `
WHAT YOU KNOW ABOUT THIS STUDENT (use this to personalize your response):
${memoryContext}
` : ''}
OUTPUT STRICT JSON (no markdown, no explanation):
{
  "greeting": "A professional, personalized greeting using their name and time of day. Max 12 words. Do NOT use emojis.",
  "trendInsight": "Brief insight about their week-over-week progress. Max 10 words. Be professional.",
  "streakMessage": "Motivational message about their streak. Max 8 words.",
  "nextSession": {
    "topic": "The specific topic they should focus on next",
    "subject": "The subject it belongs to",
    "reason": "Why this topic. Max 15 words."
  },
  "dailyTip": "One actionable study tip tailored to their learning style if known. Max 20 words."
}`;

    try {
        const messages = [
            { role: "system", content: "You are a professional GCSE study coach. Output ONLY valid JSON. Do NOT use emojis." },
            { role: "user", content: prompt }
        ];

        const response = await callHackClubAPI(messages, hackClubKey);
        const cleaned = cleanGeminiJSON(response);
        const parsed = JSON.parse(cleaned);

        const insights = {
            greeting: parsed.greeting || `Good ${timeOfDay}, ${name}!`,
            trend: {
                change: trendChange,
                direction: trendChange > 0 ? 'up' : trendChange < 0 ? 'down' : 'flat',
                insight: parsed.trendInsight || (trendChange >= 0 ? 'Keep it up!' : 'Room to improve!')
            },
            streak: {
                days: streakDays,
                message: parsed.streakMessage || (streakDays > 0 ? 'Great consistency!' : 'Start your streak today!')
            },
            nextSession: parsed.nextSession || {
                topic: topWeaknesses[0]?.label || 'Practice questions',
                subject: subjects[0]?.name || 'General',
                reason: 'Focus on your top weakness area.'
            },
            dailyTip: parsed.dailyTip || 'Review your marked papers and note common mistakes.'
        };

        // ⚡ Bolt: Cache successful responses and manage cache size
        if (INSIGHTS_CACHE.size >= MAX_CACHE_SIZE) {
            // Remove oldest entry (first item in iterator)
            const firstKey = INSIGHTS_CACHE.keys().next().value;
            INSIGHTS_CACHE.delete(firstKey);
        }
        INSIGHTS_CACHE.set(cacheKey, { data: insights, timestamp: Date.now() });
        return insights;
    } catch (error) {
        console.error('AI Coach error:', error);
        // Fallback to computed values
        return generateFallbackInsights(studentData, timeOfDay, trendChange);
    }
}

/**
 * Fallback insights when AI is unavailable
 */
function generateFallbackInsights(studentData, timeOfDay, trendChange) {
    const { name = 'Student', topWeaknesses = [], subjects = [], streakDays = 0 } = studentData;

    const greetings = {
        morning: `Good morning, ${name}.`,
        afternoon: `Good afternoon, ${name}.`,
        evening: `Good evening, ${name}.`
    };

    return {
        greeting: greetings[timeOfDay],
        trend: {
            change: trendChange,
            direction: trendChange > 0 ? 'up' : trendChange < 0 ? 'down' : 'flat',
            insight: trendChange > 0 ? 'Great progress!' : trendChange < 0 ? 'Keep practising!' : 'Steady going!'
        },
        streak: {
            days: streakDays,
            message: streakDays >= 7 ? 'Amazing streak!' : streakDays > 0 ? 'Keep it going!' : 'Start today!'
        },
        nextSession: {
            topic: topWeaknesses[0]?.label || 'Mixed practice',
            subject: subjects[0]?.name || 'General',
            reason: topWeaknesses.length > 0 ? 'Your most common weakness.' : 'Build your foundation.'
        },
        dailyTip: 'Focus on understanding, not memorizing. Take breaks every 25 minutes.'
    };
}



/**
 * Generate 5 daily practice questions based on weaknesses
 */
export async function generateDailyQuestions(weaknesses, studentId, apiKey = null) {
    const weakTopics = (weaknesses || []).map(w => w.label).join(", ");
    const memoryContext = studentId ? await getMemoryContextForAI(studentId) : "";

    const messages = [
        {
            role: "system",
            content: "You are an expert GCSE tutor. Create a \"Daily 5\" mini-quiz for a student."
        },
        {
            role: "user",
            content: `Student Weaknesses: ${weakTopics || "General Science, Math, English"}
Student Context: ${memoryContext}

Task: Generate 5 specific, high-quality GCSE exam questions targeting these weaknesses.
Mix of Question Types:
- 2 Multiple Choice (4 options)
- 3 Short Answer (1-3 marks)

Output STRICT JSON array of objects:
[
  {
    "id": "q1",
    "type": "multiple_choice" | "short_text",
    "question": "Question text...",
    "options": ["A", "B", "C", "D"] (only for MCQ),
    "marks": number,
    "topic": "Topic Name",
    "mark_scheme": {
       "answer": "Correct Answer",
       "criteria": ["Key point 1", "Key point 2"]
    }
  }
]
Do NOT return Markdown. Just the JSON array.`
        }
    ];

    try {
        const responseContent = await callHackClubAPI(messages, apiKey);
        const cleaned = cleanGeminiJSON(responseContent);
        return JSON.parse(cleaned);
    } catch (error) {
        console.error("Failed to generate daily questions:", error);
        return [];
    }
}

export default { generateDashboardInsights, generateDailyQuestions };
