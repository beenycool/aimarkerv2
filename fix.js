const fs = require('fs');

let content = fs.readFileSync('app/services/AIService.test.js', 'utf8');

// Fix the whitespace trim test properly
content = content.replace(
    /it\('should trim whitespace from value', \(\) => \{\n    expect\(checkRegex\('\^hello\n\}\);\n, '  hello  '\)\)\.toBe\(true\);\n    expect\(checkRegex\('\^hello\n\}\);\n, '\\nhello\\n'\)\)\.toBe\(true\);\n    expect\(checkRegex\('\^hello\n\}\);\n, '\\thello\\t'\)\)\.toBe\(true\);\n    expect\(checkRegex\('\^hello\n\}\);\n, '\\rhello\\r'\)\)\.toBe\(true\);\n  \}\);/,
    `it('should trim whitespace from value', () => {
    expect(checkRegex('^hello$', '  hello  ')).toBe(true);
    expect(checkRegex('^hello$', '\\nhello\\n')).toBe(true);
    expect(checkRegex('^hello$', '\\thello\\t')).toBe(true);
    expect(checkRegex('^hello$', '\\rhello\\r')).toBe(true);
  });`
);

fs.writeFileSync('app/services/AIService.test.js', content, 'utf8');
