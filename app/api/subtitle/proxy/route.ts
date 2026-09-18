import { NextRequest, NextResponse } from 'next/server';
import zlib from 'zlib';

export const dynamic = 'force-dynamic';
export const revalidate = 0;
export const maxDuration = 60;

export async function OPTIONS() {
  return new NextResponse(null, {
    status: 204,
    headers: {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET, OPTIONS, HEAD',
      'Access-Control-Allow-Headers': '*',
    },
  });
}

// Parse a VTT timestamp like "00:01:23.456" into total seconds
function parseVttTimestamp(ts: string): number {
  const parts = ts.trim().split(':');
  if (parts.length === 3) {
    const [h, m, s] = parts;
    return parseInt(h) * 3600 + parseInt(m) * 60 + parseFloat(s);
  } else if (parts.length === 2) {
    const [m, s] = parts;
    return parseInt(m) * 60 + parseFloat(s);
  }
  return parseFloat(ts) || 0;
}

// Format seconds back to "HH:MM:SS.mmm"
function formatVttTimestamp(totalSeconds: number): string {
  if (totalSeconds < 0) totalSeconds = 0;
  const h = Math.floor(totalSeconds / 3600);
  const m = Math.floor((totalSeconds % 3600) / 60);
  const s = totalSeconds % 60;
  return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}:${s.toFixed(3).padStart(6, '0')}`;
}

// Parse X-TIMESTAMP-MAP from an HLS VTT segment to get the MPEGTS offset in seconds
function parseTimestampMapOffset(segmentText: string): number {
  const match = segmentText.match(/X-TIMESTAMP-MAP\s*=\s*.*?MPEGTS[:\s]*(\d+).*?LOCAL[:\s]*([\d:.]+)/i)
    || segmentText.match(/X-TIMESTAMP-MAP\s*=\s*.*?LOCAL[:\s]*([\d:.]+).*?MPEGTS[:\s]*(\d+)/i);

  if (!match) return 0;

  let mpegts: number;
  let local: number;
  // Check which capture group order we have
  if (segmentText.match(/X-TIMESTAMP-MAP\s*=\s*.*?MPEGTS/i)) {
    // MPEGTS first
    const m2 = segmentText.match(/X-TIMESTAMP-MAP\s*=\s*.*?MPEGTS[:\s]*(\d+).*?LOCAL[:\s]*([\d:.]+)/i);
    if (!m2) return 0;
    mpegts = parseInt(m2[1]);
    local = parseVttTimestamp(m2[2]);
  } else {
    // LOCAL first
    const m2 = segmentText.match(/X-TIMESTAMP-MAP\s*=\s*.*?LOCAL[:\s]*([\d:.]+).*?MPEGTS[:\s]*(\d+)/i);
    if (!m2) return 0;
    local = parseVttTimestamp(m2[1]);
    mpegts = parseInt(m2[2]);
  }

  // MPEGTS is in 90kHz clock ticks
  const mpegtsSeconds = mpegts / 90000;
  // The offset to apply: mpegts_seconds - local_time
  // Cues in the segment are in LOCAL time, we need to shift them by (mpegtsSeconds - local) to get absolute time
  // But for standalone VTT, we actually want absolute PTS-based times so the cues match the video
  // However, most players expect the VTT cue times to be relative to the start of the media.
  // For a properly working subtitle file, cue times should be relative, starting near 0.
  // The offset tells us: LOCAL + offset = absolute PTS time
  return mpegtsSeconds - local;
}

// Extract cue blocks from a VTT segment, applying timestamp offset
function extractCues(segmentText: string, offset: number): string[] {
  const lines = segmentText.split('\n');
  const cues: string[] = [];
  let currentCue: string[] = [];
  let inCue = false;

  const timestampRegex = /^(\d{2}:\d{2}:\d{2}[.,]\d{3})\s*-->\s*(\d{2}:\d{2}:\d{2}[.,]\d{3})(.*)/;

  for (const line of lines) {
    const trimmed = line.trim();

    // Skip WEBVTT header, X-TIMESTAMP-MAP, NOTE, STYLE blocks
    if (trimmed.startsWith('WEBVTT') || trimmed.startsWith('X-TIMESTAMP-MAP') ||
        trimmed.startsWith('NOTE') || trimmed.startsWith('STYLE')) {
      continue;
    }

    const tsMatch = trimmed.match(timestampRegex);
    if (tsMatch) {
      // Start of a new cue
      if (currentCue.length > 0) {
        cues.push(currentCue.join('\n'));
      }
      const startTime = parseVttTimestamp(tsMatch[1].replace(',', '.'));
      const endTime = parseVttTimestamp(tsMatch[2].replace(',', '.'));
      const rest = tsMatch[3] || '';

      // Apply offset for HLS segments
      const adjustedStart = formatVttTimestamp(startTime + offset);
      const adjustedEnd = formatVttTimestamp(endTime + offset);

      currentCue = [`${adjustedStart} --> ${adjustedEnd}${rest}`];
      inCue = true;
    } else if (inCue) {
      if (trimmed === '') {
        // End of cue
        if (currentCue.length > 1) { // Has timestamp + at least one text line
          cues.push(currentCue.join('\n'));
        }
        currentCue = [];
        inCue = false;
      } else {
        // Skip numeric cue identifiers (pure number lines before timestamps)
        if (currentCue.length === 0 && /^\d+$/.test(trimmed)) {
          continue;
        }
        currentCue.push(trimmed);
      }
    }
  }

  // Don't forget the last cue
  if (currentCue.length > 1) {
    cues.push(currentCue.join('\n'));
  }

  return cues;
}

// Merge multiple HLS VTT segments into a single VTT file with correct timing
function mergeHlsVttSegments(segmentTexts: string[]): string {
  const allCues: string[] = [];

  for (const seg of segmentTexts) {
    if (!seg.trim()) continue;
    const offset = parseTimestampMapOffset(seg);
    const cues = extractCues(seg, offset);
    allCues.push(...cues);
  }

  // Deduplicate identical cues (same timestamp + text)
  const uniqueCues = Array.from(new Set(allCues));

  // Sort by start timestamp
  uniqueCues.sort((a, b) => {
    const tsA = a.match(/^(\d{2}:\d{2}:\d{2}\.\d{3})/);
    const tsB = b.match(/^(\d{2}:\d{2}:\d{2}\.\d{3})/);
    if (!tsA || !tsB) return 0;
    return parseVttTimestamp(tsA[1]) - parseVttTimestamp(tsB[1]);
  });

  return `WEBVTT\n\n${uniqueCues.join('\n\n')}`;
}

function convertSrtToVtt(raw: string): string {
  let vtt = raw.replace(/\r\n|\r/g, '\n').trim();

  // Strip UTF-8 BOM if present
  if (vtt.charCodeAt(0) === 0xfeff) {
    vtt = vtt.slice(1);
  }

  // If already WebVTT, clean up and apply offset if X-TIMESTAMP-MAP is present
  if (vtt.startsWith('WEBVTT')) {
    if (vtt.includes('X-TIMESTAMP-MAP')) {
      const offset = parseTimestampMapOffset(vtt);
      const cues = extractCues(vtt, offset);
      return `WEBVTT\n\n${cues.join('\n\n')}`;
    }
    return vtt;
  }

  // Convert comma in SRT timestamps to dot for WebVTT (00:00:01,234 -> 00:00:01.234)
  vtt = vtt.replace(/(\d{2}:\d{2}:\d{2}),(\d{3})/g, (_match, time, ms) => `${time}.${ms}`);

  return `WEBVTT\n\n${vtt}`;
}

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const rawUrl = searchParams.get('url');

    if (!rawUrl) {
      return new NextResponse('Missing url parameter', {
        status: 400,
        headers: { 'Access-Control-Allow-Origin': '*' },
      });
    }

    let decodedUrl = rawUrl;
    if (rawUrl.startsWith('http%3A') || rawUrl.startsWith('https%3A')) {
      try {
        decodedUrl = decodeURIComponent(rawUrl);
      } catch {}
    }

    // Determine clean Referer and User-Agent
    const lowerUrl = decodedUrl.toLowerCase();
    let referer = 'https://vidlink.pro/';
    if (lowerUrl.includes('bingr.one') || lowerUrl.includes('hakunaymatata') || lowerUrl.includes('rivestream')) {
      referer = 'https://bingr.one/';
    } else if (lowerUrl.includes('vixsrc')) {
      referer = 'https://vixsrc.to/';
    } else if (lowerUrl.includes('videasy')) {
      referer = 'https://videasy.net/';
    } else if (lowerUrl.includes('autoembed')) {
      referer = 'https://autoembed.cc/';
    } else if (lowerUrl.includes('opensubtitles')) {
      referer = 'https://www.opensubtitles.org/';
    }

    const fetchHeaders: Record<string, string> = {
      'User-Agent':
        'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/125.0.0.0 Safari/537.36',
      Accept: '*/*',
      'Accept-Language': 'en-US,en;q=0.9',
      Referer: referer,
    };

    let response: Response | null = null;

    // 1. Direct fetch
    try {
      const res = await fetch(decodedUrl, {
        headers: fetchHeaders,
        signal: AbortSignal.timeout(10000),
      });
      if (res.ok) {
        response = res;
      }
    } catch {
      // Direct fetch failed, proceed to edge worker fallback
    }

    // 2. Cloudflare Worker Edge fallback
    if (!response) {
      try {
        const workerBaseUrl =
          process.env.NEXT_PUBLIC_PROXY_URL || 'https://rapid-shadow-7122.abvy7661.workers.dev';
        const targetWorkerUrl = `${workerBaseUrl}?url=${encodeURIComponent(decodedUrl)}&headers=${encodeURIComponent(
          JSON.stringify(fetchHeaders)
        )}`;
        const workerRes = await fetch(targetWorkerUrl, {
          signal: AbortSignal.timeout(10000),
        });
        if (workerRes.ok) {
          response = workerRes;
        }
      } catch {
        // Worker fallback failed
      }
    }

    if (!response || !response.ok) {
      return new NextResponse('Failed to fetch subtitle', {
        status: response ? response.status : 502,
        headers: { 'Access-Control-Allow-Origin': '*' },
      });
    }

    const arrayBuffer = await response.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);

    let subtitleText = '';

    // Check if gzipped (.gz)
    const isGzipped =
      decodedUrl.endsWith('.gz') ||
      (buffer.length >= 2 && buffer[0] === 0x1f && buffer[1] === 0x8b);

    if (isGzipped) {
      try {
        subtitleText = zlib.gunzipSync(buffer).toString('utf-8');
      } catch {
        subtitleText = buffer.toString('utf-8');
      }
    } else {
      subtitleText = buffer.toString('utf-8');
    }

    // If the subtitle URL points to an HLS subtitle playlist (.m3u8), fetch the actual .vtt segment(s)
    if (subtitleText.includes('#EXTM3U') || subtitleText.includes('#EXT-X-TARGETDURATION')) {
      const segmentUrls: string[] = [];
      const lines = subtitleText.split('\n');
      for (const line of lines) {
        const trimmed = line.trim();
        if (trimmed && !trimmed.startsWith('#')) {
          try {
            const absoluteUrl = new URL(trimmed, decodedUrl).href;
            segmentUrls.push(absoluteUrl);
          } catch {}
        }
      }

      if (segmentUrls.length > 0) {
        const segmentTexts = await Promise.all(
          segmentUrls.map(async (segUrl) => {
            try {
              const segRes = await fetch(segUrl, {
                headers: fetchHeaders,
                signal: AbortSignal.timeout(8000),
              });
              if (segRes.ok) return await segRes.text();
            } catch {}
            return '';
          })
        );
        const validSegments = segmentTexts.filter(Boolean);
        if (validSegments.length > 0) {
          // Use proper HLS VTT merger that handles X-TIMESTAMP-MAP offsets
          subtitleText = mergeHlsVttSegments(validSegments);
        }
      }
    }

    // Convert SRT or plain format to valid WebVTT
    const validVtt = convertSrtToVtt(subtitleText);

    return new NextResponse(validVtt, {
      status: 200,
      headers: {
        'Content-Type': 'text/vtt; charset=utf-8',
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Methods': 'GET, OPTIONS, HEAD',
        'Access-Control-Allow-Headers': '*',
        'Cache-Control': 'public, max-age=86400, stale-while-revalidate=86400',
      },
    });
  } catch (err: any) {
    console.error('[subtitle/proxy] Error:', err);
    return new NextResponse('Internal Subtitle Proxy Error', {
      status: 500,
      headers: { 'Access-Control-Allow-Origin': '*' },
    });
  }
}
