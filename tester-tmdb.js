const http = require('http');

const tmdbProviders = ["4khdhub","castletv","dahmermovies","hdghartv","netmirror","onetouchtv","showbox","streamflix","vaplayer","videasy","vidlink","vixsrc","zxcstreams"];

function fetchJSON(url) {
    return new Promise((resolve, reject) => {
        const req = http.get(url, (res) => {
            let data = '';
            res.on('data', chunk => data += chunk);
            res.on('end', () => {
                try { resolve(JSON.parse(data)); } catch (e) { reject(e); }
            });
        }).on('error', reject);
        req.setTimeout(15000, () => {
            req.destroy();
            resolve({ streams: [] });
        });
    });
}

async function testTmdbProviders() {
    console.log('Testing TMDB providers (8787)...');
    const workingTmdb = [];
    const brokenTmdb = [];
    
    // Testing in parallel to save time
    const promises = tmdbProviders.map(async p => {
        try {
            const url = `http://localhost:8787/api/streams/${p}/movie/550?season=1&episode=1`;
            const data = await fetchJSON(url);
            if (data && data.streams && data.streams.length > 0) {
                workingTmdb.push(p);
            } else {
                brokenTmdb.push(p);
            }
        } catch (e) {
            brokenTmdb.push(p);
        }
    });

    await Promise.all(promises);

    console.log('\n--- RESULTS ---');
    console.log('Working TMDB:', workingTmdb.join(', '));
    console.log('Broken TMDB:', brokenTmdb.join(', '));
}

testTmdbProviders();
