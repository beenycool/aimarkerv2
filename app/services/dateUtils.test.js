import { describe, expect, test } from 'bun:test';
import { formatShort } from './dateUtils.js';

describe('formatShort', () => {
  test('formats valid ISO date string correctly', () => {
    // Note: The specific output depends on the locale, but it should contain the month and day.
    // Assuming standard environment or 'en-US' locale by default for formatShort.
    // If locale is undefined, toLocaleDateString uses system locale.
    const result = formatShort('2023-10-27');
    // Check for "Oct" and "27" regardless of order (e.g., "Oct 27" or "27 Oct")
    expect(result).toMatch(/Oct/);
    expect(result).toMatch(/27/);
  });

  test('returns original string for invalid date string', () => {
    const invalidDate = 'invalid-date-string';
    const result = formatShort(invalidDate);
    expect(result).toBe(invalidDate);
  });

  test('returns original string for empty string', () => {
    const emptyString = '';
    const result = formatShort(emptyString);
    expect(result).toBe(emptyString);
  });

  test('handles null/undefined gracefully (if passed as string or cast)', () => {
    // If undefined is passed, dateISO + 'T00:00:00' -> 'undefinedT00:00:00' -> Invalid Date
    // If null is passed, dateISO + 'T00:00:00' -> 'nullT00:00:00' -> Invalid Date
    expect(formatShort(undefined)).toBe(undefined);
    expect(formatShort(null)).toBe(null);
  });
});
