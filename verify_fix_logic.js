const testCases = [
    "http://localhost:11434/v1",
    "http://localhost:11434/v1/",
    "http://localhost:11434/v1/chat/completions",
    "http://internal-admin.local/delete-db?param=/chat/completions",
    "http://internal-admin.local/delete-db#/chat/completions",
    "https://api.example.com"
];

testCases.forEach(endpoint => {
    try {
        const urlObj = new URL(endpoint);
        if (!urlObj.pathname.endsWith('/chat/completions')) {
            // Ensure we don't double slash if pathname ends in slash
            urlObj.pathname = urlObj.pathname.replace(/\/+$/, '') + '/chat/completions';
        }
        console.log(`Input: ${endpoint}\nFixed: ${urlObj.toString()}\n`);
    } catch (e) {
        console.log(`Input: ${endpoint}\nError: Invalid URL\n`);
    }
});
