import { describe, expect, test } from 'bun:test';
import { getGcseDatesForYear, GCSE_KEY_DATES } from './gcseDates.js';

describe('getGcseDatesForYear', () => {
  test('returns correct dates for existing year 2025', () => {
    const result = getGcseDatesForYear(2025);
    expect(result).toBe(GCSE_KEY_DATES[2025]);
  });

  test('returns correct dates for existing year 2026', () => {
    const result = getGcseDatesForYear(2026);
    expect(result).toBe(GCSE_KEY_DATES[2026]);
  });

  test('returns correct dates for existing year 2027', () => {
    const result = getGcseDatesForYear(2027);
    expect(result).toBe(GCSE_KEY_DATES[2027]);
  });

  test('returns fallback dates (2026) for non-existing year (e.g., 2024)', () => {
    const result = getGcseDatesForYear(2024);
    expect(result).toBe(GCSE_KEY_DATES[2026]);
  });

  test('returns fallback dates (2026) for non-existing year (e.g., 2028)', () => {
    const result = getGcseDatesForYear(2028);
    expect(result).toBe(GCSE_KEY_DATES[2026]);
  });

  test('returns fallback dates (2026) when year is undefined', () => {
    const result = getGcseDatesForYear(undefined);
    expect(result).toBe(GCSE_KEY_DATES[2026]);
  });

  test('returns fallback dates (2026) when year is null', () => {
    const result = getGcseDatesForYear(null);
    expect(result).toBe(GCSE_KEY_DATES[2026]);
  });

  test('returns fallback dates (2026) when year is empty string', () => {
    const result = getGcseDatesForYear('');
    expect(result).toBe(GCSE_KEY_DATES[2026]);
  });
});
