"use client";

import React, { useState, useEffect, useMemo, useRef } from "react";
import { X, ArrowLeft, Loader, Search, Sparkles, ChevronDown, Layers, Film } from "lucide-react";
import { useRouter } from "next/navigation";
import VidstackPlayer, { VidstackTrack } from "./VidstackPlayer";
import { installAdblockProtection } from "../utils/adblockFramework";
import { clearMediaSession, suppressMediaSession } from "../utils/mediaSessionManager";
import { getKnownAnimeArcs } from "../utils/animeArcs";
import { getSavedProgress, updateWatchProgress } from "../utils/userStorage";
import styles from "./SeasonEpisodeSelector/SeasonEpisodeSelector.module.css";

interface PlayeranimeProps {
  animeTitle: string;
  tmdbId?: string | number;
  type?: "tv" | "movie";
  onClose: () => void;
}

interface AnimeGroup {
  id: string;
  name: string;
  shortName: string;
  seasonNumber?: number;
  startEp: number;
  endEp: number;
  count: number;
  episodes: any[];
  tmdbSeason?: any;
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
  const [tmdbSeasons, setTmdbSeasons] = useState<any[]>([]);
  const [tmdbEpisodesBySeason, setTmdbEpisodesBySeason] = useState<Record<number, any[]>>({});

  const [episodes, setEpisodes] = useState<any[]>([]);
  const [selectedProvider, setSelectedProvider] = useState<string | null>(null);
  const [selectedEpisodeId, setSelectedEpisodeId] = useState<string | null>(null);

  const [selectedGroupId, setSelectedGroupId] = useState<string>("");
  const [selectedSubBatch, setSelectedSubBatch] = useState<string>("all");
  const [isSeasonDropdownOpen, setIsSeasonDropdownOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

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

  // Movie runtime & duration mismatch detection
  const [expectedRuntime, setExpectedRuntime] = useState<number | null>(null);
  const [streamDuration, setStreamDuration] = useState<number | null>(null);
  const [isMismatchDismissed, setIsMismatchDismissed] = useState<boolean>(false);

  // Source selector
  type AnimeSource = "anivexa" | "hianime" | "aniwatch";
  const [activeSource, setActiveSource] = useState<AnimeSource>("anivexa");
  const [activeHianimeServer, setActiveHianimeServer] = useState<string>("hd-1");

  // Read saved anime layer preferences & target episode from URL or continueWatching
  const targetEpisodeIdRef = useRef<string | null>(null);
  const targetEpisodeNumRef = useRef<number | null>(null);

  useEffect(() => {
    if (typeof window === "undefined") return;
    try {
      const urlParams = new URLSearchParams(window.location.search);
      const paramEpId = urlParams.get("epId");
      const paramEp = urlParams.get("ep") || urlParams.get("episode");

      if (paramEpId) targetEpisodeIdRef.current = paramEpId;
      if (paramEp) targetEpisodeNumRef.current = parseInt(paramEp, 10);

      const stored = localStorage.getItem("continueWatching");
      if (stored) {
        const list = JSON.parse(stored);
        const match = Array.isArray(list) && list.find((m: any) =>
          (tmdbId && String(m.id) === String(tmdbId)) ||
          (m.title && m.title.toLowerCase() === animeTitle.toLowerCase())
        );

        if (match) {
          if (!paramEpId && match.episodeId) targetEpisodeIdRef.current = match.episodeId;
          if (!paramEp && (match.episode || match.last_episode)) {
            targetEpisodeNumRef.current = match.episode || match.last_episode;
          }
          if (match.audioType === "dub" || match.audioType === "sub") {
            setAudioType(match.audioType);
          }
          if (match.animeSource && (match.animeSource === "anivexa" || match.animeSource === "hianime" || match.animeSource === "aniwatch")) {
            setActiveSource(match.animeSource);
          }
        }
      }
    } catch {}
  }, [tmdbId, animeTitle]);

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

  useEffect(() => {
    suppressMediaSession();
    clearMediaSession();
    return () => {
      clearMediaSession();
    };
  }, []);

  // Click outside to close season dropdown
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (
        dropdownRef.current &&
        !dropdownRef.current.contains(event.target as Node)
      ) {
        setIsSeasonDropdownOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  // Initialize Adblock framework to protect against un-sandboxed iframe ads
  useEffect(() => {
    if (isIframe) {
      const cleanup = installAdblockProtection(true, (action, target) => {
        console.log(`[Playeranime] Adblock intercepted: ${action}`, target);
      });
      return () => cleanup();
    }
  }, [isIframe]);

  // Fetch TMDB backdrop, seasons list, and runtime if tmdbId is present
  useEffect(() => {
    if (!tmdbId) return;
    const endpoint = type === "movie" ? `/api/movies/${tmdbId}` : `/api/tv/${tmdbId}`;
    fetch(endpoint)
      .then((res) => (res.ok ? res.json() : null))
      .then((data) => {
        if (data && data.backdrop_path) {
          setTmdbBackdrop(`https://image.tmdb.org/t/p/original${data.backdrop_path}`);
        }
        if (data && typeof data.runtime === "number" && data.runtime > 0) {
          setExpectedRuntime(data.runtime);
        }
        if (data && data.seasons && Array.isArray(data.seasons)) {
          const valid = data.seasons.filter((s: any) => s.season_number > 0 && s.episode_count > 0);
          setTmdbSeasons(valid.length > 0 ? valid : data.seasons);
        }
      })
      .catch(() => {});
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
    let foundEpisodes: any[] = [];
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

      // Match target episode if user was resuming a specific episode
      let initialEp = null;
      if (targetEpisodeIdRef.current) {
        initialEp = foundEpisodes.find((e) => e.id === targetEpisodeIdRef.current);
      }
      if (!initialEp && targetEpisodeNumRef.current) {
        initialEp = foundEpisodes.find((e) => Number(e.number) === targetEpisodeNumRef.current);
      }
      if (!initialEp) {
        initialEp = foundEpisodes[0];
      }

      setSelectedEpisodeId(initialEp.id);
      setSelectedGroupId("");
      setSelectedSubBatch("all");
      prevEpisodeIdRef.current = initialEp.id;
      setError(null);
    } else {
      setEpisodes([]);
      setError(`No ${audio} episodes found.`);
    }
  };

  // 1. Search anime by title via internal secure API route
  useEffect(() => {
    async function init() {
      try {
        setLoading(true);
        setError(null);

        const searchRes = await fetchWithTimeout(
          `/api/anime-api/search-info?search=${encodeURIComponent(animeTitle)}`
        );
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

        const epRes = await fetchWithTimeout(
          `/api/anime-api/episodes-info/${mediaId}`
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

  // Build Season & Arc Groups
  const groups = useMemo<AnimeGroup[]>(() => {
    if (type === "movie") return [];

    const sorted = episodes && Array.isArray(episodes)
      ? [...episodes].sort((a, b) => (a.number || 0) - (b.number || 0))
      : [];

    // 1. Check if known anime arcs exist for this title (e.g. One Piece, Naruto, Bleach, Hunter x Hunter, Demon Slayer, etc.)
    const knownArcs = getKnownAnimeArcs(animeTitle);
    if (knownArcs && knownArcs.length > 0 && sorted.length > 0) {
      const arcGroups: AnimeGroup[] = [];
      for (let i = 0; i < knownArcs.length; i++) {
        const arc = knownArcs[i];
        const matched = sorted.filter((ep) => {
          const num =
            typeof ep.number === "number"
              ? ep.number
              : parseInt(String(ep.number || "").replace(/\D+/g, ""), 10);
          return !isNaN(num) && num >= arc.startEp && num <= arc.endEp;
        });

        if (matched.length > 0) {
          const displayName = arc.seasonNumber
            ? `Season ${arc.seasonNumber}: ${arc.name}`
            : arc.name;

          arcGroups.push({
            id: `arc-${i + 1}`,
            name: displayName,
            shortName: arc.shortName || arc.name,
            seasonNumber: arc.seasonNumber || i + 1,
            startEp: arc.startEp,
            endEp: arc.endEp,
            count: matched.length,
            episodes: matched,
          });
        }
      }

      if (arcGroups.length > 0) {
        return arcGroups;
      }
    }

    // 2. If TMDB provides seasons data (Show ALL available seasons)
    const validTmdbSeasons = tmdbSeasons.filter(
      (s) => s.season_number > 0 && (s.episode_count > 0 || (tmdbEpisodesBySeason[s.season_number]?.length || 0) > 0),
    );

    if (validTmdbSeasons.length > 0) {
      let currentStart = 1;
      const seasonList: AnimeGroup[] = [];

      for (const s of validTmdbSeasons) {
        const count = tmdbEpisodesBySeason[s.season_number]?.length || s.episode_count || 12;
        const start = currentStart;
        const end = currentStart + count - 1;
        currentStart = end + 1;

        // Match episodes that fall within this cumulative range
        let matched = sorted.filter((ep) => {
          const num =
            typeof ep.number === "number"
              ? ep.number
              : parseInt(String(ep.number || "").replace(/\D+/g, ""), 10);
          return !isNaN(num) && num >= start && num <= end;
        });

        let sliceEps =
          matched.length > 0 ? matched : sorted.slice(start - 1, end);

        // If no provider episodes mapped yet, build structured episodes from TMDB
        if (sliceEps.length === 0 && count > 0) {
          const seasonTmdbEps = tmdbEpisodesBySeason[s.season_number] || [];
          sliceEps = Array.from({ length: count }, (_, idx) => {
            const epNum = idx + 1;
            const tmdbEp = seasonTmdbEps[idx];
            return {
              id: `season-${s.season_number}-ep-${epNum}`,
              number: epNum,
              globalNumber: start + idx,
              title: tmdbEp?.name || `Episode ${epNum}`,
              image: tmdbEp?.still_path ? `https://image.tmdb.org/t/p/w780${tmdbEp.still_path}` : undefined,
              overview: tmdbEp?.overview || "",
            };
          });
        }

        if (sliceEps.length > 0) {
          const hasArcName =
            s.name &&
            !s.name.toLowerCase().startsWith(`season ${s.season_number}`) &&
            s.name.toLowerCase() !== `season ${s.season_number}`;

          const displayName = hasArcName
            ? `Season ${s.season_number}: ${s.name}`
            : (s.name || `Season ${s.season_number}`);

          const shortLabel = hasArcName
            ? (s.name.length <= 16 ? s.name : `S${s.season_number}: ${s.name}`)
            : `Season ${s.season_number}`;

          seasonList.push({
            id: `season-${s.season_number}`,
            name: displayName,
            shortName: shortLabel,
            seasonNumber: s.season_number,
            startEp: start,
            endEp: end,
            count: sliceEps.length,
            episodes: sliceEps,
            tmdbSeason: s,
          });
        }
      }

      // Check for remaining episodes beyond known TMDB seasons
      const maxSeasonEnd = validTmdbSeasons.reduce(
        (acc, s) => acc + (s.episode_count || 0),
        0,
      );
      const extraEps = sorted.filter((ep) => {
        const num =
          typeof ep.number === "number"
            ? ep.number
            : parseInt(String(ep.number || "").replace(/\D+/g, ""), 10);
        return !isNaN(num) && num > maxSeasonEnd;
      });

      if (extraEps.length > 0) {
        const nextSeasonNum = validTmdbSeasons.length + 1;
        const extraStart = maxSeasonEnd + 1;
        const extraEnd = extraEps[extraEps.length - 1]?.number || (extraStart + extraEps.length - 1);
        seasonList.push({
          id: `season-${nextSeasonNum}`,
          name: `Season ${nextSeasonNum} (Episodes ${extraStart} - ${extraEnd})`,
          shortName: `Season ${nextSeasonNum}`,
          seasonNumber: nextSeasonNum,
          startEp: extraStart,
          endEp: extraEnd,
          count: extraEps.length,
          episodes: extraEps,
        });
      }

      if (seasonList.length > 0) {
        return seasonList;
      }
    }

    // 3. Fallback if no TMDB seasons & <= 25 episodes:
    if (sorted.length <= 25 && sorted.length > 0) {
      return [
        {
          id: "season-1",
          name: `Season 1 (Episodes 1 - ${sorted.length})`,
          shortName: "Season 1",
          seasonNumber: 1,
          startEp: 1,
          endEp: sorted.length,
          count: sorted.length,
          episodes: sorted,
        },
      ];
    }

    // 4. Fallback partition into Arc / Batch chunks (25 or 50 episodes per arc)
    const batchSize = sorted.length > 200 ? 50 : 25;
    const batchGroups: AnimeGroup[] = [];
    let chunkIndex = 1;

    for (let i = 0; i < sorted.length; i += batchSize) {
      const chunk = sorted.slice(i, i + batchSize);
      const firstEp = chunk[0]?.number || (i + 1);
      const lastEp = chunk[chunk.length - 1]?.number || (i + chunk.length);

      batchGroups.push({
        id: `arc-${chunkIndex}`,
        name: `Arc ${chunkIndex} (Episodes ${firstEp} - ${lastEp})`,
        shortName: `Arc ${chunkIndex} (${firstEp}-${lastEp})`,
        seasonNumber: chunkIndex,
        startEp: firstEp,
        endEp: lastEp,
        count: chunk.length,
        episodes: chunk,
      });
      chunkIndex++;
    }

    return batchGroups;
  }, [episodes, tmdbSeasons, tmdbEpisodesBySeason, animeTitle, type]);

  // Active Group Resolution
  const activeGroup = useMemo(() => {
    if (!groups || groups.length === 0) return null;
    const found = groups.find((g) => g.id === selectedGroupId);
    return found || groups[0];
  }, [groups, selectedGroupId]);

  const prevEpisodeIdRef = useRef<string | null>(null);

  // Initial group selection and syncing with active episode
  useEffect(() => {
    if (groups.length === 0) return;
    if (!selectedGroupId) {
      if (selectedEpisodeId) {
        const match = groups.find((g) =>
          g.episodes.some((e) => e.id === selectedEpisodeId),
        );
        if (match) {
          setSelectedGroupId(match.id);
          prevEpisodeIdRef.current = selectedEpisodeId;
          return;
        }
      }
      setSelectedGroupId(groups[0].id);
    }
  }, [groups, selectedGroupId, selectedEpisodeId]);

  // When selected episode genuinely changes, sync active group to match the episode's season
  useEffect(() => {
    if (selectedEpisodeId && groups.length > 0) {
      if (prevEpisodeIdRef.current !== selectedEpisodeId) {
        prevEpisodeIdRef.current = selectedEpisodeId;
        const match = groups.find((g) =>
          g.episodes.some((e) => e.id === selectedEpisodeId),
        );
        if (match && match.id !== selectedGroupId) {
          setSelectedGroupId(match.id);
        }
      }
    }
  }, [selectedEpisodeId, groups, selectedGroupId]);

  // Sub-batch ranges for large seasons (e.g. > 30 episodes)
  const subBatches = useMemo(() => {
    if (!activeGroup || activeGroup.episodes.length <= 30) return [];
    const batchSize = 25;
    const list: { id: string; label: string; start: number; end: number; episodes: any[] }[] = [];
    const eps = activeGroup.episodes;
    for (let i = 0; i < eps.length; i += batchSize) {
      const chunk = eps.slice(i, i + batchSize);
      const firstEp = chunk[0]?.number || (i + 1);
      const lastEp = chunk[chunk.length - 1]?.number || (i + chunk.length);
      list.push({
        id: `${firstEp}-${lastEp}`,
        label: `${firstEp} - ${lastEp}`,
        start: firstEp,
        end: lastEp,
        episodes: chunk,
      });
    }
    return list;
  }, [activeGroup]);

  // Fetch TMDB season episodes metadata when active season changes
  useEffect(() => {
    if (!tmdbId || type !== "tv" || !activeGroup?.seasonNumber) return;
    const sNum = activeGroup.seasonNumber;
    if (tmdbEpisodesBySeason[sNum]) return;

    fetch(`/api/tv/${tmdbId}/season/${sNum}`)
      .then((res) => (res.ok ? res.json() : null))
      .then((data) => {
        if (data && data.episodes && Array.isArray(data.episodes)) {
          setTmdbEpisodesBySeason((prev) => ({
            ...prev,
            [sNum]: data.episodes,
          }));
        }
      })
      .catch(() => {});
  }, [tmdbId, type, activeGroup?.seasonNumber, tmdbEpisodesBySeason]);

  // Fetch anime provider episodes for active season if needed
  useEffect(() => {
    if (!activeGroup || !animeTitle || activeGroup.seasonNumber === 1) return;
    const sNum = activeGroup.seasonNumber;
    const hasRealProviderEps = activeGroup.episodes.some(
      (e) => !e.id?.startsWith("season-") && !e.id?.startsWith("tmdb-"),
    );
    if (hasRealProviderEps) return;

    const seasonSearch =
      activeGroup.tmdbSeason?.name &&
      !activeGroup.tmdbSeason.name.toLowerCase().startsWith("season")
        ? `${animeTitle} ${activeGroup.tmdbSeason.name}`
        : `${animeTitle} Season ${sNum}`;

    fetch(`/api/anime-api/search-info?search=${encodeURIComponent(seasonSearch)}`)
      .then((res) => (res.ok ? res.json() : null))
      .then(async (data) => {
        const seasonMediaId = data?.data?.Media?.id;
        if (seasonMediaId && seasonMediaId !== anilistId) {
          const epRes = await fetch(`/api/anime-api/episodes-info/${seasonMediaId}`);
          if (epRes.ok) {
            const epData = await epRes.json();
            const providerKey = selectedProvider || "anikoto";
            const seasonAudioEps = epData[providerKey]?.episodes?.[audioType] || [];
            if (seasonAudioEps.length > 0) {
              setEpisodes((prev) => {
                const combined = [...prev, ...seasonAudioEps];
                const seen = new Set<string>();
                return combined.filter((e) => {
                  if (seen.has(e.id)) return false;
                  seen.add(e.id);
                  return true;
                });
              });
            }
          }
        }
      })
      .catch(() => {});
  }, [activeGroup?.seasonNumber, animeTitle, selectedProvider, audioType, anilistId]);

  // 2. Fetch stream URL when an episode is selected
  useEffect(() => {
    if (!selectedEpisodeId || (!anilistId && !tmdbId && !animeTitle)) return;

    async function fetchServer() {
      try {
        setStreamUrl(null);
        setSubtitles([]);
        setStreamDuration(null);
        setIsMismatchDismissed(false);
        setLoading(true);
        setError(null);

        // HiAnime / Aniwatch direct stream resolution
        if (activeSource === "hianime" || activeSource === "aniwatch") {
          const currentEp =
            activeGroup?.episodes?.find((e: any) => e.id === selectedEpisodeId) ||
            episodes.find((e) => e.id === selectedEpisodeId);
          let epNum = 1;
          if (currentEp) {
            if (typeof currentEp.number === "number") {
              epNum = currentEp.number;
            } else {
              const parsed = parseInt(String(currentEp.number || currentEp.title || currentEp.id).replace(/\D+/g, ""), 10);
              if (!isNaN(parsed) && parsed > 0) epNum = parsed;
            }
          }

          const seasonNum = activeGroup?.seasonNumber || 1;
          const relativeEpNum =
            activeGroup && currentEp?.number && typeof currentEp.number === "number" && activeGroup.startEp
              ? currentEp.number - activeGroup.startEp + 1
              : epNum;
          const targetEpForQuery = (relativeEpNum > 0 && relativeEpNum <= (activeGroup?.count || 999)) ? relativeEpNum : epNum;

          const endpointBase = activeSource === "hianime" ? "/api/hianime" : "/api/aniwatch";
          const searchQueries = [
            seasonNum > 1 ? `${animeTitle} Season ${seasonNum}` : animeTitle,
            seasonNum > 1 ? `${animeTitle} ${seasonNum}` : animeTitle,
            animeTitle,
          ];

          try {
            let targetAnime: any = null;
            let epsList: any[] = [];

            for (const q of searchQueries) {
              try {
                const searchRes = await fetch(`${endpointBase}/anime/search?q=${encodeURIComponent(q)}`);
                if (searchRes.ok) {
                  const searchData = await searchRes.json();
                  const animes = searchData.data?.animes || [];
                  if (animes.length > 0) {
                    targetAnime = animes.find((a: any) => {
                      const an = (a.name || "").toLowerCase();
                      if (seasonNum > 1) {
                        return an.includes(`season ${seasonNum}`) || an.includes(` ${seasonNum}`) || an.includes(`part ${seasonNum}`) || an.includes(`s${seasonNum}`);
                      }
                      return true;
                    }) || animes[0];

                    if (targetAnime) {
                      const epsRes = await fetch(`${endpointBase}/anime/${targetAnime.id}/episodes`);
                      if (epsRes.ok) {
                        const epsData = await epsRes.json();
                        const list = epsData.data?.episodes || [];
                        if (list.length > 0) {
                          epsList = list;
                          break;
                        }
                      }
                    }
                  }
                }
              } catch {}
            }

            if (epsList.length > 0) {
              const matchedEp =
                epsList.find((e: any) => Number(e.number) === targetEpForQuery) ||
                epsList.find((e: any) => Number(e.number) === epNum) ||
                epsList[0];

              if (matchedEp) {
                const srcRes = await fetch(`${endpointBase}/episode/sources?animeEpisodeId=${matchedEp.episodeId}&server=${activeHianimeServer}&category=${audioType}`);
                if (srcRes.ok) {
                  const srcData = await srcRes.json();
                  const sources = srcData.data?.sources || [];
                  const tracks = srcData.data?.tracks || [];
                  if (sources.length > 0 && sources[0].url) {
                    const isHls = sources[0].url.includes(".m3u8");
                    const proxied = isHls
                      ? `/api/stream/proxy.m3u8?url=${encodeURIComponent(sources[0].url)}&headers=${encodeURIComponent(JSON.stringify({ Referer: 'https://megacloud.tv/' }))}&manifest=1`
                      : `/api/stream/proxy.mp4?url=${encodeURIComponent(sources[0].url)}&headers=${encodeURIComponent(JSON.stringify({ Referer: 'https://megacloud.tv/' }))}`;
                    setStreamUrl(proxied);
                    setIsIframe(false);

                    if (tracks.length > 0) {
                      const mappedTracks = tracks
                        .filter((t: any) => t && t.file && t.kind !== "thumbnails")
                        .map((t: any) => {
                          const isEng =
                            (t.label || "").toLowerCase().includes("english") ||
                            (t.label || "").toLowerCase().includes("eng") ||
                            t.default === true;
                          return {
                            src: t.file?.startsWith("http")
                              ? `/api/subtitle/proxy?url=${encodeURIComponent(t.file)}`
                              : t.file,
                            label: t.label || "English",
                            kind: "subtitles",
                            language: isEng ? "en" : (t.lang || "en"),
                            default: t.default ?? isEng,
                            type: "vtt",
                          };
                        });
                      if (mappedTracks.length > 0) {
                        setSubtitles(mappedTracks);
                      }
                    }
                    setLoading(false);
                    return;
                  }
                }
              }
            }
          } catch (err: any) {
            console.warn(`[Playeranime] ${activeSource} stream error:`, err);
          }
        }

        // 0. Extract stream and native subtitles from anime provider (Anivexa / Server 1)
        let streamData: any = null;
        if (selectedEpisodeId && !selectedEpisodeId.startsWith("season-") && !selectedEpisodeId.startsWith("tmdb-")) {
          // Attempt 1: Fetch currently selected episode
          try {
            const res = await fetch(
              `/api/anime-api/stream-info/${encodeURIComponent(selectedEpisodeId || "")}`
            );
            if (res.ok) {
              const parsed = await res.json();
              if (parsed?.stream_url || parsed?.stream || parsed?.sources?.length || parsed?.streams?.length || parsed?.embeds?.length) {
                streamData = parsed;
              }
            }
          } catch {}

          // Attempt 2: Auto-fallback across other providers in animeData if primary provider stream failed
          if (!streamData && animeData) {
            const currentEp =
              activeGroup?.episodes?.find((e: any) => e.id === selectedEpisodeId) ||
              episodes.find((e) => e.id === selectedEpisodeId);
            const epNum = currentEp?.number;
            if (epNum) {
              const priorityProviders = ["anikoto", "reanime", "mkissa", "animegg", "2dhive", "kaa"];
              for (const p of priorityProviders) {
                const altEps = animeData[p]?.episodes?.[audioType];
                if (altEps && Array.isArray(altEps)) {
                  const altEp = altEps.find((e: any) => e.number === epNum);
                  if (altEp && altEp.id && altEp.id !== selectedEpisodeId) {
                    try {
                      const altRes = await fetch(
                        `/api/anime-api/stream-info/${encodeURIComponent(altEp.id)}`
                      );
                      if (altRes.ok) {
                        const altParsed = await altRes.json();
                        if (altParsed?.stream_url || altParsed?.stream || altParsed?.sources?.length || altParsed?.streams?.length || altParsed?.embeds?.length) {
                          streamData = altParsed;
                          break;
                        }
                      }
                    } catch {}
                  }
                }
              }
            }
          }
        }

        const nativeSubs: any[] = [];
        if (streamData) {
          const rawNativeSubs = [
            ...(streamData.subtitles || []),
            ...(streamData.tracks || []),
            ...(streamData.captions || []),
          ];
          if (streamData.streams && Array.isArray(streamData.streams)) {
            for (const s of streamData.streams) {
              if (s.subtitles && Array.isArray(s.subtitles)) {
                rawNativeSubs.push(...s.subtitles);
              }
            }
          }
          const streamReferer =
            streamData.headers?.Referer ||
            streamData.streams?.find((s: any) => s.referer)?.referer ||
            "https://megaplay.buzz/";
          for (const sub of rawNativeSubs) {
            const rawSrc = sub.url || sub.file || sub.src;
            if (!rawSrc) continue;
            const finalSrc = rawSrc.startsWith("/api/subtitle/proxy")
              ? rawSrc
              : `/api/subtitle/proxy?url=${encodeURIComponent(rawSrc)}&referer=${encodeURIComponent(streamReferer)}`;
            const label = (sub.label || sub.name || "English").trim();
            const lowerLabel = label.toLowerCase();
            const isNonEnglishLabel =
              lowerLabel.includes("arabic") ||
              lowerLabel.includes("italian") ||
              lowerLabel.includes("russian") ||
              lowerLabel.includes("french") ||
              lowerLabel.includes("german") ||
              lowerLabel.includes("spanish") ||
              lowerLabel.includes("portuguese") ||
              lowerLabel.includes("japanese") ||
              lowerLabel.includes("chinese") ||
              lowerLabel.includes("korean");

            const isEnglish =
              !isNonEnglishLabel &&
              (lowerLabel.includes("english") ||
                lowerLabel.includes("eng") ||
                sub.srclang === "en" ||
                sub.language === "en");

            if (!isEnglish) continue;
            nativeSubs.push({
              src: finalSrc,
              label: label,
              kind: "subtitles",
              language: "en",
              default: sub.default ?? isEnglish,
              type: rawSrc.toLowerCase().includes(".srt") ? "srt" : "vtt",
            });
          }
        }

        if (nativeSubs.length > 0) {
          setSubtitles(nativeSubs);
        } else {
          setSubtitles([]);
        }

        const directHls =
          streamData?.stream_url ||
          streamData?.stream ||
          streamData?.sources?.[0]?.url ||
          streamData?.streams?.find(
            (s: any) => s.type === "hls" || s.url?.includes(".m3u8"),
          )?.url;

        if (directHls) {
          const referer =
            streamData?.headers?.Referer ||
            streamData?.streams?.find((s: any) => s.url === directHls)?.referer ||
            "https://megaplay.buzz/";
          const headers: Record<string, string> = {};
          if (referer) headers["Referer"] = referer;
          const proxiedUrl = `/api/stream/proxy.m3u8?url=${encodeURIComponent(
            directHls,
          )}&headers=${encodeURIComponent(JSON.stringify(headers))}`;

          setStreamUrl(proxiedUrl);
          setIsIframe(false);
        } else if (streamData?.embeds && streamData.embeds.length > 0) {
          setStreamUrl(streamData.embeds[0].url);
          setIsIframe(true);
        } else if (
          streamData?.streams &&
          streamData.streams.some((s: any) => s.type === "embed" || s.embedUrl)
        ) {
          const embedStream = streamData.streams.find(
            (s: any) => s.type === "embed" || s.embedUrl,
          );
          setStreamUrl(embedStream.embedUrl || embedStream.url);
          setIsIframe(true);
        } else if (tmdbId) {
          // Robust direct aggregate fallback for next seasons & missing streams
          try {
            const currentEp =
              activeGroup?.episodes?.find((e: any) => e.id === selectedEpisodeId) ||
              episodes.find((e) => e.id === selectedEpisodeId);
            const epNum = currentEp?.number || 1;
            const currentSeasonNum = activeGroup?.seasonNumber || 1;
            const routeType = type === "movie" ? "movie" : "tv";
            const aggRes = await fetch(
              `/api/direct-aggregate?id=${tmdbId}&type=${routeType}&season=${currentSeasonNum}&episode=${epNum}&vip=true`
            );
            if (aggRes.ok) {
              const aggData = await aggRes.json();
              if (aggData && aggData.defaultStreamUrl) {
                setStreamUrl(aggData.defaultStreamUrl);
                setIsIframe(false);
                if (aggData.subtitles && Array.isArray(aggData.subtitles) && aggData.subtitles.length > 0) {
                  const dSubs = aggData.subtitles.map((s: any) => ({
                    src: s.url,
                    label: s.label || 'English',
                    kind: 'subtitles',
                    language: s.language || 'en',
                    default: s.isDefault ?? true,
                    type: 'vtt',
                  }));
                  setSubtitles(dSubs);
                }
                return;
              }
            }
          } catch {}
          setError("No streaming source found. Try switching to Server 2 or Server 3.");
        } else {
          setError("No streaming source found. Try switching to Server 2 or Server 3.");
        }
      } catch (err: any) {
        setError(err.message || "Error fetching stream URL");
      } finally {
        setLoading(false);
      }
    }
    fetchServer();
  }, [selectedEpisodeId, anilistId, selectedProvider, activeSource, audioType, episodes, activeGroup, tmdbId, type, animeTitle]);

  const vidstackTracks = useMemo<VidstackTrack[]>(() => {
    const seenSrcs = new Set<string>();
    const seenLabels = new Map<string, number>();
    const tracksList: VidstackTrack[] = [];

    for (const track of subtitles) {
      if (!track?.src) continue;

      let rawLabel = (track.label || "English").trim();
      const lower = rawLabel.toLowerCase();
      const langLower = (track.language || "").toLowerCase();
      const isNonEng =
        lower.includes("arabic") ||
        lower.includes("italian") ||
        lower.includes("russian") ||
        lower.includes("french") ||
        lower.includes("german") ||
        lower.includes("spanish") ||
        lower.includes("portuguese") ||
        lower.includes("japanese") ||
        lower.includes("chinese") ||
        lower.includes("korean");

      const isEng =
        !isNonEng &&
        (lower.includes("english") ||
          lower.includes("eng") ||
          langLower === "en" ||
          langLower.startsWith("en-") ||
          langLower === "eng");

      if (!isEng) continue; // Keep only English subtitles

      if (seenSrcs.has(track.src)) continue;
      seenSrcs.add(track.src);

      // Clean ugly file extension and dash patterns like (- Black Clover - 101.en)
      rawLabel = rawLabel
        .replace(/\s*\(\s*-\s*[^)]+\)$/, (match: string) => {
          const inner = match.replace(/^[(-.\s]+|[)-.\s]+$/g, "");
          if (/netflix|crunchyroll|horriblesubs|funimation|hidive|full|original/i.test(inner)) {
            return ` (${inner})`;
          }
          return "";
        })
        .replace(/\.srt|\.vtt|\.ass/gi, "")
        .trim();

      if (!rawLabel) rawLabel = "English";

      const count = seenLabels.get(lower) || 0;
      seenLabels.set(lower, count + 1);

      const label = count === 0 ? rawLabel : `${rawLabel} (${count + 1})`;

      tracksList.push({
        src: track.src,
        label,
        language: track.language || (isEng ? "en" : "en"),
        kind: "subtitles",
        default: track.default ?? false,
        type: "vtt",
      });
    }

    function getSubtitlePriority(label: string): number {
      const l = (label || "").toLowerCase();
      if (l.includes("signs") || l.includes("songs") || l.includes("episode name")) return -10;
      if (l.includes("aniwatch") || l.includes("hianime") || l.includes("megacloud") || l.includes("rapidcloud")) return 120;
      if (l.includes("netflix")) return 100;
      if (l.includes("crunchyroll")) return 95;
      if (l.includes("funimation") || l.includes("hidive")) return 90;
      if (l.includes("full") || l.includes("original") || l.includes("orignal")) return 85;
      if (l.includes("english") && !l.includes("(")) return 80;
      if (l.includes("english") || l.includes("eng")) return 70;
      return 10;
    }

    tracksList.sort((a, b) => {
      const scoreA = getSubtitlePriority(a.label || "");
      const scoreB = getSubtitlePriority(b.label || "");
      if (scoreA !== scoreB) {
        return scoreB - scoreA; // Highest priority first
      }
      return (a.label || "").localeCompare(b.label || "");
    });

    // Mark the highest scoring compatible track as default
    let assignedDefault = false;
    for (let i = 0; i < tracksList.length; i++) {
      const t = tracksList[i];
      if (!assignedDefault && getSubtitlePriority(t.label || "") > 0) {
        t.default = true;
        assignedDefault = true;
      } else {
        t.default = false;
      }
    }

    if (!assignedDefault && tracksList.length > 0) {
      tracksList[0].default = true;
    }

    return tracksList;
  }, [subtitles]);

  // TMDB Episodes lookup for the active season
  const activeTmdbEpisodesMap = useMemo(() => {
    const sNum = activeGroup?.seasonNumber || 1;
    const seasonEps = tmdbEpisodesBySeason[sNum] || [];
    const map = new Map<number, any>();
    for (const ep of seasonEps) {
      map.set(ep.episode_number, ep);
    }
    return map;
  }, [activeGroup, tmdbEpisodesBySeason]);

  const availableProviders = useMemo(() => {
    if (!animeData) return [];
    return Object.keys(animeData).filter(
      (key) => animeData[key]?.episodes?.[audioType]?.length > 0,
    );
  }, [animeData, audioType]);

  const selectedEpisode =
    activeGroup?.episodes?.find((e: any) => e.id === selectedEpisodeId) ||
    episodes.find((e) => e.id === selectedEpisodeId);
  const activeBackdrop = tmdbBackdrop || animeBanner || animeCover;

  // Filtered and sorted episodes for current active group & sub-batch
  const filteredAndSortedEpisodes = useMemo(() => {
    if (!activeGroup) return [];
    let baseEps = activeGroup.episodes;

    if (selectedSubBatch !== "all" && subBatches.length > 0) {
      const foundBatch = subBatches.find((b) => b.id === selectedSubBatch);
      if (foundBatch) {
        baseEps = foundBatch.episodes;
      }
    }

    let result = [...baseEps];
    if (searchQuery.trim() !== "") {
      const q = searchQuery.toLowerCase();
      result = activeGroup.episodes.filter(
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
  }, [activeGroup, selectedSubBatch, subBatches, searchQuery, sortOrder]);

  // Timeline/runtime mismatch detection for movies (e.g. 23 min TV episode returned for a movie)
  const isRuntimeMismatch = useMemo(() => {
    if (type !== "movie" || !streamDuration || streamDuration <= 0) return false;

    // If expected runtime is available from TMDB (e.g. 117 mins)
    if (expectedRuntime && expectedRuntime >= 40) {
      const streamMinutes = streamDuration / 60;
      // If stream duration is under 38 mins or < 55% of full movie runtime
      return streamMinutes < 38 || streamMinutes < expectedRuntime * 0.55;
    }

    // Heuristic for anime movies: if stream duration is under 32 minutes (~1920s), it is almost certainly a TV episode
    return streamDuration < 1920;
  }, [type, streamDuration, expectedRuntime]);

  const handleConvertToVip = () => {
    if (sessionStorage.getItem("vip_auth") === "123") {
      if (tmdbId) {
        router.push(
          type === "movie"
            ? `/watch/servers/${tmdbId}?type=movie`
            : `/watch/servers/${tmdbId}?type=tv&season=${activeGroup?.seasonNumber || 1}&episode=${selectedEpisode?.number || 1}`
        );
      }
    } else {
      setShowVipModal(true);
    }
  };

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
        <div className="w-full max-w-[88rem]">
          {/* Top Bar & Controls */}
          <div className="flex flex-col gap-3.5 sm:gap-4.5 mb-5 sm:mb-6 pt-1">
            {/* Row 1: Back, Title & Primary Actions (VIP Cinema + Close) */}
            <div className="flex items-center justify-between gap-3">
              <div className="flex items-center gap-2.5 sm:gap-3 min-w-0 flex-1">
                <button
                  type="button"
                  onClick={onClose}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-white/[0.06] hover:bg-white/[0.12] border border-white/10 text-neutral-300 hover:text-white text-xs font-semibold transition-all cursor-pointer shadow-sm shrink-0"
                >
                  <ArrowLeft className="w-4 h-4" />
                  <span>Back</span>
                </button>

                <div className="min-w-0 flex-1">
                  <h1 className="text-sm sm:text-base md:text-lg font-bold text-white tracking-tight truncate flex items-center gap-2">
                    <span className="truncate">{animeTitle}</span>
                    {type !== "movie" && selectedEpisode && (
                      <span className="text-amber-400 font-semibold text-xs sm:text-sm shrink-0 bg-amber-500/10 px-2 py-0.5 rounded-md border border-amber-500/20">
                        · Ep {selectedEpisode.number}
                      </span>
                    )}
                  </h1>
                </div>
              </div>

              <div className="flex items-center gap-2 shrink-0">
                {/* VIP Server Access Button */}
                {tmdbId && (
                  <button
                    type="button"
                    onClick={handleConvertToVip}
                    className="inline-flex items-center gap-1 sm:gap-1.5 px-3 sm:px-4 py-1.5 rounded-full text-[10px] sm:text-xs font-black uppercase tracking-wider bg-gradient-to-r from-amber-400 via-amber-500 to-amber-600 hover:from-amber-300 hover:to-amber-500 text-black shadow-[0_0_15px_rgba(245,158,11,0.35)] hover:shadow-[0_0_20px_rgba(245,158,11,0.5)] transition-all cursor-pointer shrink-0 active:scale-95"
                    title="Unlock VIP Cinema Player"
                  >
                    <Sparkles className="w-3.5 h-3.5 text-black" />
                    <span>VIP Cinema</span>
                  </button>
                )}

                {/* Close Button */}
                <button
                  type="button"
                  onClick={onClose}
                  className="p-1.5 sm:p-2 rounded-full bg-white/[0.06] hover:bg-red-500/20 hover:border-red-500/40 border border-white/10 text-neutral-400 hover:text-red-400 transition-all cursor-pointer shrink-0 active:scale-95"
                  title="Close"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
            </div>

            {/* Row 2: Stream Source Tabs (Server 1/2/3), Audio Toggle (SUB/DUB) & Warnings */}
            <div className="flex items-center justify-between gap-3 flex-wrap sm:flex-nowrap">
              {/* Anime Source Switcher Tabs (Server 1 / 2 / 3) */}
              <div className="flex items-center bg-white/[0.06] p-1 rounded-full border border-white/10 gap-1">
                <button
                  type="button"
                  onClick={() => setActiveSource("anivexa")}
                  className={`px-3 sm:px-4 py-1.5 rounded-full text-xs font-bold transition-all flex items-center gap-1.5 ${
                    activeSource === "anivexa"
                      ? "bg-amber-500 text-black shadow-md shadow-amber-500/20"
                      : "text-neutral-400 hover:text-white"
                  }`}
                  title="Server 1"
                >
                  <span>Server 1</span>
                </button>
                <button
                  type="button"
                  onClick={() => setActiveSource("hianime")}
                  className={`px-3 sm:px-4 py-1.5 rounded-full text-xs font-bold transition-all flex items-center gap-1.5 ${
                    activeSource === "hianime"
                      ? "bg-amber-500 text-black shadow-md shadow-amber-500/20"
                      : "text-neutral-400 hover:text-white"
                  }`}
                  title="Server 2"
                >
                  <span>Server 2</span>
                </button>
                <button
                  type="button"
                  onClick={() => setActiveSource("aniwatch")}
                  className={`px-3 sm:px-4 py-1.5 rounded-full text-xs font-bold transition-all flex items-center gap-1.5 ${
                    activeSource === "aniwatch"
                      ? "bg-amber-500 text-black shadow-md shadow-amber-500/20"
                      : "text-neutral-400 hover:text-white"
                  }`}
                  title="Server 3"
                >
                  <span>Server 3</span>
                </button>
              </div>

              <div className="flex items-center gap-2.5">
                {/* Movie Episode/Duration Mismatch Warning Pill */}
                {type === "movie" && isRuntimeMismatch && (
                  <button
                    type="button"
                    onClick={() => setIsMismatchDismissed(false)}
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-amber-500/15 hover:bg-amber-500/25 border border-amber-500/40 text-amber-300 hover:text-amber-200 text-[11px] sm:text-xs font-semibold transition-all cursor-pointer shadow-sm animate-pulse"
                    title="TV Episode timeline detected. Click to switch to VIP Player"
                  >
                    <span className="w-1.5 h-1.5 rounded-full bg-amber-400" />
                    <span>23m Ep · Switch to VIP</span>
                  </button>
                )}

                {/* Audio Type Selector */}
                <div className="flex items-center bg-white/[0.06] p-1 rounded-full border border-white/10 gap-1">
                  <button
                    type="button"
                    onClick={() => handleAudioToggle("sub")}
                    className={`px-3 py-1.5 rounded-full text-xs font-bold transition-all ${
                      audioType === "sub"
                        ? "bg-amber-500 text-black shadow-md shadow-amber-500/20"
                        : "text-neutral-400 hover:text-white"
                    }`}
                  >
                    SUB
                  </button>
                  <button
                    type="button"
                    onClick={() => handleAudioToggle("dub")}
                    className={`px-3 py-1.5 rounded-full text-xs font-bold transition-all ${
                      audioType === "dub"
                        ? "bg-amber-500 text-black shadow-md shadow-amber-500/20"
                        : "text-neutral-400 hover:text-white"
                    }`}
                  >
                    DUB
                  </button>
                </div>
              </div>
            </div>
          </div>

          {/* Video Player Box */}
          <div className="relative w-full h-[64vw] max-h-[420px] min-h-[250px] sm:h-[56vw] sm:max-h-[520px] md:h-[650px] md:max-h-[80vh] md:min-h-[540px] lg:h-[720px] xl:h-[780px] rounded-2xl md:rounded-3xl overflow-hidden bg-neutral-900/90 border border-white/10 shadow-2xl flex flex-col items-center justify-center">
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
                  Try switching the audio type or server below.
                </p>
              </div>
            ) : streamUrl ? (
              <>
                {isIframe ? (
                  <div key={`iframe-container-${streamUrl}`} className="relative w-full h-full">
                    {!hasAbsorbedClick && (
                      <div
                        className="absolute inset-0 z-30 cursor-pointer"
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
                    />
                  </div>
                ) : (
                  <div key={`vidstack-container-${streamUrl}`} className="relative w-full h-full">
                    <VidstackPlayer
                      src={streamUrl}
                      tracks={vidstackTracks}
                      autoPlay={true}
                      onDurationChange={(dur) => {
                        if (dur > 0) setStreamDuration(dur);
                      }}
                      title={
                        type === "movie"
                          ? animeTitle
                          : `${animeTitle} - ${selectedEpisode?.title || `Episode ${selectedEpisode?.number || 1}`}`
                      }
                      tmdbId={tmdbId ? String(tmdbId) : (anilistId ? `anime_${anilistId}` : undefined)}
                      mediaType={type}
                      season={activeGroup?.seasonNumber || 1}
                      episode={selectedEpisode?.number || 1}
                      episodeId={selectedEpisodeId || undefined}
                      playerType="anime"
                      server={activeSource}
                      audioType={audioType}
                      poster={animeCover || tmdbBackdrop || undefined}
                      className="w-full h-full text-white font-sans"
                    />
                  </div>
                )}

                {/* Automatic Timeline Mismatch / VIP Conversion Prompt for Movies */}
                {type === "movie" && isRuntimeMismatch && !isMismatchDismissed && (
                  <div className="absolute inset-0 z-40 bg-black/85 backdrop-blur-md flex items-center justify-center p-4">
                    <div
                      className="w-full max-w-md bg-neutral-900/95 border border-amber-500/40 rounded-2xl p-5 sm:p-6 shadow-[0_0_50px_rgba(245,158,11,0.25)] flex flex-col items-center text-center relative"
                      onClick={(e) => e.stopPropagation()}
                    >
                      {/* Close button to dismiss and continue/check existing stream */}
                      <button
                        type="button"
                        onClick={() => setIsMismatchDismissed(true)}
                        className="absolute top-3 right-3 p-1.5 rounded-full bg-white/5 hover:bg-white/10 text-neutral-400 hover:text-white transition-all cursor-pointer"
                        title="Close and inspect stream"
                      >
                        <X className="w-4 h-4" />
                      </button>

                      <div className="w-12 h-12 rounded-2xl bg-amber-500/15 border border-amber-500/30 flex items-center justify-center text-amber-400 mb-3 shadow-[0_0_20px_rgba(245,158,11,0.25)]">
                        <Film className="w-6 h-6" />
                      </div>

                      <h3 className="text-base sm:text-lg font-bold text-white mb-1.5">
                        Movie Timeline Mismatch
                      </h3>

                      <div className="flex items-center justify-center gap-2 text-xs font-semibold my-2 px-3 py-1.5 rounded-xl bg-black/50 border border-white/10 text-neutral-300">
                        <span className="text-red-400 font-bold">
                          Stream: {streamDuration ? `${Math.round(streamDuration / 60)} min (TV Ep)` : "23 min (TV Ep)"}
                        </span>
                        <span className="text-neutral-500">vs</span>
                        <span className="text-emerald-400 font-bold">
                          Full Movie: {expectedRuntime ? `${Math.round(expectedRuntime)} min` : "1h 30m+"}
                        </span>
                      </div>

                      <p className="text-xs text-neutral-400 mt-1 mb-5 leading-relaxed">
                        The anime source returned a <strong>23-minute TV episode</strong> instead of the full-length movie. Convert to the VIP Player to stream the complete movie.
                      </p>

                      <div className="flex flex-col sm:flex-row items-center gap-2.5 w-full">
                        <button
                          type="button"
                          onClick={handleConvertToVip}
                          className="w-full flex-1 py-2.5 px-4 rounded-xl bg-gradient-to-r from-amber-400 via-amber-500 to-amber-600 hover:from-amber-300 hover:to-amber-500 text-black text-xs font-black uppercase tracking-wider flex items-center justify-center gap-1.5 shadow-[0_0_20px_rgba(245,158,11,0.4)] transition-all cursor-pointer"
                        >
                          <Sparkles className="w-4 h-4" />
                          <span>Convert to VIP Player</span>
                        </button>
                        <button
                          type="button"
                          onClick={() => setIsMismatchDismissed(true)}
                          className="w-full sm:w-auto py-2.5 px-4 rounded-xl bg-white/5 hover:bg-white/10 border border-white/10 text-neutral-300 hover:text-white text-xs font-semibold transition-all cursor-pointer"
                        >
                          Keep Playing
                        </button>
                      </div>
                    </div>
                  </div>
                )}
              </>
            ) : null}
          </div>

          {/* Season / Arc & Episode Selector Section (Only shown for TV/Series) */}
          {type !== "movie" && episodes.length > 0 && (
            <div className={styles.container}>
              {/* Header: Title & Season Dropdown */}
              <div className={styles.header}>
                <div className={styles.headerTitleGroup}>
                  <h3 className={styles.title}>Episodes</h3>
                </div>

                <div className="flex items-center gap-2 flex-wrap justify-end">
                  {/* Season / Arc Dropdown */}
                  {groups.length > 1 && (
                    <div className={styles.seasonDropdownWrapper} ref={dropdownRef}>
                      <button
                        type="button"
                        className={styles.seasonSelectBtn}
                        onClick={() => setIsSeasonDropdownOpen(!isSeasonDropdownOpen)}
                      >
                        <span className="truncate max-w-[200px] text-left">
                          {activeGroup?.name || `Season ${activeGroup?.seasonNumber || 1}`}
                        </span>
                        <span className={styles.episodeCountSpan}>
                          ({activeGroup?.count || 0} eps)
                        </span>
                        <ChevronDown
                          size={16}
                          className={`${styles.chevron} ${
                            isSeasonDropdownOpen ? styles.chevronOpen : ""
                          }`}
                        />
                      </button>

                      {isSeasonDropdownOpen && (
                        <div className={styles.dropdownMenuList}>
                          {groups.map((g) => {
                            const isActive = g.id === activeGroup?.id;
                            return (
                              <div
                                key={g.id}
                                className={`${styles.dropdownMenuItem} ${
                                   isActive ? styles.dropdownMenuItemActive : ""
                                }`}
                                onClick={() => {
                                  setSelectedGroupId(g.id);
                                  setSelectedSubBatch("all");
                                  setIsSeasonDropdownOpen(false);
                                  if (g.episodes && g.episodes.length > 0) {
                                    prevEpisodeIdRef.current = g.episodes[0].id;
                                    setSelectedEpisodeId(g.episodes[0].id);
                                  }
                                }}
                              >
                                <span className="font-semibold truncate max-w-[190px]">{g.name}</span>
                                <span className={styles.dropdownEpisodeCount}>
                                  {g.count} eps
                                </span>
                              </div>
                            );
                          })}
                        </div>
                      )}
                    </div>
                  )}
                </div>
              </div>

              {/* Sub-Batch Pills (For large seasons/arcs e.g. > 30 episodes) */}
              {subBatches.length > 0 && (
                <div className={styles.subBatchBar}>
                  <span className={styles.subBatchLabel}>Range:</span>
                  <button
                    type="button"
                    className={`${styles.subBatchPill} ${
                      selectedSubBatch === "all" ? styles.subBatchPillActive : ""
                    }`}
                    onClick={() => setSelectedSubBatch("all")}
                  >
                    All ({activeGroup?.count})
                  </button>
                  {subBatches.map((b) => (
                    <button
                      key={b.id}
                      type="button"
                      className={`${styles.subBatchPill} ${
                        selectedSubBatch === b.id ? styles.subBatchPillActive : ""
                      }`}
                      onClick={() => setSelectedSubBatch(b.id)}
                    >
                      {b.label}
                    </button>
                  ))}
                </div>
              )}

              {/* Filters Row: Search & Sort */}
              <div className={styles.filtersRow}>
                <div className={styles.searchBox}>
                  <Search size={16} className={styles.searchIcon} />
                  <input
                    type="text"
                    placeholder={`Search ${activeGroup?.shortName || "season"} episodes...`}
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

                    // Compute relative episode number in the current season for TMDB metadata lookup
                    const relativeNum =
                      typeof ep.number === "number" && activeGroup
                        ? ep.number - activeGroup.startEp + 1
                        : ep.number;
                    const tmdbEp =
                      activeTmdbEpisodesMap.get(relativeNum) ||
                      activeTmdbEpisodesMap.get(ep.number);

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
          className="fixed inset-0 z-[999999] bg-black/85 backdrop-blur-md flex items-center justify-center p-3 sm:p-4"
          onClick={() => {
            setShowVipModal(false);
            setVipError(null);
            setVipInputCode("");
          }}
        >
          <div 
            className="w-full max-w-[340px] sm:max-w-sm bg-neutral-900/95 border border-amber-500/35 rounded-2xl sm:rounded-3xl p-5 sm:p-6 shadow-[0_0_50px_rgba(245,158,11,0.25)] flex flex-col items-center text-center relative backdrop-blur-xl animate-in fade-in zoom-in-95 duration-200"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Close X Button */}
            <button
              type="button"
              onClick={() => {
                setShowVipModal(false);
                setVipError(null);
                setVipInputCode("");
              }}
              className="absolute top-3.5 right-3.5 p-1.5 rounded-full bg-white/5 hover:bg-white/10 text-neutral-400 hover:text-white transition-all cursor-pointer active:scale-95"
              title="Close"
            >
              <X className="w-4 h-4" />
            </button>

            {/* Glowing Icon Badge */}
            <div className="w-11 h-11 sm:w-12 sm:h-12 rounded-full bg-amber-500/10 border border-amber-500/30 flex items-center justify-center text-amber-400 mb-3 shadow-[0_0_15px_rgba(245,158,11,0.2)]">
              <Sparkles className="w-5 h-5 sm:w-6 sm:h-6" />
            </div>

            <h3 className="text-base sm:text-lg font-black text-white mb-1 tracking-tight">Enter VIP Passkey</h3>
            <p className="text-xs text-neutral-400 mb-4 px-2">
              Enter <span className="text-amber-400 font-bold font-mono px-1.5 py-0.5 bg-amber-500/10 rounded border border-amber-500/20">123</span> to unlock dedicated 4K VIP Cinema servers.
            </p>

            <form
              onSubmit={(e) => {
                e.preventDefault();
                if (vipInputCode.trim() === "123") {
                  sessionStorage.setItem("vip_auth", "123");
                  localStorage.setItem("vip_auth", "123");
                  setShowVipModal(false);
                  if (type === "movie") {
                    router.push(`/watch/servers/${tmdbId}?type=movie`);
                  } else {
                    const activeSeasonNum = activeGroup?.seasonNumber || 1;
                    const relativeEpNum =
                      activeGroup && selectedEpisode?.number && typeof selectedEpisode.number === "number"
                        ? selectedEpisode.number - activeGroup.startEp + 1
                        : selectedEpisode?.number || 1;
                    router.push(
                      `/watch/servers/${tmdbId}?type=${type || "tv"}&season=${activeSeasonNum}&episode=${relativeEpNum > 0 ? relativeEpNum : 1}`
                    );
                  }
                } else {
                  setVipError("Invalid VIP Code. Please enter 123.");
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
                className="w-full bg-black/80 border border-white/15 focus:border-amber-400 rounded-xl px-4 py-2.5 sm:py-3 text-center text-white font-mono tracking-widest text-base sm:text-lg focus:outline-none transition-all shadow-inner placeholder:tracking-normal placeholder:text-neutral-500"
                autoFocus
              />

              {vipError && (
                <p className="text-xs text-red-400 font-semibold animate-shake">{vipError}</p>
              )}

              <div className="flex items-center gap-2 w-full mt-1">
                <button
                  type="button"
                  onClick={() => {
                    setShowVipModal(false);
                    setVipError(null);
                    setVipInputCode("");
                  }}
                  className="flex-1 py-2.5 rounded-xl bg-white/5 hover:bg-white/10 text-neutral-300 text-xs sm:text-sm font-semibold transition-all cursor-pointer active:scale-95"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="flex-1 py-2.5 rounded-xl bg-gradient-to-r from-amber-400 to-amber-600 hover:from-amber-300 hover:to-amber-500 text-black text-xs sm:text-sm font-black transition-all shadow-[0_0_15px_rgba(245,158,11,0.3)] hover:shadow-[0_0_20px_rgba(245,158,11,0.5)] cursor-pointer active:scale-95"
                >
                  Unlock VIP
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
