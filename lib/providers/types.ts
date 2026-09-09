export interface ResolvedStream {
  id: string;
  provider: string;
  url: string;
  quality?: string;
  type: 'hls' | 'mp4' | 'webm';
  headers?: Record<string, string>;
  subtitles?: { url: string; label: string; language?: string }[];
}

export interface ProviderResult {
  streams: ResolvedStream[];
}
