'use client';

/**
 * Memory Service
 * Provides personalization context for AI prompts
 * Allows AI to learn about the user and store information
 */

import { supabase } from './supabaseClient';

// Memory categories for organization
export const MEMORY_CATEGORIES = {
    LEARNING_GOALS: 'learning_goals',
    LEARNING_STYLE: 'learning_style',
    STRENGTHS: 'strengths',
    AREAS_TO_IMPROVE: 'areas_to_improve',
    PREFERENCES: 'preferences',
    AI_NOTES: 'ai_notes',
};

export const CATEGORY_LABELS = {
    [MEMORY_CATEGORIES.LEARNING_GOALS]: '🎯 Learning Goals',
    [MEMORY_CATEGORIES.LEARNING_STYLE]: '📚 Learning Style',
    [MEMORY_CATEGORIES.STRENGTHS]: '💪 Strengths',
    [MEMORY_CATEGORIES.AREAS_TO_IMPROVE]: '🔧 Areas to Improve',
    [MEMORY_CATEGORIES.PREFERENCES]: '⚙️ Preferences',
    [MEMORY_CATEGORIES.AI_NOTES]: '💡 Notes from AI',
};

/**
 * Get all active memory items for a student
 */
export async function getMemoryItems(studentId) {
    if (!studentId) return [];

    const { data, error } = await supabase
        .from('memory_bank_items')
        .select('*')
        .eq('student_id', studentId)
        .eq('archived', false)
        .order('category', { ascending: true })
        .order('updated_at', { ascending: false });

    if (error) {
        console.warn('getMemoryItems error:', error);
        return [];
    }

    return data || [];
}

/**
 * Format all memory items into a context string for AI prompts
 * This is the key function - returns formatted text to inject into AI prompts
 */
export async function getMemoryContextForAI(studentId) {
    if (!studentId) return '';

    try {
        const items = await getMemoryItems(studentId);
        if (!items.length) return '';

        // Group by category
        const grouped = {};
        for (const item of items) {
            const cat = item.category || 'general';
            if (!grouped[cat]) grouped[cat] = [];
            grouped[cat].push(item.content);
        }

        // Format as readable context
        const lines = [];
        for (const [category, contents] of Object.entries(grouped)) {
            const label = CATEGORY_LABELS[category] || category;
            lines.push(`${label}:`);
            for (const content of contents) {
                lines.push(`  - ${content}`);
            }
        }

        return lines.join('\n');
    } catch (e) {
        console.warn('getMemoryContextForAI error:', e);
        return '';
    }
}

/**
 * Add a memory item (user-created)
 */
export async function addMemoryItem(studentId, { category, content }) {
    if (!studentId || !content?.trim()) throw new Error('studentId and content required');

    const payload = {
        student_id: studentId,
        category: category || MEMORY_CATEGORIES.PREFERENCES,
        content: content.trim(),
        confidence: 100, // User-added items have 100% confidence
        source: 'user',
        last_confirmed: new Date().toISOString(),
        updated_at: new Date().toISOString(),
    };

    const { data, error } = await supabase
        .from('memory_bank_items')
        .insert(payload)
        .select('*')
        .single();

    if (error) throw error;
    return data;
}

/**
 * Add a memory item from AI (lower initial confidence)
 */
export async function addAIMemory(studentId, { category, content, confidence = 70 }) {
    if (!studentId || !content?.trim()) return null;

    try {
        const payload = {
            student_id: studentId,
            category: category || MEMORY_CATEGORIES.AI_NOTES,
            content: content.trim(),
            confidence: Math.min(100, Math.max(0, confidence)),
            source: 'ai',
            updated_at: new Date().toISOString(),
        };

        const { data, error } = await supabase
            .from('memory_bank_items')
            .insert(payload)
            .select('*')
            .single();

        if (error) {
            console.warn('addAIMemory error:', error);
            return null;
        }
        return data;
    } catch (e) {
        console.warn('addAIMemory failed:', e);
        return null;
    }
}

/**
 * Update a memory item
 */
export async function updateMemoryItem(studentId, id, { category, content, confidence }) {
    if (!studentId || !id) throw new Error('studentId and id required');

    const patch = { updated_at: new Date().toISOString() };
    if (category !== undefined) patch.category = category;
    if (content !== undefined) patch.content = content.trim();
    if (confidence !== undefined) patch.confidence = Math.min(100, Math.max(0, confidence));

    const { data, error } = await supabase
        .from('memory_bank_items')
        .update(patch)
        .eq('student_id', studentId)
        .eq('id', id)
        .select('*')
        .single();

    if (error) throw error;
    return data;
}

/**
 * Confirm a memory (increases confidence, updates last_confirmed)
 */
export async function confirmMemory(studentId, id) {
    if (!studentId || !id) return;

    try {
        // First get current confidence
        const { data: existing } = await supabase
            .from('memory_bank_items')
            .select('confidence')
            .eq('id', id)
            .single();

        const newConfidence = Math.min(100, (existing?.confidence || 70) + 10);

        await supabase
            .from('memory_bank_items')
            .update({
                confidence: newConfidence,
                last_confirmed: new Date().toISOString(),
                updated_at: new Date().toISOString(),
            })
            .eq('student_id', studentId)
            .eq('id', id);
    } catch (e) {
        console.warn('confirmMemory error:', e);
    }
}

/**
 * Archive a memory item (soft delete)
 */
export async function archiveMemoryItem(studentId, id) {
    if (!studentId || !id) throw new Error('studentId and id required');

    const { error } = await supabase
        .from('memory_bank_items')
        .update({ archived: true, updated_at: new Date().toISOString() })
        .eq('student_id', studentId)
        .eq('id', id);

    if (error) throw error;
}

export default {
    MEMORY_CATEGORIES,
    CATEGORY_LABELS,
    getMemoryItems,
    getMemoryContextForAI,
    addMemoryItem,
    addAIMemory,
    updateMemoryItem,
    confirmMemory,
    archiveMemoryItem,
};
