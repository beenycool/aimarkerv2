import { describe, expect, test } from 'bun:test';
import { formatShort, clamp } from './dateUtils.js';

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

describe('clamp', () => {
  test('returns value when within range', () => {
    expect(clamp(5, 0, 10)).toBe(5);
  });

  test('clamps to min when value is less than min', () => {
    expect(clamp(-5, 0, 10)).toBe(0);
  });

  test('clamps to max when value is greater than max', () => {
    expect(clamp(15, 0, 10)).toBe(10);
  });

  test('returns min when value equals min', () => {
    expect(clamp(0, 0, 10)).toBe(0);
  });

  test('returns max when value equals max', () => {
    expect(clamp(10, 0, 10)).toBe(10);
  });

  test('returns negative value when within negative range', () => {
    expect(clamp(-5, -10, -1)).toBe(-5);
  });

  test('clamps to negative min when value is less than negative min', () => {
    expect(clamp(-15, -10, -1)).toBe(-10);
  });

  test('clamps to negative max when value is greater than negative max', () => {
    expect(clamp(0, -10, -1)).toBe(-1);
  });

  test('handles floating point numbers within range', () => {
    expect(clamp(5.5, 0, 10)).toBe(5.5);
  });

  test('clamps floating point numbers below min', () => {
    expect(clamp(-0.1, 0, 10)).toBe(0);
  });

  test('clamps floating point numbers above max', () => {
    expect(clamp(10.1, 0, 10)).toBe(10);
  });

  test('handles reversed bounds (min > max)', () => {
    // When min > max, Math.max(min, Math.min(max, n)) effectively returns min
    // because Math.min(max, n) is always <= max, and since max < min,
    // Math.max(min, something_less_than_or_equal_to_max) will always be min.
    expect(clamp(5, 10, 0)).toBe(10);
    expect(clamp(-5, 10, 0)).toBe(10);
    expect(clamp(15, 10, 0)).toBe(10);
  });
});
