const { spawn } = require('child_process');
const http = require('http');

const streamTvProviders = ["02moviedownloader","anyembed","cinesu","fmovies4u","fshare","icefy","peachify","popr","streammafia","tulnex","vidapi","videasy","vidnest","vidrock","vidsrc","vidzee","vixsrc"];
const tmdbProviders = ["4khdhub","castletv","dahmermovies","hdghartv","netmirror","onetouchtv","showbox","streamflix","vaplayer","videasy","vidlink","vixsrc","zxcstreams"];

function fetchJSON(url) {
    return new Promise((resolve, reject) => {
        http.get(url, (res) => {
            let data = '';
            res.on('data', chunk => data += chunk);
            res.on('end', () => {
                try { resolve(JSON.parse(data)); } catch (e) { reject(e); }
            });
        }).on('error', reject);
    });
}

async function testProviders() {
    console.log('Testing StreamTV providers (5000)...');
    const workingStreamTv = [];
    const brokenStreamTv = [];
    
    for (const p of streamTvProviders) {
        try {
            const url = `http://localhost:5000/api/provider/${p}?id=550&type=movie&season=1&episode=1`;
            const data = await fetchJSON(url);
            if (data && data.sources && data.sources.length > 0) {
                console.log(`✅ ${p} works! (${data.sources.length} sources)`);
                workingStreamTv.push(p);
            } else {
                console.log(`❌ ${p} failed (0 sources)`);
                brokenStreamTv.push(p);
            }
        } catch (e) {
            console.log(`❌ ${p} failed (${e.message})`);
            brokenStreamTv.push(p);
        }
    }

    console.log('Testing TMDB providers (3000)...');
    const workingTmdb = [];
    const brokenTmdb = [];
    
    for (const p of tmdbProviders) {
        try {
            const url = `http://localhost:3000/api/streams/${p}/movie/550?season=1&episode=1`;
            const data = await fetchJSON(url);
            if (data && data.streams && data.streams.length > 0) {
                console.log(`✅ ${p} works! (${data.streams.length} streams)`);
                workingTmdb.push(p);
            } else {
                console.log(`❌ ${p} failed (0 streams)`);
                brokenTmdb.push(p);
            }
        } catch (e) {
            console.log(`❌ ${p} failed (${e.message})`);
            brokenTmdb.push(p);
        }
    }

    console.log('\n--- RESULTS ---');
    console.log('Working StreamTV:', workingStreamTv.join(', '));
    console.log('Broken StreamTV:', brokenStreamTv.join(', '));
    console.log('Working TMDB:', workingTmdb.join(', '));
    console.log('Broken TMDB:', brokenTmdb.join(', '));
}

testProviders();
