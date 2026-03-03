const fs = require('fs');

let content = fs.readFileSync('app/services/AIService.test.js', 'utf8');

// I am just going to rewrite the checkRegex describe block completely since it's messed up
content = content.replace(/describe\('AIService\.checkRegex'[\s\S]*/, `describe('AIService.checkRegex', () => {
  let consoleWarnSpy;

  beforeEach(() => {
    consoleWarnSpy = jest.spyOn(console, 'warn').mockImplementation(() => {});
  });

  afterEach(() => {
    consoleWarnSpy.mockRestore();
  });

  it('should return true for matching patterns', () => {
    expect(checkRegex('^hello$', 'hello')).toBe(true);
    expect(checkRegex('\\\\d+', '123')).toBe(true);
  });

  it('should return false for non-matching patterns', () => {
    expect(checkRegex('^hello$', 'goodbye')).toBe(false);
    expect(checkRegex('\\\\d+', 'abc')).toBe(false);
  });

  it('should be case insensitive', () => {
    expect(checkRegex('hello', 'HELLO')).toBe(true);
  });

  it('should handle slashes in regex string', () => {
    // The implementation escapes slashes: regexStr.replace(/(^|[^\\\\'])(\\/)/g, '$1\\\\/')
    // So 'a/b' becomes 'a\\/b'
    expect(checkRegex('a/b', 'a/b')).toBe(true);
  });

  it('should handle invalid regex strings gracefully', () => {
    const result = checkRegex('(', 'test');
    expect(result).toBe(false);
    expect(consoleWarnSpy).toHaveBeenCalledWith(
      "Invalid Regex provided by AI:",
      "(",
      expect.any(Error)
    );
  });

  it('should handle non-string values by converting to string', () => {
    expect(checkRegex('^123$', 123)).toBe(true);
    expect(checkRegex('^true$', true)).toBe(true);
  });

  it('should trim whitespace from value', () => {
    expect(checkRegex('^hello$', '  hello  ')).toBe(true);
    expect(checkRegex('^hello$', '\\nhello\\n')).toBe(true);
    expect(checkRegex('^hello$', '\\thello\\t')).toBe(true);
    expect(checkRegex('^hello$', '\\rhello\\r')).toBe(true);
  });
});
`);

fs.writeFileSync('app/services/AIService.test.js', content, 'utf8');
