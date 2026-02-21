import { describe, expect, test } from 'bun:test';
import { formatShort } from './dateUtils.js';

describe('formatShort', () => {
  test('formats valid ISO date string correctly', () => {
    // Use Intl.DateTimeFormat to compute expected value locale-agnostically
    const expectedDate = new Date('2023-10-27');
    const expected = new Intl.DateTimeFormat(undefined, {
      day: 'numeric',
      month: 'short'
    }).format(expectedDate);
    
    const result = formatShort('2023-10-27');
    expect(result).toBe(expected);
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
