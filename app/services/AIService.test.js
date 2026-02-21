import { stringifyAnswer } from './AIService';

// Mock dependencies to isolate the test
jest.mock('./studentOS', () => ({
  getOrCreateSettings: jest.fn(),
  DEFAULT_AI_PREFERENCES: {}
}));

jest.mock('./memoryService', () => ({
  getMemoryContextForAI: jest.fn()
}));

jest.mock('./supabaseClient', () => ({
  supabase: {}
}));

describe('AIService.stringifyAnswer', () => {
  it('should return empty string for undefined', () => {
    expect(stringifyAnswer(undefined)).toBe('');
  });

  it('should return empty string for null', () => {
    expect(stringifyAnswer(null)).toBe('');
  });

  it('should return string for string input', () => {
    expect(stringifyAnswer('hello')).toBe('hello');
  });

  it('should return string for number input', () => {
    expect(stringifyAnswer(123)).toBe('123');
    expect(stringifyAnswer(0)).toBe('0');
  });

  it('should join array of strings with newline', () => {
    const input = ['one', 'two', 'three'];
    const expected = 'one\ntwo\nthree';
    expect(stringifyAnswer(input)).toBe(expected);
  });

  it('should handle mixed array with string conversion', () => {
    const input = ['one', 2];
    const expected = 'one\n2';
    expect(stringifyAnswer(input)).toBe(expected);
  });

  it('should handle array of arrays (table rows)', () => {
    const input = [['a', 'b'], ['c', 'd']];
    const expected = 'a | b\nc | d';
    expect(stringifyAnswer(input)).toBe(expected);
  });

  it('should handle empty array', () => {
    expect(stringifyAnswer([])).toBe('');
  });

  it('should handle object with points (Graph submission)', () => {
    const input = {
      points: [{x:1, y:1}],
      lines: [{slope:1}],
      labels: ['A'],
      paths: []
    };
    const expected = `Graph submission: points [{"x":1,"y":1}] lines [{"slope":1}] labels ["A"] paths []`;
    expect(stringifyAnswer(input)).toBe(expected);
  });

  it('should handle object with points but missing optional fields', () => {
    const input = {
      points: [{x:1, y:1}]
    };
    const expected = `Graph submission: points [{"x":1,"y":1}] lines [] labels [] paths []`;
    expect(stringifyAnswer(input)).toBe(expected);
  });

  it('should fallback to JSON.stringify for other objects', () => {
    const input = { foo: 'bar' };
    expect(stringifyAnswer(input)).toBe('{"foo":"bar"}');
  });

  it('should handle array with null/undefined', () => {
    const input = ['a', null, undefined, 'b'];
    // 'a', '', '', 'b' joined by \n
    // Standard join behavior: "If an element is undefined, null or an empty array [], it is converted to an empty string."
    expect(stringifyAnswer(input)).toBe('a\n\n\nb');
  });
});
