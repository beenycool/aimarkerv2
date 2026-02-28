const fs = require('fs');

let content = fs.readFileSync('app/services/AIService.test.js', 'utf8');

// Fix the regex comment
content = content.replace(
    /\/\/ The implementation escapes slashes: regexStr.replace\(\/\(\^\|\[\^\\\\\'\]\)\(\\\\\/\)\/g, '\$1\\\\\'\)\n    \/\/ So 'a\/b' becomes 'a\\\\\/b'/,
    "// The implementation escapes slashes: regexStr.replace(/(^|[^\\\\'])(\\/)/g, '$1\\\\/')\n    // So 'a/b' becomes 'a\\\\/b'"
);

// Fix the invalid regex strings test
content = content.replace(
    /it\('should handle invalid regex strings gracefully', \(\) => \{\n    const result = checkRegex\('\(', 'test'\);\n    expect\(result\)\.toBe\(false\);\n    expect\(consoleWarnSpy\)\.toHaveBeenCalled\(\);\n  \}\);/,
    `it('should handle invalid regex strings gracefully', () => {
    const result = checkRegex('(', 'test');
    expect(result).toBe(false);
    expect(consoleWarnSpy).toHaveBeenCalledWith(
      "Invalid Regex provided by AI:",
      "(",
      expect.any(Error)
    );
  });`
);

// Fix the whitespace trim test
content = content.replace(
    /it\('should trim whitespace from value', \(\) => \{\n    expect\(checkRegex\('\^hello\$', '  hello  '\)\)\.toBe\(true\);\n  \}\);/,
    `it('should trim whitespace from value', () => {
    expect(checkRegex('^hello$', '  hello  ')).toBe(true);
    expect(checkRegex('^hello$', '\\nhello\\n')).toBe(true);
    expect(checkRegex('^hello$', '\\thello\\t')).toBe(true);
    expect(checkRegex('^hello$', '\\rhello\\r')).toBe(true);
  });`
);

fs.writeFileSync('app/services/AIService.test.js', content, 'utf8');
