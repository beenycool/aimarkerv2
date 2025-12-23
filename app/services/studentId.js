'use client';

/**
 * Lightweight "student id" for anonymous users (no auth required).
 * 
 * This provides device-based identity using localStorage UUIDs.
 * 
 * IMPORTANT: When the user is authenticated via Supabase Auth, you should
 * use the `useAuth().getEffectiveStudentId()` hook from AuthProvider instead.
 * That method returns the authenticated user's ID when logged in, or falls
 * back to this localStorage UUID for anonymous users.
 * 
 * This file is kept for:
 * 1. Backward compatibility with existing code
 * 2. Direct access when AuthProvider is not available
 * 3. The underlying anonymous ID generation logic
 */
const STORAGE_KEY = 'gcse_student_id_v1';

/**
 * Get or create a student ID from localStorage.
 * For authenticated users, prefer useAuth().getEffectiveStudentId() instead.
 */
export function getOrCreateStudentId() {
  if (typeof window === 'undefined') return null;

  let id = window.localStorage.getItem(STORAGE_KEY);
  if (!id) {
    // Prefer crypto UUID when available
    if (window.crypto?.randomUUID) id = window.crypto.randomUUID();
    else id = `${Date.now()}-${Math.random().toString(16).slice(2)}`;

    window.localStorage.setItem(STORAGE_KEY, id);
  }
  return id;
}

/**
 * Clear the stored student ID (used for reset functionality).
 * Note: This only affects the local anonymous ID, not authenticated user data.
 */
export function clearStudentId() {
  if (typeof window === 'undefined') return;
  window.localStorage.removeItem(STORAGE_KEY);
}
