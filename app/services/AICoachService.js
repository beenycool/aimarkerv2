'use client';

/**
 * AI Coach Service
 * Generates personalized, AI-powered dashboard insights
 */

import { cleanGeminiJSON } from './AIService';

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

/**
 * Generate comprehensive dashboard insights using AI
 * @param {Object} studentData - Student's performance data
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
        name = 'Student',
        overallPercent = 0,
        topWeaknesses = [],
        weekStats = { thisWeek: { earned: 0, total: 0 }, lastWeek: { earned: 0, total: 0 } },
        streakDays = 0,
        subjects = []
    } = studentData;

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

    // Get current time for greeting
    const hour = new Date().getHours();
    const timeOfDay = hour < 12 ? 'morning' : hour < 17 ? 'afternoon' : 'evening';

    // Build AI prompt
    const weaknessStr = topWeaknesses.length > 0
        ? topWeaknesses.map(w => `"${w.label}" (${w.count}x)`).join(', ')
        : 'No specific weaknesses identified yet';

    const subjectStr = subjects.length > 0
        ? subjects.map(s => s.name).join(', ')
        : 'No subjects added yet';

    const prompt = `You are an encouraging GCSE study coach. Generate personalized dashboard content for a student.

STUDENT DATA:
- Name: ${name}
- Time of day: ${timeOfDay}
- Overall score: ${overallPercent}%
- Study streak: ${streakDays} consecutive days
- Week-over-week change: ${trendChange >= 0 ? '+' : ''}${trendChange}% (this week: ${thisWeekPct ?? 'N/A'}%, last week: ${lastWeekPct ?? 'N/A'}%)
- Top weaknesses: ${weaknessStr}
- Subjects: ${subjectStr}

OUTPUT STRICT JSON (no markdown, no explanation):
{
  "greeting": "A warm, personalized greeting using their name and time of day. Include a relevant emoji. Max 12 words.",
  "trendInsight": "Brief insight about their week-over-week progress. Max 10 words. Be encouraging.",
  "streakMessage": "Motivational message about their streak. Max 8 words.",
  "nextSession": {
    "topic": "The specific topic they should focus on next",
    "subject": "The subject it belongs to",
    "reason": "Why this topic. Max 15 words."
  },
  "dailyTip": "One actionable study tip. Max 20 words."
}`;

    try {
        const messages = [
            { role: "system", content: "You are a supportive GCSE study coach. Output ONLY valid JSON." },
            { role: "user", content: prompt }
        ];

        const response = await callHackClubAPI(messages, hackClubKey);
        const cleaned = cleanGeminiJSON(response);
        const parsed = JSON.parse(cleaned);

        return {
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
        morning: `Good morning, ${name}! Ready for a great study session? ☀️`,
        afternoon: `Good afternoon, ${name}! Let's keep that momentum going! 💪`,
        evening: `Good evening, ${name}! Time for some effective revision! ✨`
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

export default { generateDashboardInsights };
