import type { ResolvedStream } from './types';

const TMDB_API_KEY = process.env.TMDB_API_KEY || 'a4e8c9bd39aadd7d67d8f0736c7a882a';

const VIDEASY_HEADERS: Record<string, string> = {
  'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/125.0.0.0 Safari/537.36',
  'Accept': 'application/json, text/plain, */*',
  'Origin': 'https://videasy.net',
  'Referer': 'https://videasy.net/',
};

const VIDEASY_API = 'https://api.speedracelight.com';

const SERVERS: Record<string, { url: string; moviesOnly?: boolean }> = {
  CDN: { url: `${VIDEASY_API}/cdn/sources-with-title` },
  LaMovie: { url: `${VIDEASY_API}/lamovie/sources-with-title` },
  Meine: { url: `${VIDEASY_API}/meine/sources-with-title`, moviesOnly: true },
};

// --- Seed-based stream cipher (mirrors player.videasy.net) ---
const MAGIC = [109, 118, 109, 49]; // "mvm1"
const HASH_TABLE = [1116352408, 1899447441, 3049323471, 3921009573, 961987163, 1508970993, 2453635748, 2870763221, 3624381080, 310598401, 607225278, 1426881987, 1925078388, 2162078206, 2614888103, 3248222580];

function u32x(x: number) { return x >>> 0; }
function mul32(a: number, b: number) { return Math.imul(a, b) >>> 0; }
function rotl32(x: number, n: number) {
  x >>>= 0; n &= 31;
  return n === 0 ? x : ((x << n) | (x >>> (32 - n))) >>> 0;
}
function hash32(x: number) {
  x = u32x(x);
  x ^= x >>> 16; x = mul32(x, 2246822507);
  x ^= x >>> 13; x = mul32(x, 3266489909);
  x ^= x >>> 16;
  return u32x(x);
}
function fnv1a(str: string) {
  let h = 2166136261;
  for (let i = 0; i < str.length; i++) h = mul32(h ^ str.charCodeAt(i), 16777619);
  return hash32(h);
}
function initStream(seed: string, secondKey: number) {
  const S = new Array<number>(61);
  let a = u32x(hash32(fnv1a(seed) ^ hash32(u32x((secondKey >>> 0) ^ 2654435769))));
  for (let i = 0; i < 8; i++) {
    if ((i * (i + 1) & 1) === 0) {
      const idx = a % 61;
      a = rotl32(a + u32x(2654435769), 7 + (7 & i));
      S[idx] = u32x(a ^ hash32(a));
      a = hash32(u32x(a + idx));
    } else {
      S[i] = HASH_TABLE[15 & i];
    }
  }
  return { S, acc: u32x(hash32(2779096485 ^ a)) };
}
function nextByte(st: { S: number[]; acc: number }, ctr: number) {
  const r = st.S;
  const o = st.acc;
  const n = o % 61;
  const inSet = 0 - Number(n in r);
  const d = r[n] >>> 0;
  const x = u32x(d ^ mul32(2654435769, ctr + 1));
  const y = u32x((o ^ x) | (o & x & inSet));
  const no = hash32(u32x(rotl32(u32x(y + o), 31 & n) ^ rotl32(o, 31 & Math.imul(n, 7))) + 2654435769);
  r[n] = no >>> 0;
  st.acc = no;
  return no >>> 0;
}
function keystream(seed: string, secondKey: number, len: number) {
  const st = initStream(seed, secondKey);
  const out = new Uint8Array(len);
  let ctr = 0;
  for (let i = 0; i < len;) {
    const b = nextByte(st, ctr++);
    out[i++] = 255 & b;
    if (i < len) out[i++] = (b >>> 8) & 255;
    if (i < len) out[i++] = (b >>> 16) & 255;
    if (i < len) out[i++] = (b >>> 24) & 255;
  }
  return out;
}
function decryptPayload(payload: string, seed: string, secondKey: string) {
  const b64 = payload.replace(/-/g, '+').replace(/_/g, '/').padEnd(4 * Math.ceil(payload.length / 4), '=');
  const data = Buffer.from(b64, 'base64');
  const ks = keystream(seed, Number(secondKey), data.length);
  for (let i = 0; i < data.length; i++) data[i] ^= ks[i];
  for (let i = 0; i < MAGIC.length; i++) {
    if (data[i] !== MAGIC[i]) throw new Error('Invalid encrypted payload');
  }
  return data.subarray(MAGIC.length).toString('utf8');
}

export async function resolveVideasy(
  tmdbId: string,
  mediaType: 'movie' | 'tv',
  season: string = '1',
  episode: string = '1'
): Promise<ResolvedStream[]> {
  try {
    // Step 1: Resolve title/year from TMDB
    const tmdbType = mediaType === 'tv' ? 'tv' : 'movie';
    const tmdbRes = await fetch(
      `https://api.themoviedb.org/3/${tmdbType}/${tmdbId}?api_key=${TMDB_API_KEY}&append_to_response=external_ids`,
      { signal: AbortSignal.timeout(8000) }
    );
    if (!tmdbRes.ok) return [];
    const tmdbData = await tmdbRes.json();
    const title = tmdbData.title || tmdbData.name || '';
    const year = (tmdbData.release_date || tmdbData.first_air_date || '').split('-')[0];
    const imdbId = tmdbData.external_ids?.imdb_id || '';
    if (!title) return [];

    // Step 2: Fetch decryption seed
    const seedRes = await fetch(`${VIDEASY_API}/seed?mediaId=${tmdbId}`, {
      headers: VIDEASY_HEADERS,
      signal: AbortSignal.timeout(8000),
    });
    if (!seedRes.ok) return [];
    const seedData = await seedRes.json();
    const seed = seedData?.seed;
    if (!seed) return [];

    const allStreams: ResolvedStream[] = [];
    const seen = new Set<string>();

    const queryServers = async (activeSeed: string) => {
      const tasks = Object.entries(SERVERS).map(async ([name, server]) => {
        if (server.moviesOnly && mediaType === 'tv') return;

        let apiUrl = `${server.url}?title=${encodeURIComponent(title)}`
          + `&mediaType=${tmdbType === 'tv' ? 'TV Series' : 'Movie'}&year=${year}`
          + `&tmdbId=${tmdbId}&imdbId=${imdbId}`;
        if (mediaType === 'tv') apiUrl += `&seasonId=${season}&episodeId=${episode}`;
        apiUrl += `&enc=2&seed=${activeSeed}`;

        try {
          const encRes = await fetch(apiUrl, {
            headers: VIDEASY_HEADERS,
            signal: AbortSignal.timeout(8000),
          });
          if (!encRes.ok) return;
          const encryptedText = await encRes.text();
          if (!encryptedText || encryptedText.length < 20 || encryptedText.startsWith('<')) return;

          const plain = decryptPayload(encryptedText, activeSeed, String(tmdbId));
          const resData = JSON.parse(plain);
          if (!resData || !Array.isArray(resData.sources)) return;

          for (const s of resData.sources) {
            if (!s.url || seen.has(s.url)) continue;
            seen.add(s.url);
            allStreams.push({
              id: `videasy-${name}-${allStreams.length}`,
              provider: `Videasy ${name}`,
              url: s.url,
              quality: s.quality || 'Auto',
              type: 'hls',
              headers: {
                'Referer': 'https://player.videasy.net/',
                'Origin': 'https://player.videasy.net',
              },
            });
          }
        } catch {
          // server unreachable — skip
        }
      });
      await Promise.all(tasks);
    };

    // Query all servers; retry with fresh seed if nothing found
    await queryServers(seed);
    if (allStreams.length === 0) {
      try {
        const freshSeedRes = await fetch(`${VIDEASY_API}/seed?mediaId=${tmdbId}`, {
          headers: VIDEASY_HEADERS,
          signal: AbortSignal.timeout(8000),
        });
        if (freshSeedRes.ok) {
          const freshData = await freshSeedRes.json();
          if (freshData?.seed && freshData.seed !== seed) {
            await queryServers(freshData.seed);
          }
        }
      } catch {
        // ignore retry failure
      }
    }

    return allStreams;
  } catch (e) {
    console.warn('[Videasy] Error:', e);
    return [];
  }
}
