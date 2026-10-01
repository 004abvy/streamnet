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

app.get('/api/direct-aggregate', aggregateStreams);
app.get('/api/stream/proxy.m3u8', proxyStream);


app.listen(PORT, () => {
  console.log(`🚀 StreamTV Backend is running on http://localhost:${PORT}`);
});
