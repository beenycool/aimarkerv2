import { pickTopWeaknesses } from './mathUtils';

describe('pickTopWeaknesses', () => {
  it('should sort weaknesses by count descending', () => {
    const counts = {
      'Algebra': 5,
      'Geometry': 10,
      'Calculus': 3
    };
    const result = pickTopWeaknesses(counts);
    expect(result).toEqual([
      { label: 'Geometry', count: 10 },
      { label: 'Algebra', count: 5 },
      { label: 'Calculus', count: 3 }
    ]);
  });

  it('should respect the limit', () => {
    const counts = { a: 1, b: 2, c: 3, d: 4, e: 5, f: 6 };
    const result = pickTopWeaknesses(counts, 3);
    expect(result.length).toBe(3);
    expect(result[0].label).toBe('f');
    expect(result[2].label).toBe('d');
  });

  it('should handle default limit of 5', () => {
    const counts = { a: 1, b: 2, c: 3, d: 4, e: 5, f: 6 };
    const result = pickTopWeaknesses(counts);
    expect(result.length).toBe(5);
    expect(result[0].label).toBe('f');
    // 'a' should be dropped
    const hasA = result.some(w => w.label === 'a');
    expect(hasA).toBe(false);
  });

  it('should handle empty input', () => {
    expect(pickTopWeaknesses({})).toEqual([]);
    // @ts-ignore
    expect(pickTopWeaknesses(null)).toEqual([]);
    // @ts-ignore
    expect(pickTopWeaknesses(undefined)).toEqual([]);
  });

  it('should handle ties (stable sort not guaranteed but order matter of counts)', () => {
    const counts = { 'A': 5, 'B': 5 };
    const result = pickTopWeaknesses(counts);
    expect(result.length).toBe(2);
    expect(result[0].count).toBe(5);
    expect(result[1].count).toBe(5);
  });
});
