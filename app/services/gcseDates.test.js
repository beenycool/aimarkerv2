import { describe, expect, test } from 'bun:test';
import { getGcseDatesForYear, GCSE_KEY_DATES } from './gcseDates.js';

describe('getGcseDatesForYear', () => {
  test.each([2025, 2026, 2027])('returns correct dates for existing year %i', (year) => {
    const result = getGcseDatesForYear(year);
    expect(result).toBe(GCSE_KEY_DATES[year]);
  });

  const fallbackTestCases = [
    ['a non-existing year (2024)', 2024],
    ['a non-existing year (2028)', 2028],
    ['undefined', undefined],
    ['null', null],
    ['an empty string', ''],
  ];

  test.each(fallbackTestCases)('returns fallback dates (2026) when year is %s', (_description, value) => {
    const result = getGcseDatesForYear(value);
    expect(result).toBe(GCSE_KEY_DATES[2026]);
  });
});
