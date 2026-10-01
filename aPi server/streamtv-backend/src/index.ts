import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';

dotenv.config();

const app = express();
const PORT = process.env.PORT || 4001;

app.use(cors());
app.use(express.json());

// Basic health check route
app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', message: 'StreamTV Backend is running!' });
});

import { aggregateStreams } from './aggregate';
import { proxyStream } from './proxy';
import { resolveAllStreams } from './providers/index';

app.get('/api/direct-aggregate', aggregateStreams);
app.get('/api/stream/proxy.m3u8', proxyStream);

app.get('/api/provider/:name', async (req, res) => {
  try {
    const { id, type, season, episode } = req.query;
    const name = req.params.name.toLowerCase();
    
    const currentOrigin = `${req.protocol}://${req.headers.host}`;
    
    // Resolve ONLY the requested provider's stream to avoid waiting 20s for timeouts on other servers
    const all = await resolveAllStreams(id as string, (type as any) || 'movie', season as string, episode as string, name);
    let filtered = all.filter(s => 
      (s.provider && s.provider.toLowerCase().includes(name)) || 
      (s.id && s.id.toLowerCase().includes(name))
    );

    // Proxy the URLs to bypass CORS for the web player
    filtered = filtered.map(s => {
        const params = new URLSearchParams({ 
            url: s.url, 
            headers: JSON.stringify(s.headers || {}) 
        });
        if (s.type === 'hls') params.set('manifest', '1');
        const proxiedUrl = `${currentOrigin}/api/stream/proxy.m3u8?${params.toString()}`;
        return { ...s, url: proxiedUrl, rawUrl: s.url };
    });
    
    res.json({ 
      providerRequested: req.params.name, 
      success: true, 
      sources: filtered 
    });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

app.listen(PORT, () => {
  console.log(`🚀 StreamTV Backend is running on http://localhost:${PORT}`);
});
