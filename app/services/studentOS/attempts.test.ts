import { test, describe, expect, mock } from 'bun:test';

mock.module('../supabaseClient', () => {
  return {
    supabase: {},
  };
});

import { getTopicPerformance } from './attempts';

describe('getTopicPerformance', () => {
  test('returns default object when studentId is missing', async () => {
    const expected = { byTopic: {}, byQuestionType: {} };
    // @ts-ignore
    expect(await getTopicPerformance(undefined)).toEqual(expected);
    // @ts-ignore
    expect(await getTopicPerformance(null)).toEqual(expected);
    expect(await getTopicPerformance('')).toEqual(expected);
  });
});
