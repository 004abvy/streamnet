const fs = require('fs');
let html = fs.readFileSync('aPi server/index.html', 'utf8');

// Use a simple clean replace for the whole block
const searchAndFetchStart = "async function searchAndFetch() {";
const addCardStart = "function addCard(name, badge, url, subtitles, autoPlay) {";

const replacement = `async function searchAndFetch() {
            const query = document.getElementById('query-input').value.trim();
            const statusEl = document.getElementById('status-text');
            const debugEl = document.getElementById('debug-data');
            const wrapperEl = document.getElementById('player-wrapper');
            const gridEl = document.getElementById('streams-grid');

            if (!query) { statusEl.innerText = 'Please enter a name or ID.'; return; }

            statusEl.innerHTML = '<span style="color:#fbbf24">Loading.</span>';
            debugEl.innerText = '';
            wrapperEl.style.display = 'none';
            gridEl.innerHTML = '';

            try {
                let targetEndpoint = '';
                let mediaType = 'movie', tmdbId = query;
                let data = {};

                if (currentServerType === 'anime') {
                    targetEndpoint = \`/anime/search?q=\${encodeURIComponent(query)}\`;
                } else {
                    if (query.toLowerCase().startsWith('id:')) {
                        tmdbId = query.split(':')[1].trim();
                        statusEl.innerHTML = \`<span style="color:#fbbf24">Fetching streams for TMDB ID: \${tmdbId}.</span>\`;
                    } else {
                        statusEl.innerHTML = \`<span style="color:#fbbf24">Searching TMDB for "\${query}".</span>\`;
                        const r = await fetch(\`https://api.themoviedb.org/3/search/multi?api_key=\${TMDB_API_KEY}&query=\${encodeURIComponent(query)}\`);
                        if (!r.ok) throw new Error('TMDB search failed (API key may be invalid). Use id:550 format.');
                        const d = await r.json();
                        if (!d.results?.length) { statusEl.innerText = \`Nothing found for "\${query}". Try id:YOUR_ID\`; return; }
                        const best = d.results[0];
                        mediaType = best.media_type === 'tv' ? 'tv' : 'movie';
                        tmdbId = best.id;
                        statusEl.innerHTML = \`<span style="color:#fbbf24">Found "\${best.title || best.name}". Fetching.</span>\`;
                    }
                    
                    let allStreams = [];
                    if (currentServerType === 'master-aggregate') {
                        statusEl.innerHTML = '<span style="color:#fbbf24">Aggregating from ALL backend servers...</span>';
                        const p1 = fetch(\`http://localhost:5000/api/direct-aggregate?id=\${tmdbId}&type=\${mediaType}&season=1&episode=1\`).then(r => r.ok ? r.json() : {}).catch(e => ({}));
                        const p2 = fetch(\`http://localhost:8787/api/streams/\${mediaType === 'tv' ? 'series' : 'movie'}/\${tmdbId}?season=1&episode=1\`).then(r => r.ok ? r.json() : {}).catch(e => ({}));
                        const p3 = fetch(\`http://localhost:3000/api/streams/\${mediaType === 'tv' ? 'series' : 'movie'}/\${tmdbId}?season=1&episode=1\`).then(r => r.ok ? r.json() : {}).catch(e => ({}));
                        
                        const [res1, res2, res3] = await Promise.all([p1, p2, p3]);
                        
                        if (res1.sources) allStreams.push(...res1.sources);
                        if (res2.streams) allStreams.push(...res2.streams.map(s => ({...s, provider: s.provider || 'TMDB'})));
                        if (res3.streams) allStreams.push(...res3.streams.map(s => ({...s, provider: s.provider || 'TMDB'})));
                        
                        data = { aggregated_count: allStreams.length, sources: allStreams };
                        debugEl.innerText = JSON.stringify(data, null, 2);
                        targetEndpoint = null; // No final fetch needed
                    } else if (currentServerType === 'streamtv-all') {
                        targetEndpoint = \`/api/direct-aggregate?id=\${tmdbId}&type=\${mediaType}&season=1&episode=1\`;
                    } else if (currentServerType === 'tmdb') {
                        try {
                            const tRes = await fetch(\`http://localhost:3000/api/streams/\${providerId}/\${mediaType === 'tv' ? 'series' : 'movie'}/\${tmdbId}?season=1&episode=1\`);
                            if (!tRes.ok) throw new Error('fail');
                            data = await tRes.json(); 
                            targetEndpoint = null;
                        } catch(e) {
                            targetEndpoint = \`/api/streams/\${providerId}/\${mediaType === 'tv' ? 'series' : 'movie'}/\${tmdbId}?season=1&episode=1\`;
                            currentPort = 8787;
                        }
                    } else if (currentServerType === 'provider') {
                        targetEndpoint = \`/api/provider/\${providerId}?id=\${tmdbId}&type=\${mediaType}&season=1&episode=1\`;
                    }
                }

                if (targetEndpoint) {
                    const res = await fetch(\`http://localhost:\${currentPort}\${targetEndpoint}\`);
                    if (!res.ok) throw new Error(\`HTTP \${res.status} from server\`);
                    data = await res.json();
                }
                
                if (debugEl.innerText === '') debugEl.innerText = JSON.stringify(data, null, 2);

                let streamsFound = false;
                if (data && data.audioLanguages?.length) {
                    streamsFound = true;
                    data.audioLanguages.forEach((s, i) => addCard(s.provider || s.id || 'Server', s.quality || 'HD', s.url, s.subtitles || [], i === 0));
                } else if (data && data.sources?.length) {
                    streamsFound = true;
                    data.sources.forEach((s, i) => addCard(s.provider || s.name || providerId, s.quality || s.title || 'HLS', s.url, s.subtitles || s.captions || [], i === 0));
                } else if (data && data.streams?.length) {
                    streamsFound = true;
                    data.streams.forEach((s, i) => addCard(s.provider || s.name || providerId, s.quality || s.title || 'HLS', s.url, s.subtitles || s.captions || [], i === 0));
                }

                if (streamsFound) {
                    statusEl.innerHTML = '<span style="color:#10b981">✅ Streams found! Select a server below.</span>';
                    wrapperEl.style.display = 'flex';
                } else {
                    statusEl.innerText = 'No streams found. Check Raw Data.';
                    debugEl.style.display = 'block';
                }
            } catch (e) {
                statusEl.innerHTML = \`<span style="color:#ef4444">❌ \${e.message}</span>\`;
            }
        }

        `;

const before = html.split(searchAndFetchStart)[0];
const after = html.split(addCardStart)[1];
html = before + replacement + addCardStart + after;
fs.writeFileSync('aPi server/index.html', html, 'utf8');
