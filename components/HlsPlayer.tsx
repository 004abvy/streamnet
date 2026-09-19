"use client";

import React, { useEffect, useRef, useState } from "react";
import ArtPlayerComponent from "./ArtPlayer/ArtPlayerComponent";
import { DirectSourceItem } from "./VidstackPlayer";

interface SubtitleTrack {
  url: string;
  label: string;
  format: string;
}

interface HlsPlayerProps {
  serverId: string;
  tmdbId: string;
  title?: string;
  type: "movie" | "tv";
  season?: number;
  episode?: number;
  imdbId?: string;
  className?: string;
  preferredLanguage?: string;
  onNextServer?: () => void;
  onInvalidDuration?: (duration: number) => void;
  onNoHindiDirectSource?: () => void;
}

// Module-level stream memory cache for 0ms instant playback on re-visit or server switch
interface CachedStreamData {
  initialList: DirectSourceItem[];
  subtitles: SubtitleTrack[];
  timestamp: number;
}
const streamMemoryCache = new Map<string, CachedStreamData>();

export default function HlsPlayer({
  serverId,
  tmdbId,
  title: externalTitle,
  type,
  season,
  episode,
  className = "",
  preferredLanguage,
  onNextServer,
  onInvalidDuration,
}: HlsPlayerProps) {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [subtitles, setSubtitles] = useState<SubtitleTrack[]>([]);
  const [streamData, setStreamData] = useState<{
    url: string;
    isMp4?: boolean;
    name?: string;
  } | null>(null);
  const [availableSources, setAvailableSources] = useState<DirectSourceItem[]>(
    [],
  );
  const [currentSourceIndex, setCurrentSourceIndex] = useState<number>(0);
  const [title, setTitle] = useState<string>(
    externalTitle || "StreamNet Movie",
  );

  const triedIndicesRef = useRef<Set<number>>(new Set());
  const autoSwitchCountRef = useRef<number>(0);
  const lastSwitchTimeRef = useRef<number>(0);

  useEffect(() => {
    if (externalTitle) setTitle(externalTitle);
  }, [externalTitle]);

  // Instant Stream Playback & Background Non-Blocking Parallel Probing
  useEffect(() => {
    let isMounted = true;
    const fetchStream = async () => {
      try {
        setError(null);
        triedIndicesRef.current.clear();

        const hostname =
          typeof window !== "undefined"
            ? window.location.hostname
            : "localhost";
        const protocol =
          typeof window !== "undefined" ? window.location.protocol : "https:";
        const port =
          typeof window !== "undefined"
            ? window.location.port
              ? `:${window.location.port}`
              : ""
            : "";

        const omssUrl =
          type === "movie"
            ? `${protocol}//${hostname}${port}/api/direct/movie/${tmdbId}`
            : `${protocol}//${hostname}${port}/api/direct/tv/${tmdbId}/${season}/${episode}`;

        // 0ms INSTANT MEMORY CACHE CHECK
        const cached = streamMemoryCache.get(omssUrl);
        if (cached && Date.now() - cached.timestamp < 1800000) {
          // 30-min cache TTL
          if (isMounted) {
            setAvailableSources(cached.initialList);
            setSubtitles(cached.subtitles);

            // Restore previously used direct source
            let initialSourceIndex = 0;
            const savedDirectSource = localStorage.getItem(
              `streamnet_direct_source_${tmdbId}`,
            );
            if (savedDirectSource) {
              const foundIdx = cached.initialList.findIndex(
                (s) => s.name === savedDirectSource,
              );
              if (foundIdx !== -1) initialSourceIndex = foundIdx;
            } else if (preferredLanguage === "hi") {
              const hindiFoundIdx = cached.initialList.findIndex((s) =>
                s.audioLanguages?.some((l) => l.toLowerCase().includes("hin")),
              );
              if (hindiFoundIdx !== -1) initialSourceIndex = hindiFoundIdx;
            }

            setCurrentSourceIndex(initialSourceIndex);
            triedIndicesRef.current.add(initialSourceIndex);
            const initialSource = cached.initialList[initialSourceIndex];
            setStreamData({
              url: initialSource.url,
              isMp4: initialSource.url.includes(".mp4"),
              name: initialSource.name,
            });
            setLoading(false);
          }
          return;
        }

        setStreamData(null);
        setSubtitles([]);
        setLoading(true);
        setError(null);
        triedIndicesRef.current.clear();

        const controller = new AbortController();
        const apiTimeout = setTimeout(() => controller.abort(), 15000); // 15s timeout to allow full scraper responses

        const res = await fetch(omssUrl, { signal: controller.signal });
        clearTimeout(apiTimeout);
        const data = await res.json();

        if (!data || !data.sources || data.sources.length === 0) {
          console.error(
            "[HlsPlayer] No sources in response for:",
            omssUrl,
            data,
          );
          throw new Error(
            `No streams available for ${serverId}. Try another server.`,
          );
        }

        if (!isMounted) return;

        // Sort raw sources prioritizing preferred language (Hindi) then English, then VidSrc
        const sortedRaw = [...data.sources].sort((a: any, b: any) => {
          const aAudio = (a.audioTracks || []).map((t: any) =>
            (t.label || t.language || "").toLowerCase(),
          );
          const bAudio = (b.audioTracks || []).map((t: any) =>
            (t.label || t.language || "").toLowerCase(),
          );
          const aQual = String(a.quality || "").toLowerCase();
          const bQual = String(b.quality || "").toLowerCase();

          // 1. Check for preferred language (Hindi)
          const aHasHindi =
            aAudio.some((l: string) => l.includes("hin")) ||
            aQual.includes("hindi");
          const bHasHindi =
            bAudio.some((l: string) => l.includes("hin")) ||
            bQual.includes("hindi");

          if (preferredLanguage === "hi") {
            if (aHasHindi && !bHasHindi) return -1;
            if (!aHasHindi && bHasHindi) return 1;
          }

          // 2. Prioritize English/Default
          const aHasEnglish =
            aAudio.some(
              (l: string) => l.includes("eng") || l.includes("en-"),
            ) ||
            aQual.includes("english") ||
            aAudio.length === 0;
          const bHasEnglish =
            bAudio.some(
              (l: string) => l.includes("eng") || l.includes("en-"),
            ) ||
            bQual.includes("english") ||
            bAudio.length === 0;

          if (aHasEnglish && !bHasEnglish) return -1;
          if (!aHasEnglish && bHasEnglish) return 1;

          // 3. VidSrc Priority
          const aIsVidSrc =
            String(a.provider?.id || "")
              .toLowerCase()
              .includes("vidsrc") ||
            String(a.provider?.name || "")
              .toLowerCase()
              .includes("vidsrc") ||
            String(a.name || "")
              .toLowerCase()
              .includes("vidsrc") ||
            String(a.url || "")
              .toLowerCase()
              .includes("vidsrc");
          const bIsVidSrc =
            String(b.provider?.id || "")
              .toLowerCase()
              .includes("vidsrc") ||
            String(b.provider?.name || "")
              .toLowerCase()
              .includes("vidsrc") ||
            String(b.name || "")
              .toLowerCase()
              .includes("vidsrc") ||
            String(b.url || "")
              .toLowerCase()
              .includes("vidsrc");
          if (aIsVidSrc && !bIsVidSrc) return -1;
          if (!aIsVidSrc && bIsVidSrc) return 1;
          return 0;
        });

        // Format initial items instantly
        const providerCounts: Record<string, number> = {};
        const initialList: DirectSourceItem[] = sortedRaw.map((s, idx) => {
          let url = s.url
            .replace(/localhost/g, hostname)
            .replace(/127\.0\.0\.1/g, hostname);
          const rawProvider =
            s.provider?.name || s.name || s.provider?.id || "Direct Server";

          // Extract audio tracks and languages
          const audioLangs: string[] = [];
          if (Array.isArray(s.audioTracks)) {
            s.audioTracks.forEach((t: any) => {
              const label = t.label || t.language;
              if (label && !audioLangs.includes(label)) {
                audioLangs.push(label);
              }
            });
          }
          if (
            s.quality &&
            typeof s.quality === "string" &&
            (s.quality.toLowerCase().includes("hindi") ||
              s.quality.toLowerCase().includes("dual") ||
              s.quality.toLowerCase().includes("multi"))
          ) {
            if (!audioLangs.includes(s.quality)) audioLangs.push(s.quality);
          }

          providerCounts[rawProvider] = (providerCounts[rawProvider] || 0) + 1;
          const name =
            providerCounts[rawProvider] > 1
              ? `${rawProvider} #${providerCounts[rawProvider]}`
              : rawProvider;

          return {
            id: s.provider?.id || s.id || `src-${idx}`,
            name,
            url,
            rawUrl: s.rawUrl || s.url,
            audioLanguages: audioLangs,
            isWorking: true,
          };
        });

        setAvailableSources(initialList);

        // Restore previously used direct source if available
        let initialSourceIndex = 0;
        const savedDirectSource = localStorage.getItem(
          `streamnet_direct_source_${tmdbId}`,
        );
        if (savedDirectSource) {
          const foundIdx = initialList.findIndex(
            (s) => s.name === savedDirectSource,
          );
          if (foundIdx !== -1) initialSourceIndex = foundIdx;
        } else if (preferredLanguage === "hi") {
          const hindiFoundIdx = initialList.findIndex((s) =>
            s.audioLanguages?.some((l) => l.toLowerCase().includes("hin")),
          );
          if (hindiFoundIdx !== -1) {
            initialSourceIndex = hindiFoundIdx;
          }
        }

        setCurrentSourceIndex(initialSourceIndex);
        triedIndicesRef.current.add(initialSourceIndex);

        let initialSource = initialList[initialSourceIndex];

        // INSTANT RENDER: Mount video element immediately without waiting for probes
        setStreamData({
          url: initialSource.url,
          isMp4: initialSource.url.includes(".mp4"),
          name: initialSource.name,
        });
        setLoading(false);

        // Process Subtitles in background
        if (data.subtitles && Array.isArray(data.subtitles)) {
          const rawSubs: SubtitleTrack[] = data.subtitles
            .filter((sub: any) => sub && sub.url)
            .map((sub: any) => {
              let subUrl = sub.url || "";
              if (subUrl.startsWith("/")) {
                subUrl = `${protocol}//${hostname}${port}${subUrl}`;
              } else if (subUrl.includes("/api/subtitle/proxy")) {
                try {
                  const parsed = new URL(subUrl);
                  subUrl = `${protocol}//${hostname}${port}${parsed.pathname}${parsed.search}`;
                } catch {
                  subUrl = subUrl.replace(
                    /localhost(:\d+)?/g,
                    `${hostname}${port}`,
                  );
                }
              } else {
                subUrl = subUrl.replace(
                  /localhost(:\d+)?/g,
                  `${hostname}${port}`,
                );
              }

              return {
                url: subUrl,
                label: sub.label || "English",
                format: "vtt",
              };
            });

          const uniqueMap = new Map<string, SubtitleTrack>();
          rawSubs.forEach((s) => {
            if (!uniqueMap.has(s.url)) uniqueMap.set(s.url, s);
          });
          const uniqueSubs = Array.from(uniqueMap.values());

          Promise.allSettled(
            uniqueSubs.map(async (track: any) => {
              try {
                const controller = new AbortController();
                const id = setTimeout(() => controller.abort(new Error("Timeout checking subtitle")), 3000);
                const res = await fetch(track.url, {
                  method: "HEAD",
                  signal: controller.signal,
                });
                clearTimeout(id);
                if (res.ok) return track;
                return null;
              } catch {
                return null;
              }
            }),
          ).then((checkResults) => {
            const workingSubs = checkResults
              .filter((r) => r.status === "fulfilled" && r.value !== null)
              .map((r: any) => r.value);

            if (isMounted) setSubtitles(workingSubs);
            streamMemoryCache.set(omssUrl, {
              initialList,
              subtitles: workingSubs,
              timestamp: Date.now(),
            });
          });
        } else {
          streamMemoryCache.set(omssUrl, {
            initialList,
            subtitles: [],
            timestamp: Date.now(),
          });
        }

        // Keep all resolved sources active and available
        setAvailableSources(initialList);
      } catch (err: any) {
        if (isMounted) {
          setError(err.message || "Stream loading error");
          setLoading(false);
        }
      }
    };

    fetchStream();
    return () => {
      isMounted = false;
    };
  }, [serverId, tmdbId, type, season, episode]);

  const switchDirectSource = (nextIdx: number) => {
    if (nextIdx >= 0 && nextIdx < availableSources.length) {
      triedIndicesRef.current.add(nextIdx);
      setCurrentSourceIndex(nextIdx);
      const nextSource = availableSources[nextIdx];

      setStreamData({
        url: nextSource.url,
        isMp4: nextSource.url.includes(".mp4"),
        name: nextSource.name,
      });
      return true;
    }
    return false;
  };

  const handleSelectDirectSource = (sourceItem: DirectSourceItem) => {
    const foundIdx = availableSources.findIndex(
      (s) =>
        s.url === sourceItem.url ||
        s.id === sourceItem.id ||
        s.name === sourceItem.name,
    );
    if (foundIdx !== -1) {
      switchDirectSource(foundIdx);
      localStorage.setItem(
        `streamnet_direct_source_${tmdbId}`,
        sourceItem.name,
      );
    } else {
      setStreamData({
        url: sourceItem.url,
        isMp4: sourceItem.url.includes(".mp4"),
        name: sourceItem.name,
      });
      localStorage.setItem(
        `streamnet_direct_source_${tmdbId}`,
        sourceItem.name,
      );
    }
  };

  // Check next untried direct source before falling back to ScreenScape embed
  const handleInvalidDuration = (durationSec: number) => {
    console.warn(
      `Direct source ${currentSourceIndex} (${streamData?.name}) duration (${durationSec}s) is invalid for ${title}.`,
    );

    // Prevent auto-refresh loop: max 3 auto-switches within 10 seconds
    const now = Date.now();
    if (now - lastSwitchTimeRef.current > 10000) {
      autoSwitchCountRef.current = 0;
    }

    if (autoSwitchCountRef.current >= 3) {
      console.warn(
        "Auto-switch limit reached. Falling back to Embed to prevent loop.",
      );
      onInvalidDuration?.(durationSec);
      return;
    }

    let nextUntriedIndex = -1;
    // Prioritize verified working sources first
    for (let i = 0; i < availableSources.length; i++) {
      if (
        !triedIndicesRef.current.has(i) &&
        availableSources[i].isWorking !== false
      ) {
        nextUntriedIndex = i;
        break;
      }
    }

    // If no verified working untried sources, take any untried
    if (nextUntriedIndex === -1) {
      for (let i = 0; i < availableSources.length; i++) {
        if (!triedIndicesRef.current.has(i)) {
          nextUntriedIndex = i;
          break;
        }
      }
    }

    if (nextUntriedIndex !== -1) {
      console.log(
        `Auto-advancing to next direct stream source #${nextUntriedIndex + 1} (${availableSources[nextUntriedIndex]?.name})...`,
      );
      autoSwitchCountRef.current++;
      lastSwitchTimeRef.current = now;
      switchDirectSource(nextUntriedIndex);
    } else {
      console.warn(
        "All direct stream sources exhausted/invalid. Falling back to Embed.",
      );
      onInvalidDuration?.(durationSec);
    }
  };

  // Build clean, deduplicated track list for Vidstack
  const labelCounts: Record<string, number> = {};
  let defaultSubtitleSelected = false;

  const vidstackTracks = subtitles.map((sub) => {
    const rawLabel = sub.label || "English";
    labelCounts[rawLabel] = (labelCounts[rawLabel] || 0) + 1;
    const uniqueLabel =
      labelCounts[rawLabel] > 1
        ? `${rawLabel} (${labelCounts[rawLabel]})`
        : rawLabel;

    const isEnglish =
      rawLabel.toLowerCase().includes("english") ||
      rawLabel.toLowerCase().includes("eng");
    let isDefault = false;

    if (isEnglish && !defaultSubtitleSelected) {
      isDefault = true;
      defaultSubtitleSelected = true;
    }

    return {
      src: sub.url,
      label: uniqueLabel,
      language: isEnglish
        ? "en"
        : rawLabel.toLowerCase().includes("hindi")
          ? "hi"
          : sub.label?.substring(0, 2).toLowerCase() || "en",
      kind: "subtitles",
      default: isDefault,
      type: "vtt",
    };
  });

  if (loading) {
    return (
      <div
        className={`w-full aspect-video rounded-xl flex flex-col items-center justify-center bg-neutral-900 border border-white/10 ${className}`}
      >
        <div className="w-10 h-10 border-4 border-amber-400 border-t-transparent rounded-full animate-spin mb-3"></div>
        <p className="text-sm font-medium text-neutral-300">
          Loading Please wait
        </p>
      </div>
    );
  }

  if (error || !streamData) {
    return (
      <div
        className={`w-full aspect-video rounded-xl flex flex-col items-center justify-center bg-neutral-900 border border-red-500/20 p-6 text-center ${className}`}
      >
        <p className="text-red-400 font-semibold text-lg mb-2">
          Playback Error
        </p>
        <p className="text-neutral-400 text-sm mb-4">
          {error || "Could not load video source"}
        </p>
        {onNextServer && (
          <button
            onClick={onNextServer}
            className="px-5 py-2.5 bg-amber-500 hover:bg-amber-400 text-black font-bold rounded-lg text-sm transition cursor-pointer"
          >
            Switch Server
          </button>
        )}
      </div>
    );
  }

  const sortedSubtitles = [...subtitles].sort((a, b) => {
    const labelA = (a.label || "English").toLowerCase();
    const labelB = (b.label || "English").toLowerCase();
    const isEngA = labelA.includes("english") || labelA.includes("eng");
    const isEngB = labelB.includes("english") || labelB.includes("eng");

    if (isEngA && !isEngB) return -1;
    if (!isEngA && isEngB) return 1;
    return labelA.localeCompare(labelB);
  });

  const artPlayerSubs = sortedSubtitles.map((sub, idx) => ({
    url: sub.url,
    label: sub.label || "English",
    default: idx === 0,
  }));

  return (
    <div
      className={`relative w-full aspect-video rounded-xl overflow-hidden shadow-2xl bg-black ${className}`}
    >
      <ArtPlayerComponent
        title={title}
        url={streamData.url}
        subtitles={artPlayerSubs}
        className="w-full h-full text-white font-sans"
        autoPlay={true}
        onError={(err) => {
          console.warn(
            "[HlsPlayer] Stream error encountered:",
            err,
            "Advancing to next available stream source...",
          );
          handleInvalidDuration(0);
        }}
        getInstance={(art) => {
          // Dead stream detection
          const loadTimeout = setTimeout(() => {
            if (art.video && art.video.readyState === 0) {
              console.warn(
                "[HlsPlayer] Stream load timeout (8s). Stream is likely dead. Auto-advancing...",
              );
              handleInvalidDuration(0);
            }
          }, 8000);

          art.on("destroy", () => {
            clearTimeout(loadTimeout);
          });

          art.on("ready", () => {
            const savedProgress = localStorage.getItem(
              `streamnet_progress_${tmdbId}`,
            );
            if (savedProgress) {
              const time = parseFloat(savedProgress);
              if (time > 1) {
                art.currentTime = time;
              }
            }
          });

          art.on("video:timeupdate", () => {
            const currentTime = art.currentTime;
            if (tmdbId && typeof currentTime === "number" && currentTime > 0) {
              const lastSaved = parseFloat(
                localStorage.getItem(
                  `streamnet_progress_${tmdbId}_last_save`,
                ) || "0",
              );
              if (Math.abs(currentTime - lastSaved) >= 1) {
                localStorage.setItem(
                  `streamnet_progress_${tmdbId}`,
                  currentTime.toString(),
                );
                localStorage.setItem(
                  `streamnet_progress_${tmdbId}_last_save`,
                  currentTime.toString(),
                );
              }
            }
          });

          art.on("video:ended", () => {
            if (tmdbId) {
              localStorage.removeItem(`streamnet_progress_${tmdbId}`);
            }
          });
        }}
      />
    </div>
  );
}
