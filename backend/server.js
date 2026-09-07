require('dotenv').config();
const express = require('express');
const cors = require('cors');
const axios = require('axios');

const app = express();
const PORT = process.env.PORT || 5000;
const TMDB_API_KEY = process.env.TMDB_API_KEY;
const TMDB_BASE_URL = 'https://api.themoviedb.org/3';

// Simple in-memory cache
const cache = new Map();
const CACHE_TTL = 5 * 60 * 1000; // 5 minutes

async function fetchFromTMDB(endpoint, params = {}) {
  // Clean params: strip out undefined, null, and empty string values
  const cleanParams = {};
  for (const [key, val] of Object.entries(params)) {
    if (val !== undefined && val !== null && val !== '') {
      cleanParams[key] = String(val);
    }
  }

  const cacheKey = `${endpoint}?${new URLSearchParams(cleanParams).toString()}`;
  
  if (cache.has(cacheKey)) {
    const { timestamp, data } = cache.get(cacheKey);
    if (Date.now() - timestamp < CACHE_TTL) {
      return data;
    }
    cache.delete(cacheKey);
  }

  const response = await axios.get(`${TMDB_BASE_URL}${endpoint}`, { params: cleanParams });
  cache.set(cacheKey, { timestamp: Date.now(), data: response.data });
  return response.data;
}

app.use(cors());
app.use(express.json());

// -----------------------------------------------------
// TMDB API ROUTES
// -----------------------------------------------------

// Route: Discover Content by Genre or Type
app.get('/api/discover', async (req, res) => {
  try {
    const type = req.query.type === 'tv' ? 'tv' : 'movie';
    const genreId = req.query.genreId;
    const page = req.query.page || 1;

    const params = {
      api_key: TMDB_API_KEY,
      language: 'en-US',
      sort_by: 'popularity.desc',
      page: page
    };

    if (genreId) {
      params.with_genres = genreId;
    }

    const data = await fetchFromTMDB(`/discover/${type}`, params);
    res.json(data);
  } catch (error) {
    console.error("Error discovering by genre:", error.message);
    res.status(500).json({ error: 'Failed to discover genre content' });
  }
});

// Route: Trending Movies (for Hero Carousel)
app.get('/api/movies/trending', async (req, res) => {
  try {
    const data = await fetchFromTMDB('/trending/movie/day', {
      api_key: TMDB_API_KEY,
      language: 'en-US'
    });
    res.json(data);
  } catch (error) {
    console.error("Error fetching from TMDB:", error.message);
    res.status(500).json({ error: 'Failed to fetch movies' });
  }
});

// Route: Get Trending TV Shows
app.get('/api/tv/trending', async (req, res) => {
  try {
    const data = await fetchFromTMDB('/trending/tv/day', {
      api_key: TMDB_API_KEY,
      language: 'en-US'
    });
    res.json(data);
  } catch (error) {
    console.error("Error fetching TV shows:", error.message);
    res.status(500).json({ error: 'Failed to fetch TV shows' });
  }
});

// Route: Discover Movies (for Movies page)
app.get('/api/movies/discover', async (req, res) => {
  try {
    const page = req.query.page || 1;
    const filter = req.query.filter; // '4k', 'top_rated', 'upcoming', 'now_playing', 'popular'
    const genre = req.query.genre;

    let endpoint = '/discover/movie';
    const params = {
      api_key: TMDB_API_KEY,
      language: 'en-US',
      page: page
    };

    if (filter === '4k') {
      endpoint = '/discover/movie';
      params.sort_by = 'vote_average.desc';
      params['vote_count.gte'] = 200;
      params.with_original_language = 'en';
      if (genre) params.with_genres = genre;
    } else if (filter === 'top_rated') {
      endpoint = '/movie/top_rated';
    } else if (filter === 'upcoming') {
      endpoint = '/movie/upcoming';
    } else if (filter === 'now_playing') {
      endpoint = '/movie/now_playing';
    } else {
      endpoint = '/discover/movie';
      params.sort_by = 'popularity.desc';
      if (genre) params.with_genres = genre;
    }

    const data = await fetchFromTMDB(endpoint, params);
    res.json(data);
  } catch (error) {
    console.error("Error discovering movies:", error.message);
    res.status(500).json({ error: 'Failed to discover movies' });
  }
});

// Route: Discover TV Shows (for TV page)
app.get('/api/tv/discover', async (req, res) => {
  try {
    const page = req.query.page || 1;
    const filter = req.query.filter; // 'top_rated', 'on_the_air', 'airing_today', 'popular'
    const genre = req.query.genre;

    let endpoint = '/discover/tv';
    const params = {
      api_key: TMDB_API_KEY,
      language: 'en-US',
      page: page
    };

    if (filter === 'top_rated') {
      endpoint = '/tv/top_rated';
    } else if (filter === 'on_the_air') {
      endpoint = '/tv/on_the_air';
    } else if (filter === 'airing_today') {
      endpoint = '/tv/airing_today';
    } else {
      endpoint = '/discover/tv';
      params.sort_by = 'popularity.desc';
      if (genre) params.with_genres = genre;
    }

    const data = await fetchFromTMDB(endpoint, params);
    res.json(data);
  } catch (error) {
    console.error("Error discovering tv:", error.message);
    res.status(500).json({ error: 'Failed to discover tv shows' });
  }
});

// Route: Get Single Movie Details
app.get('/api/movies/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const data = await fetchFromTMDB(`/movie/${id}`, {
      api_key: TMDB_API_KEY,
      append_to_response: 'credits,videos,similar,recommendations,reviews,images,external_ids'
    });
    res.json(data);
  } catch (error) {
    console.error(`Error fetching movie ${req.params.id}:`, error.message);
    res.status(500).json({ error: 'Failed to fetch movie details' });
  }
});

// Route: Get Single TV Show Details
app.get('/api/tv/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const data = await fetchFromTMDB(`/tv/${id}`, {
      api_key: TMDB_API_KEY,
      append_to_response: 'credits,videos,similar,recommendations,reviews,images,external_ids'
    });
    res.json(data);
  } catch (error) {
    console.error(`Error fetching TV show ${req.params.id}:`, error.message);
    res.status(500).json({ error: 'Failed to fetch TV details' });
  }
});

// Route: Get TV Season Details
app.get('/api/tv/:id/season/:seasonNumber', async (req, res) => {
  try {
    const { id, seasonNumber } = req.params;
    const data = await fetchFromTMDB(`/tv/${id}/season/${seasonNumber}`, {
      api_key: TMDB_API_KEY,
      language: 'en-US'
    });
    res.json({
      ...data,
      episodes: (data.episodes || []).map((episode) => ({
        ...episode,
        overview: episode.overview || ''
      }))
    });
  } catch (error) {
    console.error(`Error fetching TV season details ${req.params.id} S${req.params.seasonNumber}:`, error.message);
    res.status(500).json({ error: 'Failed to fetch TV season details' });
  }
});

// -----------------------------------------------------
// HLS LIVE STREAM PROXY ROUTE (Bypasses CORS & Mixed Content)
// -----------------------------------------------------

app.get('/api/stream/proxy', async (req, res) => {
  try {
    const { url } = req.query;
    if (!url) return res.status(400).send('Missing URL');

    const decodedUrl = decodeURIComponent(url);
    const isManifest = decodedUrl.includes('.m3u8');

    const response = await axios.get(decodedUrl, {
      responseType: 'arraybuffer',
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
        'Referer': new URL(decodedUrl).origin
      },
      timeout: 10000
    });

    res.setHeader('Access-Control-Allow-Origin', '*');

    if (isManifest) {
      res.setHeader('Content-Type', 'application/vnd.apple.mpegurl');
      let manifestText = response.data.toString('utf-8');

      const baseUrl = decodedUrl.substring(0, decodedUrl.lastIndexOf('/') + 1);

      // Rewrite relative URLs in manifest
      const lines = manifestText.split('\n');
      const rewritten = lines.map(line => {
        const trimmed = line.trim();
        if (trimmed && !trimmed.startsWith('#')) {
          let fullChunkUrl = trimmed;
          if (!trimmed.startsWith('http://') && !trimmed.startsWith('https://')) {
            fullChunkUrl = new URL(trimmed, baseUrl).href;
          }
          return `${req.protocol}://${req.get('host')}/api/stream/proxy?url=${encodeURIComponent(fullChunkUrl)}`;
        }
        return line;
      }).join('\n');

      return res.send(rewritten);
    } else {
      res.setHeader('Content-Type', response.headers['content-type'] || 'video/MP2T');
      return res.send(response.data);
    }
  } catch (error) {
    console.error("HLS Proxy Error:", error.message);
    res.status(500).send('Stream Proxy Error');
  }
});

// -----------------------------------------------------
// WYZIE SUBTITLES API PROXY
// -----------------------------------------------------

// Route: Get Wyzie Subtitles
app.get('/api/subtitles', async (req, res) => {
  try {
    const { id, season, episode, language } = req.query;
    if (!id) return res.status(400).json({ error: 'Missing ID' });

    const params = new URLSearchParams();
    params.set('id', id);
    if (season) params.set('season', season);
    if (episode) params.set('episode', episode);
    if (language) params.set('language', language);
    if (process.env.WYZIE_API_KEY) {
      params.set('key', process.env.WYZIE_API_KEY);
    }

    const response = await axios.get(`https://sub.wyzie.io/search?${params.toString()}`);
    res.json(response.data);
  } catch (error) {
    console.error("Wyzie Subtitles Error:", error.message);
    res.status(500).json({ error: 'Failed to fetch subtitles' });
  }
});

// -----------------------------------------------------
// MULTI-AUDIO & DIRECT STREAM API PROXIES
// -----------------------------------------------------

// Route: Get Media Stream Info (Multi-audio playlists)
app.get('/api/stream/mediaInfo', async (req, res) => {
  try {
    const { id } = req.query; // imdb or tmdb id
    if (!id) return res.status(400).json({ error: 'Missing ID' });

    const response = await axios.get(`https://autoembed.cc/api/v1/mediaInfo?id=${id}`).catch(() => {
      return axios.get(`https://autoembed.co/api/v1/mediaInfo?id=${id}`);
    });
    res.json(response.data);
  } catch (error) {
    console.error("Error fetching mediaInfo:", error.message);
    res.status(500).json({ error: 'Failed to fetch media info' });
  }
});

// Route: Get Direct HLS Stream Link
app.post('/api/stream/getStream', async (req, res) => {
  try {
    const { file, key } = req.body;
    if (!file || !key) return res.status(400).json({ error: 'Missing file or key' });

    const response = await axios.post('https://autoembed.cc/api/v1/getStream', {
      file,
      key
    }, {
      headers: { 'Content-Type': 'application/json' }
    }).catch(() => {
      return axios.post('https://autoembed.co/api/v1/getStream', { file, key }, { headers: { 'Content-Type': 'application/json' } });
    });
    res.json(response.data);
  } catch (error) {
    console.error("Error fetching stream link:", error.message);
    res.status(500).json({ error: 'Failed to fetch stream link' });
  }
});

// Route: Discover by Provider
app.get('/api/discover/provider/:providerId', async (req, res) => {
  try {
    const { providerId } = req.params;
    const type = req.query.type === 'tv' ? 'tv' : 'movie';
    const page = req.query.page || 1;
    const data = await fetchFromTMDB(`/discover/${type}`, {
      api_key: TMDB_API_KEY,
      with_watch_providers: providerId,
      watch_region: 'US',
      sort_by: 'popularity.desc',
      'vote_count.gte': 50,
      page: page
    });
    res.json(data);
  } catch (error) {
    console.error(`Error discovering for provider ${req.params.providerId}:`, error.message);
    res.status(500).json({ error: 'Failed to discover provider content' });
  }
});

// Route: Get Watch Providers
app.get('/api/providers', async (req, res) => {
  try {
    const data = await fetchFromTMDB('/watch/providers/movie', {
      api_key: TMDB_API_KEY,
      watch_region: 'US'
    });
    res.json(data);
  } catch (error) {
    console.error(`Error fetching providers:`, error.message);
    res.status(500).json({ error: 'Failed to fetch providers' });
  }
});

// Route: Get Anime
app.get('/api/anime', async (req, res) => {
  try {
    const page = req.query.page || 1;
    const data = await fetchFromTMDB('/discover/tv', {
      api_key: TMDB_API_KEY,
      with_genres: 16,
      with_original_language: 'ja',
      sort_by: 'popularity.desc',
      page: page
    });
    res.json(data);
  } catch (error) {
    console.error("Error discovering anime:", error.message);
    res.status(500).json({ error: 'Failed to discover anime' });
  }
});

// Route: Search
app.get('/api/search', async (req, res) => {
  try {
    const query = req.query.q;
    if (!query) return res.json({ results: [] });
    const response = await axios.get(`${TMDB_BASE_URL}/search/multi?api_key=${TMDB_API_KEY}&query=${encodeURIComponent(query)}`);
    res.json(response.data);
  } catch (error) {
    console.error("Error searching:", error.message);
    res.status(500).json({ error: 'Failed to search' });
  }
});

// Route: Check if server is awake
app.get('/', (req, res) => {
  res.send('Movie Backend is running! Access API at /api/movies/trending');
});

app.listen(PORT, () => {
  console.log(`Backend server running on http://localhost:${PORT}`);
});
