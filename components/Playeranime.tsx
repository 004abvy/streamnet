"use client";

import React, { useState, useEffect, useMemo } from "react";
import { X, ArrowLeft, Loader, Search, Sparkles } from "lucide-react";
import { useRouter } from "next/navigation";
import VidstackPlayer from "./VidstackPlayer";
import { installAdblockProtection } from "../utils/adblockFramework";
import styles from "./SeasonEpisodeSelector/SeasonEpisodeSelector.module.css";

interface PlayeranimeProps {
  animeTitle: string;
  tmdbId?: string | number;
  type?: "tv" | "movie";
  onClose: () => void;
}

export default function Playeranime({
  animeTitle,
  tmdbId,
  type = "tv",
  onClose,
}: PlayeranimeProps) {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [anilistId, setAnilistId] = useState<number | null>(null);
  const [animeBanner, setAnimeBanner] = useState<string | null>(null);
  const [animeCover, setAnimeCover] = useState<string | null>(null);
  const [tmdbBackdrop, setTmdbBackdrop] = useState<string | null>(null);
  const [tmdbEpisodes, setTmdbEpisodes] = useState<any[]>([]);

  const [episodes, setEpisodes] = useState<any[]>([]);
  const [selectedProvider, setSelectedProvider] = useState<string | null>(null);
  const [selectedEpisodeId, setSelectedEpisodeId] = useState<string | null>(null);

  const [streamUrl, setStreamUrl] = useState<string | null>(null);
  const [subtitles, setSubtitles] = useState<any[]>([]);
  const [isIframe, setIsIframe] = useState<boolean>(false);
  const [hasAbsorbedClick, setHasAbsorbedClick] = useState<boolean>(false);

  const [animeData, setAnimeData] = useState<any>(null);
  const [audioType, setAudioType] = useState<"sub" | "dub">("sub");

  const [searchQuery, setSearchQuery] = useState("");
  const [sortOrder, setSortOrder] = useState<"asc" | "desc">("asc");
  const [showVipModal, setShowVipModal] = useState<boolean>(false);
  const [vipInputCode, setVipInputCode] = useState<string>("");
  const [vipError, setVipError] = useState<string | null>(null);

  // Helper to fetch with timeout
  const fetchWithTimeout = async (
    url: string,
    options: any = {},
    timeoutMs = 30000,
  ) => {
    const controller = new AbortController();
    const id = setTimeout(
      () => controller.abort(new Error("Request timed out after " + timeoutMs + "ms")),
      timeoutMs,
    );
    try {
      const response = await fetch(url, {
        ...options,
        signal: controller.signal,
      });
      clearTimeout(id);
      return response;
    } catch (error) {
      clearTimeout(id);
      throw error;
    }
  };

  // Initialize Adblock framework to protect against un-sandboxed iframe ads
  useEffect(() => {
    if (isIframe) {
      const cleanup = installAdblockProtection(true, (action, target) => {
        console.log(`[Playeranime] Adblock intercepted: ${action}`, target);
      });
      return () => cleanup();
    }
  }, [isIframe]);

  // Fetch TMDB backdrop and episode stills if tmdbId is present
  useEffect(() => {
    if (!tmdbId) return;
    const endpoint = type === "movie" ? `/api/movies/${tmdbId}` : `/api/tv/${tmdbId}`;
    fetch(endpoint)
      .then((res) => (res.ok ? res.json() : null))
      .then((data) => {
        if (data && data.backdrop_path) {
          setTmdbBackdrop(`https://image.tmdb.org/t/p/original${data.backdrop_path}`);
        }
      })
      .catch(() => {});

    if (type === "tv") {
      fetch(`/api/tv/${tmdbId}/season/1`)
        .then((res) => (res.ok ? res.json() : null))
        .then((data) => {
          if (data && data.episodes) {
            setTmdbEpisodes(data.episodes);
          }
        })
        .catch(() => {});
    }
  }, [tmdbId, type]);

  // Helper to extract episodes based on preferences
  const loadEpisodes = (
    data: any,
    audio: "sub" | "dub",
    currentProvider: string | null,
  ) => {
    const priorityProviders = [
      "anikoto",
      "reanime",
      "2dhive",
      "kaa",
      "mkissa",
      "animegg",
    ];
    let foundEpisodes = [];
    let chosenProvider = null;

    if (
      currentProvider &&
      data[currentProvider]?.episodes?.[audio]?.length > 0
    ) {
      foundEpisodes = data[currentProvider].episodes[audio];
      chosenProvider = currentProvider;
    } else {
      for (const provider of priorityProviders) {
        if (data[provider]?.episodes?.[audio]?.length > 0) {
          foundEpisodes = data[provider].episodes[audio];
          chosenProvider = provider;
          break;
        }
      }
    }

    if (foundEpisodes.length > 0 && chosenProvider) {
      setEpisodes(foundEpisodes);
      setSelectedProvider(chosenProvider);
      setSelectedEpisodeId(foundEpisodes[0].id);
      setError(null);
    } else {
      setEpisodes([]);
      setError(`No ${audio} episodes found.`);
    }
  };

  // 1. Search anime by title via AniList GraphQL
  useEffect(() => {
    async function init() {
      try {
        setLoading(true);
        setError(null);

        const query = `
          query ($search: String) {
            Media (search: $search, type: ANIME) {
              id
              title { romaji english native }
              bannerImage
              coverImage { extraLarge large medium color }
            }
          }
        `;
        const searchRes = await fetch("https://graphql.anilist.co", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ query, variables: { search: animeTitle } }),
        });

        const searchData = await searchRes.json();
        const media = searchData.data?.Media;
        const mediaId = media?.id;

        if (media?.bannerImage) setAnimeBanner(media.bannerImage);
        if (media?.coverImage?.extraLarge || media?.coverImage?.large) {
          setAnimeCover(media.coverImage.extraLarge || media.coverImage.large);
        }

        if (!mediaId) {
          setError("Anime not found on AniList.");
          setLoading(false);
          return;
        }

        setAnilistId(mediaId);

        const anivexaUrl =
          process.env.NEXT_PUBLIC_ANIVEXA_URL || "http://localhost:4000";
        const epRes = await fetchWithTimeout(
          `${anivexaUrl}/episodes/anikoto/reanime/animegg/${mediaId}`,
        );
        const epData = await epRes.json();
        setAnimeData(epData);
        loadEpisodes(epData, audioType, selectedProvider);
      } catch (err: any) {
        setError(err.message || "Error fetching anime data");
      } finally {
        setLoading(false);
      }
    }
    init();
  }, [animeTitle]);

  // Handle Audio Type toggle
  const handleAudioToggle = (type: "sub" | "dub") => {
    setAudioType(type);
    if (animeData) {
      loadEpisodes(animeData, type, selectedProvider);
    }
  };

  // Handle Provider switch
  const handleProviderChange = (provider: string) => {
    setSelectedProvider(provider);
    if (animeData) {
      loadEpisodes(animeData, audioType, provider);
    }
  };

  // 2. Fetch stream URL when an episode is selected
  useEffect(() => {
    if (!selectedEpisodeId || !anilistId || !selectedProvider) return;

    async function fetchServer() {
      try {
        setStreamUrl(null);
        setSubtitles([]);
        setLoading(true);
        setError(null);
        setHasAbsorbedClick(false);

        const anivexaUrl =
          process.env.NEXT_PUBLIC_ANIVEXA_URL || "http://localhost:4000";
        const res = await fetch(`${anivexaUrl}/${selectedEpisodeId}`);
        const streamData = await res.json();

        let allTracks = [];

        if (streamData.subtitles && Array.isArray(streamData.subtitles)) {
          const rawTracks = streamData.subtitles.map((sub: any) => ({
            src: `/api/subtitle/proxy?url=${encodeURIComponent(sub.url)}`,
            label: sub.lang || sub.label || sub.language || "Subtitle",
            kind: "subtitles",
            language: sub.lang || sub.srclang || "en",
            default: sub.default || false,
            type: "vtt",
          }));

          const labelCounts = new Map<string, number>();
          rawTracks.forEach((track: any) => {
            const baseLabel = track.label?.trim() || "Unknown";
            const lowerBase = baseLabel.toLowerCase();
            if (labelCounts.has(lowerBase)) {
              const count = labelCounts.get(lowerBase)! + 1;
              labelCounts.set(lowerBase, count);
              track.label = `${baseLabel} (${count})`;
            } else {
              labelCounts.set(lowerBase, 1);
              track.label = baseLabel;
            }
          });

          const workingTracks: any[] = [];
          await Promise.allSettled(
            rawTracks.map(async (track: any) => {
              try {
                const controller = new AbortController();
                const id = setTimeout(
                  () => controller.abort(new Error("Timeout checking subtitle")),
                  3000,
                );
                const res = await fetch(track.src, {
                  method: "HEAD",
                  signal: controller.signal,
                });
                clearTimeout(id);
                if (res.ok) workingTracks.push(track);
              } catch {
                // Ignore broken
              }
            }),
          );

          allTracks = workingTracks;
        }

        setSubtitles(allTracks);

        // Fetch VIP and Direct4K subtitles asynchronously in the background
        if (tmdbId) {
          const epNum =
            episodes.find((e) => e.id === selectedEpisodeId)?.number || 1;
          const routeType = type || "tv";

          Promise.allSettled([
            fetch(
              `/api/direct-aggregate?id=${tmdbId}&type=${routeType}&season=1&episode=${epNum}`,
            ).then((res) => res.json()),
            fetch(`/api/direct/${routeType}/${tmdbId}/1/${epNum}`).then((res) =>
              res.json(),
            ),
          ])
            .then((results) => {
              let combinedSubs: any[] = [];

              if (
                results[0].status === "fulfilled" &&
                results[0].value?.subtitles
              ) {
                combinedSubs = combinedSubs.concat(
                  results[0].value.subtitles.map((sub: any) => ({
                    src: sub.url,
                    label: sub.label,
                    kind: "subtitles",
                    language: sub.language || "en",
                    default: false,
                    type: "vtt",
                  })),
                );
              }

              if (
                results[1].status === "fulfilled" &&
                results[1].value?.subtitles
              ) {
                combinedSubs = combinedSubs.concat(
                  results[1].value.subtitles.map((sub: any) => ({
                    src: sub.url,
                    label: sub.label,
                    kind: "subtitles",
                    language: sub.language || "en",
                    default: false,
                    type: "vtt",
                  })),
                );
              }

              if (combinedSubs.length > 0) {
                Promise.allSettled(
                  combinedSubs.map(async (track: any) => {
                    try {
                      const controller = new AbortController();
                      const id = setTimeout(
                        () => controller.abort(new Error("Timeout checking subtitle")),
                        3000,
                      );
                      const res = await fetch(track.src, {
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
                  const workingCombinedSubs = checkResults
                    .filter((r) => r.status === "fulfilled" && r.value !== null)
                    .map((r: any) => r.value);

                  if (workingCombinedSubs.length > 0) {
                    setSubtitles((prev) => {
                      let combined = [...prev, ...workingCombinedSubs];

                      const labelCounts = new Map<string, number>();
                      combined.forEach((track) => {
                        const baseLabel = track.label?.trim() || "Unknown";
                        const lowerBase = baseLabel.toLowerCase();
                        if (labelCounts.has(lowerBase)) {
                          const count = labelCounts.get(lowerBase)! + 1;
                          labelCounts.set(lowerBase, count);
                          track.label = `${baseLabel} (${count})`;
                        } else {
                          labelCounts.set(lowerBase, 1);
                          track.label = baseLabel;
                        }
                      });

                      combined.sort((a, b) => {
                        const aIsCC = a.label?.toLowerCase().includes("cc");
                        const bIsCC = b.label?.toLowerCase().includes("cc");
                        if (aIsCC && !bIsCC) return -1;
                        if (!aIsCC && bIsCC) return 1;
                        return 0;
                      });

                      let hasSetDefault = false;
                      return combined.map((track) => {
                        const isEnglish =
                          track.label?.toLowerCase().includes("english") ||
                          track.language === "en";
                        if (isEnglish && !hasSetDefault) {
                          hasSetDefault = true;
                          return { ...track, default: true };
                        }
                        return { ...track, default: false };
                      });
                    });
                  }
                });
              }
            })
            .catch((e) =>
              console.error("Failed to fetch background subtitles", e),
            );
        }

        const directHls =
          streamData.stream_url ||
          streamData.streams?.find(
            (s: any) => s.type === "hls" || s.url?.includes(".m3u8"),
          )?.url;

        if (directHls) {
          const referer =
            streamData.headers?.Referer ||
            streamData.streams?.find((s: any) => s.url === directHls)?.referer ||
            "";
          const headers: Record<string, string> = {};
          if (referer) headers["Referer"] = referer;
          const proxiedUrl = `/api/stream/proxy.m3u8?url=${encodeURIComponent(
            directHls,
          )}&headers=${encodeURIComponent(JSON.stringify(headers))}`;

          setStreamUrl(proxiedUrl);
          setIsIframe(false);
        } else if (streamData.embeds && streamData.embeds.length > 0) {
          setStreamUrl(streamData.embeds[0].url);
          setIsIframe(true);
        } else if (
          streamData.streams &&
          streamData.streams.some((s: any) => s.type === "embed" || s.embedUrl)
        ) {
          const embedStream = streamData.streams.find(
            (s: any) => s.type === "embed" || s.embedUrl,
          );
          setStreamUrl(embedStream.embedUrl || embedStream.url);
          setIsIframe(true);
        } else {
          setError("No streaming source found.");
        }
      } catch (err: any) {
        setError(err.message || "Error fetching stream URL");
      } finally {
        setLoading(false);
      }
    }
    fetchServer();
  }, [selectedEpisodeId, anilistId, selectedProvider]);

  const sortedSubtitles = useMemo(() => {
    return [...subtitles].sort((a, b) => {
      const labelA = (a.label || "English").toLowerCase();
      const labelB = (b.label || "English").toLowerCase();
      const isEngA = labelA.includes("english") || labelA.includes("eng");
      const isEngB = labelB.includes("english") || labelB.includes("eng");

      if (isEngA && !isEngB) return -1;
      if (!isEngA && isEngB) return 1;
      return labelA.localeCompare(labelB);
    });
  }, [subtitles]);

  const tmdbEpisodesMap = useMemo(() => {
    return new Map(tmdbEpisodes.map((ep) => [ep.episode_number, ep]));
  }, [tmdbEpisodes]);

  const availableProviders = useMemo(() => {
    if (!animeData) return [];
    return Object.keys(animeData).filter(
      (key) => animeData[key]?.episodes?.[audioType]?.length > 0,
    );
  }, [animeData, audioType]);

  const selectedEpisode = episodes.find((e) => e.id === selectedEpisodeId);
  const activeBackdrop = tmdbBackdrop || animeBanner || animeCover;

  const filteredAndSortedEpisodes = useMemo(() => {
    let result = [...episodes];
    if (searchQuery.trim() !== "") {
      const q = searchQuery.toLowerCase();
      result = result.filter(
        (ep) =>
          (ep.title && ep.title.toLowerCase().includes(q)) ||
          ep.number?.toString().includes(q),
      );
    }
    result.sort((a, b) => {
      if (sortOrder === "asc") return (a.number || 0) - (b.number || 0);
      return (b.number || 0) - (a.number || 0);
    });
    return result;
  }, [episodes, searchQuery, sortOrder]);

  return (
    <div className="fixed inset-0 z-[999999] bg-neutral-950 text-white flex flex-col overflow-y-auto overflow-x-hidden selection:bg-amber-500 selection:text-black">
      {/* Background Ambient Backdrop */}
      {activeBackdrop && (
        <div className="fixed inset-0 w-full h-full -z-10 overflow-hidden pointer-events-none">
          <img
            src={activeBackdrop}
            alt=""
            className="w-full h-full object-cover blur-[100px] opacity-20 scale-110"
          />
          <div className="absolute inset-0 bg-gradient-to-b from-neutral-950/80 via-neutral-950/95 to-neutral-950" />
        </div>
      )}

      {/* Main Container */}
      <div className="w-full flex flex-col items-center px-3 sm:px-6 md:px-8 pt-4 pb-16 min-h-screen">
        <div className="w-full max-w-6xl">
          {/* Top Bar matching simple player */}
          <div className="flex items-center justify-between gap-3 mb-4">
            <div className="flex items-center gap-3 min-w-0">
              <button
                type="button"
                onClick={onClose}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-white/[0.06] hover:bg-white/[0.12] border border-white/10 text-neutral-300 hover:text-white text-xs font-semibold transition-all cursor-pointer shadow-sm shrink-0"
              >
                <ArrowLeft className="w-4 h-4" />
                <span>Back</span>
              </button>

              <div className="min-w-0">
                <h1 className="text-base sm:text-lg font-bold text-white tracking-tight truncate">
                  {animeTitle}
                  {selectedEpisode && (
                    <span className="text-amber-400 font-normal ml-2 text-sm">
                      · Episode {selectedEpisode.number}
                    </span>
                  )}
                </h1>
              </div>
            </div>

            {/* Top Right Controls: Sub/Dub, Provider, VIP Code Input, Close */}
            <div className="flex items-center gap-2 shrink-0">
              {/* Audio Type Selector */}
              <div className="flex items-center bg-white/[0.06] p-0.5 rounded-full border border-white/10">
                <button
                  type="button"
                  onClick={() => handleAudioToggle("sub")}
                  className={`px-2.5 py-0.5 sm:py-1 rounded-full text-xs font-bold transition-all ${
                    audioType === "sub"
                      ? "bg-amber-500 text-black shadow-sm"
                      : "text-neutral-400 hover:text-white"
                  }`}
                >
                  SUB
                </button>
                <button
                  type="button"
                  onClick={() => handleAudioToggle("dub")}
                  className={`px-2.5 py-0.5 sm:py-1 rounded-full text-xs font-bold transition-all ${
                    audioType === "dub"
                      ? "bg-amber-500 text-black shadow-sm"
                      : "text-neutral-400 hover:text-white"
                  }`}
                >
                  DUB
                </button>
              </div>

              {/* VIP Server Access Button */}
              {tmdbId && (
                <button
                  type="button"
                  onClick={() => setShowVipModal(true)}
                  className="inline-flex items-center gap-1 sm:gap-1.5 px-3 sm:px-3.5 py-1 sm:py-1.5 rounded-full text-[11px] sm:text-xs font-black uppercase tracking-wider bg-gradient-to-r from-amber-400 via-amber-500 to-amber-600 hover:from-amber-300 hover:to-amber-500 text-black shadow-[0_0_15px_rgba(245,158,11,0.35)] hover:shadow-[0_0_20px_rgba(245,158,11,0.5)] transition-all duration-200 cursor-pointer shrink-0"
                  title="Unlock VIP Player"
                >
                  <Sparkles className="w-3 h-3 sm:w-3.5 sm:h-3.5 text-black" />
                  <span>VIP</span>
                </button>
              )}

              {/* Close Button */}
              <button
                type="button"
                onClick={onClose}
                className="p-1.5 rounded-full bg-white/[0.06] hover:bg-red-500/20 hover:border-red-500/40 border border-white/10 text-neutral-400 hover:text-red-400 transition-all cursor-pointer shrink-0"
                title="Close"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          </div>

          {/* Video Player Box */}
          <div className="relative w-full aspect-video rounded-2xl md:rounded-3xl overflow-hidden bg-neutral-900/90 border border-white/10 shadow-2xl flex flex-col items-center justify-center">
            {loading ? (
              <div className="w-full h-full flex flex-col items-center justify-center bg-neutral-900/90 gap-3">
                <div className="w-12 h-12 rounded-full bg-white/5 border border-amber-500/40 backdrop-blur-md flex items-center justify-center shadow-[0_0_25px_rgba(245,158,11,0.3)] animate-pulse">
                  <div className="w-0 h-0 border-t-[6px] border-t-transparent border-b-[6px] border-b-transparent border-l-[10px] border-l-amber-400 ml-0.5" />
                </div>
                <span className="text-xs font-semibold tracking-wider uppercase text-neutral-400">
                  Preparing Anime Stream...
                </span>
              </div>
            ) : error ? (
              <div className="w-full h-full flex flex-col items-center justify-center bg-neutral-900/90 p-6 text-center gap-3">
                <p className="text-red-400 font-bold text-sm">{error}</p>
                <p className="text-xs text-neutral-400 max-w-md">
                  Try switching the audio type or provider below.
                </p>
              </div>
            ) : streamUrl ? (
              isIframe ? (
                <div key={`iframe-container-${streamUrl}`} className="relative w-full h-full">
                  {!hasAbsorbedClick && (
                    <div
                      className="absolute inset-0 z-50 cursor-pointer"
                      onClick={(e) => {
                        e.stopPropagation();
                        setHasAbsorbedClick(true);
                      }}
                      title="Click to play"
                    />
                  )}
                  <iframe
                    key={streamUrl}
                    src={streamUrl}
                    className="w-full h-full border-0 bg-black"
                    allowFullScreen
                    sandbox="allow-scripts allow-same-origin allow-presentation allow-forms"
                  />
                </div>
              ) : (
                <div key={`vidstack-container-${streamUrl}`} className="relative w-full h-full">
                  <VidstackPlayer
                    src={streamUrl}
                    tracks={sortedSubtitles}
                    autoPlay={true}
                    title={`${animeTitle} - ${selectedEpisode?.title || `Episode ${selectedEpisode?.number || 1}`}`}
                    className="w-full h-full"
                  />
                </div>
              )
            ) : null}
          </div>

          {/* Episode Selector - Exact Local Design */}
          {episodes.length > 0 && (
            <div className={styles.container}>
              {/* Header */}
              <div className={styles.header}>
                <div className={styles.headerTitleGroup}>
                  <h3 className={styles.title}>Episodes</h3>
                </div>

                {/* Provider Selector if multiple */}
                {availableProviders.length > 1 && (
                  <div className="flex items-center gap-1.5 overflow-x-auto max-w-full">
                    <span className="text-xs text-neutral-400 font-medium mr-1 shrink-0">
                      Server:
                    </span>
                    {availableProviders.map((p) => (
                      <button
                        key={p}
                        type="button"
                        onClick={() => handleProviderChange(p)}
                        className={`px-3 py-1 rounded-lg text-xs font-semibold uppercase transition-all shrink-0 ${
                          selectedProvider === p
                            ? "bg-amber-500 text-black shadow-[0_0_12px_rgba(245,158,11,0.3)]"
                            : "bg-white/5 text-neutral-400 hover:bg-white/10 hover:text-white border border-white/5"
                        }`}
                      >
                        {p}
                      </button>
                    ))}
                  </div>
                )}
              </div>

              {/* Filters Row: Search & Sort */}
              <div className={styles.filtersRow}>
                <div className={styles.searchBox}>
                  <Search size={16} className={styles.searchIcon} />
                  <input
                    type="text"
                    placeholder="Search episodes..."
                    className={styles.searchInput}
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                  />
                </div>

                <button
                  type="button"
                  className={styles.sortBtn}
                  onClick={() =>
                    setSortOrder((prev) => (prev === "asc" ? "desc" : "asc"))
                  }
                >
                  <svg
                    width="16"
                    height="16"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2"
                  >
                    <path d="m3 16 4 4 4-4" />
                    <path d="M7 20V4" />
                    <path d="m21 8-4-4-4 4" />
                    <path d="M17 4v16" />
                  </svg>
                  {sortOrder === "asc" ? "Oldest First" : "Newest First"}
                </button>
              </div>

              {/* Episode List Grid */}
              <div className={styles.episodeGrid}>
                {filteredAndSortedEpisodes.length === 0 ? (
                  <div className={styles.noEpisodesFound}>
                    No episodes found matching "{searchQuery}"
                  </div>
                ) : (
                  filteredAndSortedEpisodes.map((ep: any) => {
                    const isCurrent = selectedEpisodeId === ep.id;
                    const tmdbEp = tmdbEpisodesMap.get(ep.number);
                    const stillUrl =
                      ep.image ||
                      ep.thumbnail ||
                      (tmdbEp?.still_path
                        ? `https://image.tmdb.org/t/p/w780${tmdbEp.still_path}`
                        : null) ||
                      tmdbBackdrop ||
                      animeCover ||
                      "/fallback-backdrop.jpg";
                    const epName =
                      ep.title || tmdbEp?.name || `Episode ${ep.number}`;
                    const description =
                      ep.overview ||
                      tmdbEp?.overview?.trim() ||
                      "No episode description available.";

                    return (
                      <div
                        key={ep.id}
                        className={`${styles.episodeCard} ${
                          isCurrent ? styles.activeEpisodeCard : ""
                        }`}
                        onClick={() => setSelectedEpisodeId(ep.id)}
                      >
                        <div className={styles.thumbnailWrapper}>
                          <img
                            src={stillUrl}
                            alt={epName}
                            className={styles.thumbnail}
                            onError={(e) => {
                              const target = e.target as HTMLImageElement;
                              target.onerror = null;
                              target.src =
                                "https://images.unsplash.com/photo-1574375927938-d5a98e8ffe85?w=500&auto=format&fit=crop";
                            }}
                          />
                          <div className={styles.thumbnailGradient}></div>
                          <div className={styles.epBadge}>E{ep.number}</div>
                          <div className={styles.playOverlay}>
                            <svg
                              width="24"
                              height="24"
                              viewBox="0 0 24 24"
                              fill="currentColor"
                            >
                              <path d="M8 5v14l11-7z" />
                            </svg>
                          </div>
                          {isCurrent && (
                            <div className={styles.nowPlayingBadge}>
                              NOW PLAYING
                            </div>
                          )}
                        </div>

                        <div className={styles.episodeInfo}>
                          <div className={styles.episodeTitleRow}>
                            <h4 className={styles.episodeTitle}>
                              {ep.number}. {epName}
                            </h4>
                          </div>
                          <p className={styles.episodeOverview}>{description}</p>
                        </div>

                        <svg
                          className={styles.downloadIcon}
                          width="22"
                          height="22"
                          viewBox="0 0 24 24"
                          fill="none"
                          stroke="currentColor"
                          strokeWidth="2"
                        >
                          <path d="M12 3v12" />
                          <path d="m7 10 5 5 5-5" />
                          <path d="M5 21h14" />
                        </svg>
                      </div>
                    );
                  })
                )}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* VIP Passkey Modal */}
      {showVipModal && (
        <div 
          className="fixed inset-0 z-[999999] bg-black/80 backdrop-blur-md flex items-center justify-center p-4"
          onClick={() => {
            setShowVipModal(false);
            setVipError(null);
            setVipInputCode('');
          }}
        >
          <div 
            className="w-full max-w-sm bg-neutral-900 border border-amber-500/30 rounded-2xl p-6 shadow-[0_0_50px_rgba(245,158,11,0.25)] flex flex-col items-center text-center relative"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="w-12 h-12 rounded-full bg-amber-500/10 border border-amber-500/30 flex items-center justify-center text-amber-400 mb-3 shadow-[0_0_15px_rgba(245,158,11,0.2)]">
              <Sparkles className="w-6 h-6" />
            </div>

            <h3 className="text-lg font-bold text-white mb-1">Enter VIP Code</h3>
            <p className="text-xs text-neutral-400 mb-4">
              Enter <span className="text-amber-400 font-bold font-mono px-1.5 py-0.5 bg-amber-500/10 rounded border border-amber-500/20">123</span> to unlock premium VIP servers.
            </p>

            <form
              onSubmit={(e) => {
                e.preventDefault();
                if (vipInputCode.trim() === '123') {
                  sessionStorage.setItem('vip_auth', '123');
                  setShowVipModal(false);
                  router.push(
                    `/watch/servers/${tmdbId}?type=${type || 'tv'}&season=1&episode=${selectedEpisode?.number || 1}`
                  );
                } else {
                  setVipError('Invalid VIP Code. Please enter 123.');
                }
              }}
              className="w-full flex flex-col gap-3"
            >
              <input
                type="text"
                placeholder="Enter 123"
                value={vipInputCode}
                onChange={(e) => {
                  setVipInputCode(e.target.value);
                  setVipError(null);
                }}
                className="w-full bg-black/80 border border-white/15 focus:border-amber-400 rounded-xl px-4 py-2.5 text-center text-white font-mono tracking-widest text-base focus:outline-none transition-all shadow-inner"
                autoFocus
              />

              {vipError && (
                <p className="text-xs text-red-400 font-semibold">{vipError}</p>
              )}

              <div className="flex items-center gap-2 w-full mt-1">
                <button
                  type="button"
                  onClick={() => {
                    setShowVipModal(false);
                    setVipError(null);
                    setVipInputCode('');
                  }}
                  className="flex-1 py-2 rounded-xl bg-white/5 hover:bg-white/10 text-neutral-300 text-xs font-semibold transition-all cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="flex-1 py-2 rounded-xl bg-gradient-to-r from-amber-400 to-amber-600 hover:from-amber-300 hover:to-amber-500 text-black text-xs font-bold transition-all shadow-md cursor-pointer"
                >
                  Unlock
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
