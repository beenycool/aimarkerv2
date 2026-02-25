const endpoint = "http://internal-admin.local/delete-db?param=/chat/completions";

let url = endpoint;
// The vulnerable logic
if (!url.endsWith('/chat/completions')) {
    url = `${url.replace(/\/+$/, '')}/chat/completions`;
}

console.log("Input endpoint:", endpoint);
console.log("Resulting URL:", url);

if (url === endpoint && endpoint.includes('?')) {
    console.log("VULNERABILITY CONFIRMED: Query parameters bypassed the check.");
} else {
    console.log("Safe.");
}
