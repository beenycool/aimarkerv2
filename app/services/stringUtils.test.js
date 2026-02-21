import { test } from 'node:test';
import assert from 'node:assert';
import { normalizeText, normalizeQuestionId, stringifyAnswer } from './stringUtils.js';

test('normalizeText', async (t) => {
  await t.test('should lowercase text', () => {
    assert.strictEqual(normalizeText('HELLO'), 'hello');
  });

  await t.test('should handle multiple spaces', () => {
    assert.strictEqual(normalizeText('hello   world'), 'hello world');
  });

  await t.test('should trim leading and trailing spaces', () => {
    assert.strictEqual(normalizeText('  hello  '), 'hello');
  });

  await t.test('should handle null and undefined', () => {
    assert.strictEqual(normalizeText(null), '');
    assert.strictEqual(normalizeText(undefined), '');
  });

  await t.test('should handle non-string inputs', () => {
    assert.strictEqual(normalizeText(123), '123');
    assert.strictEqual(normalizeText(0), '0');
  });

  await t.test('should handle other whitespace characters', () => {
    assert.strictEqual(normalizeText('hello\nworld\ttest'), 'hello world test');
  });
});

test('normalizeQuestionId', async (t) => {
  await t.test('should remove non-alphanumeric characters and lowercase', () => {
    assert.strictEqual(normalizeQuestionId('Question 1a!'), 'question1a');
  });

  await t.test('should handle null and undefined', () => {
    assert.strictEqual(normalizeQuestionId(null), '');
    assert.strictEqual(normalizeQuestionId(undefined), '');
  });

  await t.test('should handle numeric inputs', () => {
    assert.strictEqual(normalizeQuestionId(0), '0');
    assert.strictEqual(normalizeQuestionId(123), '123');
  });

  await t.test('should pass through clean alphanumeric ids', () => {
    assert.strictEqual(normalizeQuestionId('1a'), '1a');
  });
});

test('stringifyAnswer', async (t) => {
  await t.test('should handle strings', () => {
    assert.strictEqual(stringifyAnswer('test'), 'test');
  });

  await t.test('should handle numbers', () => {
    assert.strictEqual(stringifyAnswer(123), '123');
  });

  await t.test('should handle arrays', () => {
    assert.strictEqual(stringifyAnswer(['a', 'b']), 'a\nb');
    assert.strictEqual(stringifyAnswer([]), '');
  });

  await t.test('should handle mixed arrays gracefully', () => {
    assert.strictEqual(stringifyAnswer([['a', 'b'], 'c']), 'a | b\nc');
  });

  await t.test('should handle 2D arrays (tables)', () => {
    assert.strictEqual(stringifyAnswer([['a', 'b'], ['c', 'd']]), 'a | b\nc | d');
  });

  await t.test('should handle null/undefined', () => {
    assert.strictEqual(stringifyAnswer(null), '');
    assert.strictEqual(stringifyAnswer(undefined), '');
  });

  await t.test('should handle graph submission objects', () => {
    const graphAnswer = {
      points: [{ x: 1, y: 2 }],
      lines: [[{ x: 0, y: 0 }, { x: 2, y: 2 }]],
      labels: ['Origin'],
      paths: []
    };
    const expected = `Graph submission: points ${JSON.stringify(graphAnswer.points)} lines ${JSON.stringify(graphAnswer.lines)} labels ${JSON.stringify(graphAnswer.labels)} paths ${JSON.stringify(graphAnswer.paths)}`;
    assert.strictEqual(stringifyAnswer(graphAnswer), expected);
  });

  await t.test('should handle graph submission with missing optional properties', () => {
    const graphAnswer = {
      points: [{ x: 1, y: 2 }],
    };
    const expected = `Graph submission: points ${JSON.stringify(graphAnswer.points)} lines [] labels [] paths []`;
    assert.strictEqual(stringifyAnswer(graphAnswer), expected);
  });

  await t.test('should handle generic objects via JSON.stringify', () => {
    assert.strictEqual(stringifyAnswer({ a: 1 }), '{"a":1}');
  });
});
