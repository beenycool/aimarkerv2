import { stringifyAnswer, checkRegex } from './AIService';

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

describe('AIService.checkRegex', () => {
  let consoleWarnSpy;

  beforeEach(() => {
    consoleWarnSpy = jest.spyOn(console, 'warn').mockImplementation(() => {});
  });

  afterEach(() => {
    consoleWarnSpy.mockRestore();
  });

  it('should return true for matching patterns', () => {
    expect(checkRegex('^hello$', 'hello')).toBe(true);
    expect(checkRegex('\\d+', '123')).toBe(true);
  });

  it('should return false for non-matching patterns', () => {
    expect(checkRegex('^hello$', 'goodbye')).toBe(false);
    expect(checkRegex('\\d+', 'abc')).toBe(false);
  });

  it('should be case insensitive', () => {
    expect(checkRegex('hello', 'HELLO')).toBe(true);
  });

  it('should handle slashes in regex string', () => {
    // The implementation escapes slashes: regexStr.replace(/(^|[^\\'])(\\/)/g, '$1\\/')
    // So 'a/b' becomes 'a\/b'
    expect(checkRegex('a/b', 'a/b')).toBe(true);
  });

  it('should handle invalid regex strings gracefully', () => {
    const result = checkRegex('(', 'test');
    expect(result).toBe(false);
    expect(consoleWarnSpy).toHaveBeenCalled();
  });

  it('should handle non-string values by converting to string', () => {
    expect(checkRegex('^123$', 123)).toBe(true);
    expect(checkRegex('^true$', true)).toBe(true);
  });

  it('should trim whitespace from value', () => {
    expect(checkRegex('^hello$', '  hello  ')).toBe(true);
  });
});
