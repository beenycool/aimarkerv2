'use client';

/**
 * Lightweight “student id” (no auth) so the Student OS can store data per device.
 * This is NOT secure authentication – it’s a practical MVP identity.
 */
const STORAGE_KEY = 'gcse_student_id_v1';

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

export function clearStudentId() {
  if (typeof window === 'undefined') return;
  window.localStorage.removeItem(STORAGE_KEY);
}
