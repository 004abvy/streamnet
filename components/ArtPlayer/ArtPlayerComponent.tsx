'use client';

import React, { useEffect, useRef } from 'react';
import Artplayer from 'artplayer';
import Hls from 'hls.js';

export interface ArtPlayerSubtitle {
  url: string;
  label: string;
  default?: boolean;
}

export interface ArtPlayerProps {
  url: string;
  poster?: string;
  title?: string;
  subtitles?: ArtPlayerSubtitle[];
  className?: string;
  autoPlay?: boolean;
  initialTime?: number;
  audioBoost?: number;
  playbackRate?: number;
  aspectRatio?: string;
  videoFlip?: string;
  subtitleOffset?: number;
  activeSubtitleUrl?: string;
  activeSubtitleLabel?: string;
  onEnded?: () => void;
  onError?: (err: any) => void;
  onSettingsClick?: () => void;
  getInstance?: (art: Artplayer) => void;
  children?: React.ReactNode;
}

export default function ArtPlayerComponent({
  url,
  poster,
  title,
  subtitles = [],
  className = '',
  autoPlay = false,
  initialTime = 0,
  audioBoost = 1,
  playbackRate = 1,
  aspectRatio = 'Default',
  videoFlip = 'Normal',
  subtitleOffset = 0,
  activeSubtitleUrl,
  activeSubtitleLabel,
  onEnded,
  onError,
  onSettingsClick,
  getInstance,
  children,
}: ArtPlayerProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const artInstanceRef = useRef<Artplayer | null>(null);
  const audioContextRef = useRef<AudioContext | null>(null);
  const gainNodeRef = useRef<GainNode | null>(null);

  // Setup Web Audio API for hardware-level Audio Boost (1x to 3x)
  const applyAudioBoost = (video: HTMLVideoElement, gainValue: number) => {
    try {
      const isIOS = typeof window !== 'undefined' && (/iPad|iPhone|iPod/.test(navigator.userAgent) || (navigator.userAgent.includes("Mac") && "ontouchend" in document));
      if (isIOS) return; // iOS Safari often fails or silences audio with createMediaElementSource on HLS

      if (!audioContextRef.current) {
        const AudioCtx = window.AudioContext || (window as any).webkitAudioContext;
        const ctx = new AudioCtx();
        const source = ctx.createMediaElementSource(video);
        const gain = ctx.createGain();
        source.connect(gain);
        gain.connect(ctx.destination);
        audioContextRef.current = ctx;
        gainNodeRef.current = gain;
      }
      if (audioContextRef.current.state === 'suspended') {
        audioContextRef.current.resume();
      }
      if (gainNodeRef.current) {
        gainNodeRef.current.gain.value = gainValue;
      }
    } catch (err) {
      console.warn('[ArtPlayer] Audio Boost note:', err);
    }
  };

  useEffect(() => {
    if (!containerRef.current || !url) return;

    // Destroy existing instance if url changes
    if (artInstanceRef.current) {
      artInstanceRef.current.destroy(false);
      artInstanceRef.current = null;
    }

    const defaultSub = subtitles.find(s => s.default) || subtitles[0];

    // Settings gear SVG icon for the control bar
    const settingsIconSvg = `<svg xmlns="http://www.w3.org/2000/svg" width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="opacity:0.9;transition:transform 0.3s ease"><circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1 0 2.83 2 2 0 0 1-2.83 0l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-2 2 2 2 0 0 1-2-2v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83 0 2 2 0 0 1 0-2.83l.06-.06A1.65 1.65 0 0 0 4.68 15a1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1-2-2 2 2 0 0 1 2-2h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 0-2.83 2 2 0 0 1 2.83 0l.06.06A1.65 1.65 0 0 0 9 4.68a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 2-2 2 2 0 0 1 2 2v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 0 2 2 0 0 1 0 2.83l-.06.06A1.65 1.65 0 0 0 19.4 9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 2 2 2 2 0 0 1-2 2h-.09a1.65 1.65 0 0 0-1.51 1z"/></svg>`;

    // Store callback ref so it persists across renders
    const settingsClickRef = onSettingsClick;

    const art = new Artplayer({
      container: containerRef.current,
      url: url,
      poster: poster || '',
      volume: 0.85,
      isLive: false,
      muted: false,
      autoplay: autoPlay,
      pip: true,
      autoSize: false,
      autoMini: false,
      screenshot: false,
      setting: false,
      loop: false,
      flip: true,
      playbackRate: true,
      aspectRatio: true,
      fullscreen: true,
      fullscreenWeb: true,
      subtitleOffset: false,
      miniProgressBar: true,
      playsInline: true,
      theme: '#f59e0b',
      airplay: true,
      moreVideoAttr: {
        crossOrigin: 'anonymous',
        playsInline: true,
      },
      subtitle: {
        url: defaultSub?.url || 'data:text/vtt;charset=utf-8,WEBVTT%0A%0A',
        type: 'vtt' as const,
        style: {
          color: '#ffffff',
          fontSize: '20px',
          textShadow: '0 2px 4px rgba(0,0,0,0.9)',
        },
        encoding: 'utf-8',
      },
      controls: [
        // Settings gear icon — positioned right, next to PiP
        {
          name: 'settings',
          position: 'right',
          html: settingsIconSvg,
          tooltip: 'Settings',
          click: function () {
            if (settingsClickRef) settingsClickRef();
          },
        },
      ],
      customType: {
        m3u8: function (video: HTMLVideoElement, m3u8Url: string, artInstance: any) {
          if (Hls.isSupported()) {
            if (artInstance.hls) artInstance.hls.destroy();
            const hls = new Hls({
              enableWorker: true,
              lowLatencyMode: true,
              startPosition: initialTime && initialTime > 0 ? initialTime : -1,
              // Strict retry limits to prevent infinite refresh loops on flaky streams (e.g. UHD)
              fragLoadingMaxRetry: 2,
              fragLoadingMaxRetryTimeout: 4000,
              manifestLoadingMaxRetry: 2,
              manifestLoadingMaxRetryTimeout: 4000,
              levelLoadingMaxRetry: 2,
              levelLoadingMaxRetryTimeout: 4000,
            });
            hls.loadSource(m3u8Url);
            hls.attachMedia(video);
            artInstance.hls = hls;

            let hasRestoredSeek = false;
            let mediaErrorRecoveries = 0; // Cap recoverMediaError attempts
            const applyInitialSeek = () => {
              if (hasRestoredSeek || !initialTime || initialTime <= 0) return;
              try {
                if (video.currentTime < initialTime - 0.8 || video.currentTime === 0) {
                  video.currentTime = initialTime;
                  if (artInstance) artInstance.currentTime = initialTime;
                }
                if (video.currentTime >= initialTime - 1) {
                  hasRestoredSeek = true;
                }
              } catch {
                // Handled gracefully
              }
            };

            // Extract real quality levels and audio tracks from HLS manifest
            hls.on(Hls.Events.MANIFEST_PARSED, () => {
              applyInitialSeek();
              if (m3u8Url.includes('audioTrack=1') && hls.audioTracks && hls.audioTracks.length > 1) {
                hls.audioTrack = 1;
              } else if (m3u8Url.includes('audioTrack=0') && hls.audioTracks && hls.audioTracks.length > 0) {
                hls.audioTrack = 0;
              }
              if (hls.levels && hls.levels.length > 1) {
                const qualityLevels = hls.levels.map((level, idx) => ({
                  default: idx === hls.currentLevel,
                  html: `${level.height}P`,
                  url: m3u8Url,
                  levelIndex: idx,
                }));

                // Add Auto quality option
                qualityLevels.unshift({
                  default: hls.currentLevel === -1,
                  html: 'Auto Quality',
                  url: m3u8Url,
                  levelIndex: -1,
                });

                artInstance.setting.update({
                  name: 'quality',
                  width: 150,
                  html: 'Quality',
                  tooltip: 'Auto',
                  selector: qualityLevels,
                  onSelect: function (item: any) {
                    hls.currentLevel = item.levelIndex;
                    return item.html;
                  },
                });
              }
            });

            hls.on(Hls.Events.LEVEL_LOADED, applyInitialSeek);
            video.addEventListener('loadedmetadata', applyInitialSeek, { once: true });
            video.addEventListener('canplay', applyInitialSeek, { once: true });
            video.addEventListener('playing', () => {
              if (!hasRestoredSeek && initialTime > 0) {
                applyInitialSeek();
              }
            }, { once: true });

            hls.on(Hls.Events.ERROR, (event: any, data: any) => {
              if (data.fatal) {
                switch (data.type) {
                  case Hls.ErrorTypes.NETWORK_ERROR:
                    console.warn('[ArtPlayer HLS] Fatal network error, halting:', data);
                    hls.stopLoad();
                    artInstance.notice.show = 'Stream unreachable. Try another track.';
                    break;
                  case Hls.ErrorTypes.MEDIA_ERROR:
                    if (mediaErrorRecoveries < 1) {
                      mediaErrorRecoveries++;
                      console.warn('[ArtPlayer HLS] Media error, attempting recovery (attempt ' + mediaErrorRecoveries + ')');
                      hls.recoverMediaError();
                    } else {
                      console.warn('[ArtPlayer HLS] Media error persists after recovery, stopping.');
                      hls.stopLoad();
                      artInstance.notice.show = 'Stream playback error. Try another track.';
                    }
                    break;
                  default:
                    hls.destroy();
                    artInstance.notice.show = 'Stream playback error.';
                    break;
                }
              }
            });

            artInstance.on('destroy', () => hls.destroy());
          } else if (video.canPlayType('application/vnd.apple.mpegurl')) {
            video.src = m3u8Url;
            if (initialTime && initialTime > 0) {
              video.addEventListener('loadedmetadata', () => {
                video.currentTime = initialTime;
              }, { once: true });
            }
          } else {
            artInstance.notice.show = 'Unsupported video format';
          }
        },
      },
      settings: [
        // Native Audio Boost (1x to 3x) in ArtPlayer's setting menu
        {
          html: 'Audio Boost',
          width: 200,
          tooltip: '1x (Normal)',
          selector: [
            { default: true, html: 'Normal (1x)', value: 1 },
            { html: 'Boost 1.5x (+50%)', value: 1.5 },
            { html: 'Double Boost 2x (+100%)', value: 2 },
            { html: 'Super Boost 3x (+200%)', value: 3 },
          ],
          onSelect: function (item: any) {
            applyAudioBoost(art.video, item.value);
            return item.html;
          },
        },
        // Subtitle Selector in ArtPlayer's setting menu
        ...(subtitles.length > 0
          ? [
              {
                html: 'Subtitles',
                width: 200,
                tooltip: defaultSub?.label || 'Subtitles',
                selector: [
                  ...subtitles.map(sub => ({
                    default: sub.default,
                    html: sub.label,
                    url: sub.url,
                  })),
                  { html: 'Turn Off', url: '' },
                ],
                onSelect: function (item: any) {
                  if (item.url) {
                    art.subtitle.switch(item.url, { name: item.html });
                    art.subtitle.show = true;
                  } else {
                    art.subtitle.show = false;
                  }
                  return item.html;
                },
              },
            ]
          : []),
        // Download current source
        {
          html: 'Download Stream',
          width: 180,
          tooltip: 'Direct Link',
          onSelect: function () {
            window.open(url, '_blank');
            return 'Opening...';
          },
        },
      ],
    });

    artInstanceRef.current = art;

    art.on('ready', () => {
      if (initialTime && initialTime > 0) {
        try {
          if (art.currentTime < initialTime - 0.8 || art.currentTime === 0) {
            art.currentTime = initialTime;
          }
        } catch {}
      }
    });

    if (getInstance) {
      getInstance(art);
    }

    art.on('video:ended', () => {
      onEnded?.();
    });

    art.on('error', (err: any) => {
      console.warn('[ArtPlayer] Error:', err);
      onError?.(err);
    });

    return () => {
      if (artInstanceRef.current) {
        artInstanceRef.current.destroy(false);
        artInstanceRef.current = null;
      }
      if (audioContextRef.current) {
        audioContextRef.current.close().catch(() => {});
        audioContextRef.current = null;
      }
    };
  }, [url]);

  // Synchronize audioBoost
  useEffect(() => {
    if (artInstanceRef.current?.video && audioBoost) {
      applyAudioBoost(artInstanceRef.current.video, audioBoost);
    }
  }, [audioBoost]);

  // Synchronize playbackRate
  useEffect(() => {
    if (artInstanceRef.current && playbackRate) {
      artInstanceRef.current.playbackRate = playbackRate;
    }
  }, [playbackRate]);

  // Synchronize aspectRatio
  useEffect(() => {
    if (artInstanceRef.current && aspectRatio) {
      try {
        artInstanceRef.current.aspectRatio = aspectRatio === 'Default' ? 'default' : aspectRatio;
      } catch (e) {
        // Handled gracefully
      }
    }
  }, [aspectRatio]);

  // Synchronize videoFlip
  useEffect(() => {
    if (artInstanceRef.current && videoFlip) {
      if (videoFlip === 'Flip Horizontal') artInstanceRef.current.flip = 'horizontal';
      else if (videoFlip === 'Flip Vertical') artInstanceRef.current.flip = 'vertical';
      else artInstanceRef.current.flip = 'normal';
    }
  }, [videoFlip]);

  // Synchronize subtitleOffset
  useEffect(() => {
    if (artInstanceRef.current?.subtitle && typeof subtitleOffset === 'number') {
      artInstanceRef.current.subtitleOffset = subtitleOffset;
    }
  }, [subtitleOffset]);

  // Synchronize activeSubtitleUrl
  useEffect(() => {
    if (artInstanceRef.current?.subtitle) {
      if (activeSubtitleUrl) {
        artInstanceRef.current.subtitle.switch(activeSubtitleUrl, { name: activeSubtitleLabel || 'Subtitle' });
        artInstanceRef.current.subtitle.show = true;
      } else if (activeSubtitleUrl === '') {
        artInstanceRef.current.subtitle.show = false;
      }
    }
  }, [activeSubtitleUrl, activeSubtitleLabel]);

  // Synchronize subtitles list arrival
  useEffect(() => {
    if (artInstanceRef.current?.subtitle && subtitles.length > 0 && activeSubtitleUrl !== '') {
      const targetSub =
        subtitles.find(s => s.label === activeSubtitleLabel) ||
        subtitles.find(s => s.url === activeSubtitleUrl) ||
        subtitles.find(s => s.default) ||
        subtitles[0];
      if (targetSub) {
        artInstanceRef.current.subtitle.switch(targetSub.url, { name: targetSub.label });
        artInstanceRef.current.subtitle.show = true;
      }
    }
  }, [subtitles]);

  return (
    <div
      ref={containerRef}
      className={`w-full aspect-video rounded-xl overflow-hidden bg-black relative ${className}`}
    >
      {children}
    </div>
  );
}
