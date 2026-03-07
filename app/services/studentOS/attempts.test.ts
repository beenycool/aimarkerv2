import { test, describe, expect, mock } from 'bun:test';

mock.module('../supabaseClient', () => {
  return {
    supabase: {},
  };
});

import { getTopicPerformance } from './attempts';

describe('getTopicPerformance', () => {
  test.each([
    ['undefined', undefined],
    ['null', null],
    ['an empty string', ''],
  ])('returns default object when studentId is %s', async (_, studentId) => {
    const expected = { byTopic: {}, byQuestionType: {} };
    // @ts-ignore
    expect(await getTopicPerformance(studentId)).toEqual(expected);
  });
});
