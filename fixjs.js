const fs = require('fs');
let html = fs.readFileSync('aPi server/index.html', 'utf8');

// Fix master aggregate fetch calls
html = html.replace(/fetch\(http:\/\/localhost:5000(.*)\)/g, 'fetch(`http://localhost:5000$1`)');
html = html.replace(/fetch\(http:\/\/localhost:8787(.*)\)/g, 'fetch(`http://localhost:8787$1`)');
html = html.replace(/fetch\(http:\/\/localhost:3000(.*)\)/g, 'fetch(`http://localhost:3000$1`)');
html = html.replace(/targetEndpoint = \/api\/streams(.*?)\;/g, 'targetEndpoint = `/api/streams$1`;');

// Also fix the TMDB fallback logic where targetEndpoint was messed up
html = html.replace(/const tRes = await fetch\(http:\/\/localhost:3000(.*)\)/, 'const tRes = await fetch(`http://localhost:3000$1`)');

fs.writeFileSync('aPi server/index.html', html, 'utf8');
