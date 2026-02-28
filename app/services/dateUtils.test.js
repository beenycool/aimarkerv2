import { describe, expect, test } from 'bun:test';
import { formatShort, bandFromPercent } from './dateUtils.js';

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

describe('bandFromPercent', () => {
  test('returns 9 for >= 90', () => {
    expect(bandFromPercent(90)).toBe('9');
    expect(bandFromPercent(95)).toBe('9');
    expect(bandFromPercent(100)).toBe('9');
  });

  test('returns 8 for 80-89', () => {
    expect(bandFromPercent(80)).toBe('8');
    expect(bandFromPercent(89)).toBe('8');
  });

  test('returns 7 for 70-79', () => {
    expect(bandFromPercent(70)).toBe('7');
    expect(bandFromPercent(79)).toBe('7');
  });

  test('returns 6 for 60-69', () => {
    expect(bandFromPercent(60)).toBe('6');
    expect(bandFromPercent(69)).toBe('6');
  });

  test('returns 5 for 50-59', () => {
    expect(bandFromPercent(50)).toBe('5');
    expect(bandFromPercent(59)).toBe('5');
  });

  test('returns 4 for 40-49', () => {
    expect(bandFromPercent(40)).toBe('4');
    expect(bandFromPercent(49)).toBe('4');
  });

  test('returns 3 for 30-39', () => {
    expect(bandFromPercent(30)).toBe('3');
    expect(bandFromPercent(39)).toBe('3');
  });

  test('returns 2 for 20-29', () => {
    expect(bandFromPercent(20)).toBe('2');
    expect(bandFromPercent(29)).toBe('2');
  });

  test('returns 1 for < 20', () => {
    expect(bandFromPercent(19)).toBe('1');
    expect(bandFromPercent(0)).toBe('1');
    expect(bandFromPercent(-5)).toBe('1');
  });

  test('handles boundary values correctly', () => {
    // Check key boundaries based on logic
    expect(bandFromPercent(89.9)).toBe('8');
    expect(bandFromPercent(90.0)).toBe('9');
  });

  test('handles non-numeric values by returning 1', () => {
    expect(bandFromPercent(NaN)).toBe('1');
    expect(bandFromPercent(null)).toBe('1');
    expect(bandFromPercent(undefined)).toBe('1');
    expect(bandFromPercent('abc')).toBe('1');
  });
});
