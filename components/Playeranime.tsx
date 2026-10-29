"use client";

import React, { useState, useEffect, useMemo, useRef } from "react";
import { createPortal } from "react-dom";
import { X, ArrowLeft, Loader, Sparkles, Film } from "lucide-react";
import { useRouter } from "next/navigation";
import VidstackPlayer, { VidstackTrack } from "./VidstackPlayer";
import { installAdblockProtection } from "../utils/adblockFramework";
import { clearMediaSession, suppressMediaSession } from "../utils/mediaSessionManager";
import SeasonEpisodeSelector from "./SeasonEpisodeSelector/SeasonEpisodeSelector";
import { getSavedProgress, updateWatchProgress } from "../utils/userStorage";

interface PlayeranimeProps {
  animeTitle: string;
  tmdbId?: string | number;
  type?: "tv" | "movie";
  initialSeason?: number;
  initialEpisode?: number;
  posterPath?: string;
  backdropPath?: string;
  onClose: () => void;
}

/**
 * Safely extracts an episode number from diverse anime provider schemas.
 */
function getEpNum(e: any): number {
  const raw = e?.number ?? e?.episode_number ?? e?.episodeNumber ?? e?.episode ?? e?.epNum ?? e?.order;
  if (typeof raw === 'number' && !isNaN(raw)) return raw;
  const parsed = parseInt(String(raw || '').trim(), 10);
  return isNaN(parsed) ? 0 : parsed;
}

/**
 * Accurately matches an episode within an anime provider list,
 * handling continuous series numbering (e.g. One Piece, Bleach)
 * vs per-season reset numbering (e.g. Attack on Titan S2, Solo Leveling S2).
 */
function findAnimeEpisode(
  eps: any[],
  seasonNumber: number,
  episodeNumber: number,
  priorCount: number
) {
  if (!eps || !Array.isArray(eps) || eps.length === 0) return null;

  const cumulativeEp = priorCount + episodeNumber;

  // 1. If in Season > 1 and priorCount > 0
  if (seasonNumber > 1 && priorCount > 0) {
    // If this episode list spans multiple seasons (e.g. One Piece, 1..1100),
    // and it actually contains cumulativeEp, match cumulativeEp!
    const matchCum = eps.find((e: any) => getEpNum(e) === cumulativeEp);
    if (matchCum) return matchCum;

    // Otherwise, this is a per-season release (e.g. Black Clover S2, Attack on Titan S2, Solo Leveling S2, 1..N),
    // match relative episodeNumber!
    const matchRelative = eps.find((e: any) => getEpNum(e) === episodeNumber);
    if (matchRelative) return matchRelative;

    return null;
  }

  // 2. Season 1 or priorCount === 0: matches relative episodeNumber
  return eps.find((e: any) => getEpNum(e) === episodeNumber) || null;
}

/**
 * Checks if a track is a scrubber thumbnail sprite track or non-dialogue metadata.
 */
function isThumbnailOrInvalidTrack(track: any): boolean {
  if (!track) return true;
  const src = String(track.src || track.url || track.file || '').toLowerCase();
  const label = String(track.label || track.name || '').toLowerCase();
  const kind = String(track.kind || '').toLowerCase();

  if (kind === 'thumbnails' || kind === 'thumbnail' || kind === 'metadata' || kind === 'chapters') {
    return true;
  }

  if (
    src.includes('thumbnail') ||
    src.includes('sprite') ||
    src.includes('#xywh') ||
    src.includes('/thumbnails/') ||
    src.endsWith('.webp') ||
    src.endsWith('.jpg') ||
    src.endsWith('.jpeg') ||
    src.endsWith('.png') ||
    label.includes('thumbnail') ||
    label.includes('sprite')
  ) {
    return true;
  }

  return false;
}

export default function Playeranime({
  animeTitle,
  tmdbId,
  type = "tv",
  initialSeason = 1,
  initialEpisode = 1,
  posterPath,
  backdropPath,
  onClose,
}: PlayeranimeProps) {
  const router = useRouter();
  const [mounted, setMounted] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    document.body.classList.add("hide-sidebar");
    const origOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        onClose();
      }
    };
    window.addEventListener("keydown", handleKeyDown);

    return () => {
      document.body.classList.remove("hide-sidebar");
      document.body.style.overflow = origOverflow;
      window.removeEventListener("keydown", handleKeyDown);
    };
  }, [onClose]);

  const [anilistId, setAnilistId] = useState<number | null>(null);
  const [animeBanner, setAnimeBanner] = useState<string | null>(null);
  const [animeCover, setAnimeCover] = useState<string | null>(null);
  const [tmdbBackdrop, setTmdbBackdrop] = useState<string | null>(null);
  const [tmdbSeasons, setTmdbSeasons] = useState<any[]>([]);

  const [currentSeason, setCurrentSeason] = useState<number>(initialSeason || 1);
  const [currentEpisode, setCurrentEpisode] = useState<number>(initialEpisode || 1);

  const [episodes, setEpisodes] = useState<any[]>([]);
  const [selectedProvider, setSelectedProvider] = useState<string | null>(null);

  const [streamUrl, setStreamUrl] = useState<string | null>(null);
  const streamUrlRef = useRef<string | null>(null);
  streamUrlRef.current = streamUrl;
  const [isSwitchingEpisode, setIsSwitchingEpisode] = useState<boolean>(false);
  const fetchRequestIdRef = useRef<number>(0);
  const [subtitles, setSubtitles] = useState<any[]>([]);
  const [thumbnailsTrack, setThumbnailsTrack] = useState<string | undefined>(undefined);
  const [isIframe, setIsIframe] = useState<boolean>(false);
  const [hasAbsorbedClick, setHasAbsorbedClick] = useState<boolean>(false);

  const [animeData, setAnimeData] = useState<any>(null);
  const animeDataRef = useRef<any>(null);
  animeDataRef.current = animeData;
  const episodesRef = useRef<any[]>([]);
  episodesRef.current = episodes;
  const [animeDataVersion, setAnimeDataVersion] = useState<number>(0);
  const seasonAnimeCache = useRef<Map<number, { anilistId: number; animeData: any }>>(new Map());
  const [audioNotice, setAudioNotice] = useState<string | null>(null);

  useEffect(() => {
    if (!audioNotice) return;
    const t = setTimeout(() => setAudioNotice(null), 5000);
    return () => clearTimeout(t);
  }, [audioNotice]);

  const priorCount = useMemo(() => {
    return (tmdbSeasons || [])
      .filter((s: any) => s.season_number > 0 && s.season_number < currentSeason)
      .reduce((sum: number, s: any) => sum + (s.episode_count || 0), 0);
  }, [tmdbSeasons, currentSeason]);
  const [audioType, setAudioType] = useState<"sub" | "dub">("sub");

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

  useEffect(() => {
    if (typeof window === "undefined") return;
    try {
      const urlParams = new URLSearchParams(window.location.search);
      const paramEp = urlParams.get("ep") || urlParams.get("episode");
      const paramSeason = urlParams.get("season") || urlParams.get("s");
      const paramSource = urlParams.get("source");

      if (paramSource && (paramSource === "anivexa" || paramSource === "hianime" || paramSource === "aniwatch")) {
        setActiveSource(paramSource as AnimeSource);
      } else if (tmdbId) {
        const savedSource = localStorage.getItem(`streamnet_anime_source_${tmdbId}`);
        if (savedSource && (savedSource === "anivexa" || savedSource === "hianime" || savedSource === "aniwatch")) {
          setActiveSource(savedSource as AnimeSource);
        }
      }

      let initSeason = 1;
      let initEp = 1;
      if (paramSeason) initSeason = parseInt(paramSeason, 10) || 1;
      if (paramEp) initEp = parseInt(paramEp, 10) || 1;

      const stored = localStorage.getItem("continueWatching");
      if (stored) {
        const list = JSON.parse(stored);
        const match = Array.isArray(list) && list.find((m: any) =>
          (tmdbId && String(m.id) === String(tmdbId)) ||
          (m.title && m.title.toLowerCase() === animeTitle.toLowerCase())
        );

        if (match) {
          if (!paramSeason && (match.season || match.last_season)) {
            initSeason = match.season || match.last_season || 1;
          }
          if (!paramEp && (match.episode || match.last_episode)) {
            initEp = match.episode || match.last_episode || 1;
          }
          if (match.audioType === "dub" || match.audioType === "sub") {
            setAudioType(match.audioType);
          }
          const matchedSource = match.animeSource || match.server;
          if (!paramSource && matchedSource && (matchedSource === "anivexa" || matchedSource === "hianime" || matchedSource === "aniwatch")) {
            setActiveSource(matchedSource as AnimeSource);
          }
        }
      }

      setCurrentSeason(initSeason);
      setCurrentEpisode(initEp);
    } catch {}
  }, [tmdbId, animeTitle]);

  const handleSelectAnimeSource = (source: AnimeSource) => {
    setActiveSource(source);
    if (tmdbId) {
      try {
        localStorage.setItem(`streamnet_anime_source_${tmdbId}`, source);
        updateWatchProgress({
          id: tmdbId,
          title: animeTitle,
          media_type: type,
          season: currentSeason,
          episode: currentEpisode,
          episodeId: `s${currentSeason}e${currentEpisode}`,
          server: source,
          animeSource: source,
          playerType: "anime",
          audioType,
          poster_path: posterPath || animeCover || backdropPath,
        });
      } catch {}
    }
  };

  const handleEpisodeSelect = (seasonNum: number, episodeNum: number) => {
    if (seasonNum === currentSeason && episodeNum === currentEpisode) return;
    setSubtitles([]);
    setThumbnailsTrack(undefined);
    setCurrentSeason(seasonNum);
    setCurrentEpisode(episodeNum);
    if (tmdbId) {
      try {
        updateWatchProgress({
          id: tmdbId,
          title: animeTitle,
          media_type: type,
          season: seasonNum,
          episode: episodeNum,
          episodeId: `s${seasonNum}e${episodeNum}`,
          server: activeSource,
          animeSource: activeSource,
          playerType: "anime",
          audioType,
          poster_path: posterPath || animeCover || backdropPath,
        });
      } catch {}
    }
  };

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

    // Fallback to sub if dub has no episodes
    if (foundEpisodes.length === 0 && audio === "dub") {
      for (const provider of priorityProviders) {
        if (data[provider]?.episodes?.["sub"]?.length > 0) {
          foundEpisodes = data[provider].episodes["sub"];
          chosenProvider = provider;
          break;
        }
      }
    }

    if (foundEpisodes.length > 0 && chosenProvider) {
      setEpisodes(foundEpisodes);
      setSelectedProvider(chosenProvider);
      setError(null);
    } else {
      setEpisodes([]);
      setError(`No ${audio} episodes found.`);
    }
  };

  const resolveSeasonAnime = async (season: number, signal?: AbortSignal) => {
    if (seasonAnimeCache.current.has(season)) {
      return seasonAnimeCache.current.get(season)!;
    }

    const currentSeasonObj = (tmdbSeasons || []).find(
      (s: any) => s.season_number === season
    );
    const seasonName = currentSeasonObj?.name;

    // Build list of search candidates in priority order
    const searchCandidates: string[] = [];
    if (season > 1) {
      if (seasonName && !seasonName.toLowerCase().startsWith("season")) {
        searchCandidates.push(`${animeTitle} ${seasonName}`);
      }
      searchCandidates.push(`${animeTitle} Season ${season}`);
      searchCandidates.push(`${animeTitle} ${season}`);
      searchCandidates.push(`${animeTitle} Part ${season}`);
    }
    searchCandidates.push(animeTitle);

    for (const candidate of searchCandidates) {
      try {
        const searchRes = await fetchWithTimeout(
          `/api/anime-api/search-info?search=${encodeURIComponent(candidate)}`,
          { signal }
        );
        if (!searchRes.ok) continue;
        const searchData = await searchRes.json();
        const media = searchData.data?.Media;
        if (!media?.id) continue;

        if (media.bannerImage) setAnimeBanner(media.bannerImage);
        if (
          media.coverImage?.extraLarge || media.coverImage?.large
        ) {
          setAnimeCover(media.coverImage.extraLarge || media.coverImage.large);
        }

        // Fetch episodes for this media
        const epRes = await fetchWithTimeout(
          `/api/anime-api/episodes-info/${media.id}`,
          { signal }
        );
        if (epRes.ok) {
          const epData = await epRes.json();
          const priorityProviders = [
            "anikoto",
            "reanime",
            "mkissa",
            "animegg",
            "2dhive",
            "kaa",
          ];
          const hasEps = priorityProviders.some(
            (p) =>
              epData[p]?.episodes?.sub?.length > 0 ||
              epData[p]?.episodes?.dub?.length > 0
          );
          if (hasEps) {
            const entry = { anilistId: media.id, animeData: epData };
            seasonAnimeCache.current.set(season, entry);
            return entry;
          }
        }
      } catch {}
    }
    return null;
  };

  // 1. Fetch anime metadata and episodes for the current active season
  useEffect(() => {
    if (!animeTitle) return;
    let isCancelled = false;

    async function loadSeasonAnime() {
      try {
        if (!streamUrlRef.current) {
          setLoading(true);
        }
        setError(null);

        const seasonEntry = await resolveSeasonAnime(currentSeason);
        if (isCancelled) return;

        if (seasonEntry) {
          setAnilistId(seasonEntry.anilistId);
          setAnimeData(seasonEntry.animeData);
          setAnimeDataVersion((v) => v + 1);
          loadEpisodes(seasonEntry.animeData, audioType, selectedProvider);
        }
      } catch (err: any) {
        if (!isCancelled && !streamUrlRef.current) setError(err.message || "Error fetching anime data");
      } finally {
        if (!isCancelled && !streamUrlRef.current) setLoading(false);
      }
    }

    loadSeasonAnime();

    return () => {
      isCancelled = true;
    };
  }, [animeTitle, currentSeason, tmdbSeasons]);

  // Handle Audio Type toggle
  const handleAudioToggle = (type: "sub" | "dub") => {
    setAudioType(type);
    const data = animeDataRef.current || animeData;
    if (data) {
      loadEpisodes(data, type, selectedProvider);
    }
  };

  // Handle Provider switch
  const handleProviderChange = (provider: string) => {
    setSelectedProvider(provider);
    const data = animeDataRef.current || animeData;
    if (data) {
      loadEpisodes(data, audioType, provider);
    }
  };

  // Fetch stream URL when season or episode changes
  useEffect(() => {
    if (!anilistId && !tmdbId && !animeTitle) return;

    const requestId = ++fetchRequestIdRef.current;
    const abortController = new AbortController();

    async function fetchServer() {
      try {
        if (streamUrlRef.current) {
          setIsSwitchingEpisode(true);
        } else {
          setLoading(true);
        }
        setError(null);
        setIsMismatchDismissed(false);

        // 1. Resolve season anime data to prevent race conditions when switching seasons
        let seasonEntry: { anilistId: number; animeData: any } | null | undefined =
          seasonAnimeCache.current.get(currentSeason);
        if (!seasonEntry) {
          seasonEntry = await resolveSeasonAnime(currentSeason, abortController.signal);
        }
        if (requestId !== fetchRequestIdRef.current) return;

        const activeAnimeData = seasonEntry?.animeData || animeDataRef.current || animeData;

        // Synchronize state if seasonEntry has newer anilistId or animeData
        if (seasonEntry && seasonEntry.anilistId !== anilistId) {
          setAnilistId(seasonEntry.anilistId);
          setAnimeData(seasonEntry.animeData);
        }

        // 2. Select priority providers based on active Server tab:
        // Server 1 (anivexa) -> anikoto first
        // Server 2 (hianime) -> reanime first
        // Server 3 (aniwatch) -> animegg / 2dhive / mkissa first
        let priorityProviders = ["anikoto", "reanime", "animegg", "2dhive", "mkissa", "kaa"];
        if (activeSource === "hianime") {
          priorityProviders = ["reanime", "anikoto", "animegg", "2dhive", "mkissa", "kaa"];
        } else if (activeSource === "aniwatch") {
          priorityProviders = ["animegg", "2dhive", "reanime", "anikoto", "mkissa", "kaa"];
        }

        if (selectedProvider && priorityProviders.includes(selectedProvider)) {
          priorityProviders = [selectedProvider, ...priorityProviders.filter((p) => p !== selectedProvider)];
        }

        // 3. Find episode with smart DUB -> SUB fallback
        let matchedEp: any = null;
        let matchedAudio: "sub" | "dub" = audioType;
        let usedProvider: string | null = null;

        if (activeAnimeData) {
          // First search with requested audioType
          for (const p of priorityProviders) {
            const pEps = activeAnimeData[p]?.episodes?.[audioType];
            if (pEps && Array.isArray(pEps) && pEps.length > 0) {
              const found = findAnimeEpisode(pEps, currentSeason, currentEpisode, priorCount);
              if (found) {
                matchedEp = found;
                matchedAudio = audioType;
                usedProvider = p;
                break;
              }
            }
          }

          // If requested audio was DUB but not available, fallback to SUB
          if (!matchedEp && audioType === "dub") {
            for (const p of priorityProviders) {
              const subEps = activeAnimeData[p]?.episodes?.["sub"];
              if (subEps && Array.isArray(subEps) && subEps.length > 0) {
                const found = findAnimeEpisode(subEps, currentSeason, currentEpisode, priorCount);
                if (found) {
                  matchedEp = found;
                  matchedAudio = "sub";
                  usedProvider = p;
                  setAudioNotice(
                    "English Dub is not yet released for this episode. Playing in Japanese with Subtitles."
                  );
                  break;
                }
              }
            }
          }
        }

        // Secondary fallback to episodes state if still not matched
        if (!matchedEp) {
          const currentEpisodes = episodesRef.current || episodes;
          if (currentEpisodes.length > 0) {
            matchedEp = findAnimeEpisode(currentEpisodes, currentSeason, currentEpisode, priorCount);
          }
        }

        // 4. Fetch stream data for the matched episode
        let streamData: any = null;
        if (matchedEp?.id) {
          try {
            const res = await fetch(
              `/api/anime-api/stream-info/${encodeURIComponent(matchedEp.id)}`,
              { signal: abortController.signal }
            );
            if (res.ok) {
              const parsed = await res.json();
              if (
                parsed?.stream_url ||
                parsed?.stream ||
                parsed?.sources?.length ||
                parsed?.streams?.length ||
                parsed?.embeds?.length
              ) {
                streamData = parsed;
              }
            }
          } catch {}
        }

        // 5. Automatic Provider Cascading: if primary provider stream failed, try other priority providers
        if (!streamData && activeAnimeData) {
          for (const p of priorityProviders) {
            if (p === usedProvider) continue;
            const pEps = activeAnimeData[p]?.episodes?.[matchedAudio];
            if (pEps && Array.isArray(pEps)) {
              const altEp = findAnimeEpisode(pEps, currentSeason, currentEpisode, priorCount);
              if (altEp?.id && altEp.id !== matchedEp?.id) {
                try {
                  const altRes = await fetch(
                    `/api/anime-api/stream-info/${encodeURIComponent(altEp.id)}`,
                    { signal: abortController.signal }
                  );
                  if (altRes.ok) {
                    const altParsed = await altRes.json();
                    if (
                      altParsed?.stream_url ||
                      altParsed?.stream ||
                      altParsed?.sources?.length ||
                      altParsed?.streams?.length ||
                      altParsed?.embeds?.length
                    ) {
                      streamData = altParsed;
                      matchedEp = altEp;
                      break;
                    }
                  }
                } catch {}
              }
            }
          }
        }

        // If audio was DUB and still no stream, cascade across SUB providers as well
        if (!streamData && activeAnimeData && matchedAudio === "dub") {
          for (const p of priorityProviders) {
            const subEps = activeAnimeData[p]?.episodes?.["sub"];
            if (subEps && Array.isArray(subEps)) {
              const altEp = findAnimeEpisode(subEps, currentSeason, currentEpisode, priorCount);
              if (altEp?.id) {
                try {
                  const altRes = await fetch(
                    `/api/anime-api/stream-info/${encodeURIComponent(altEp.id)}`,
                    { signal: abortController.signal }
                  );
                  if (altRes.ok) {
                    const altParsed = await altRes.json();
                    if (
                      altParsed?.stream_url ||
                      altParsed?.stream ||
                      altParsed?.sources?.length ||
                      altParsed?.streams?.length ||
                      altParsed?.embeds?.length
                    ) {
                      streamData = altParsed;
                      matchedEp = altEp;
                      setAudioNotice(
                        "English Dub stream was unavailable. Playing in Japanese with Subtitles."
                      );
                      break;
                    }
                  }
                } catch {}
              }
            }
          }
        }

        // 6. Subtitle parsing & scrubbing thumbnail detection
        const nativeSubs: any[] = [];
        let discoveredThumb: string | undefined = undefined;

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

            // Reject thumbnail / sprite tracks
            if (isThumbnailOrInvalidTrack(sub)) {
              if (
                !discoveredThumb &&
                (sub.kind === "thumbnails" ||
                  rawSrc.includes("thumbnail") ||
                  rawSrc.includes("sprite"))
              ) {
                discoveredThumb = rawSrc;
              }
              continue;
            }

            const rawLabel = (sub.label || sub.name || "").trim();
            const lowerLabel = rawLabel.toLowerCase();
            const langCode = (sub.language || sub.lang || sub.srclang || "").toLowerCase();

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

            if (isNonEnglishLabel) continue;

            const isEnglish =
              lowerLabel.includes("english") ||
              lowerLabel.includes("eng") ||
              langCode === "en" ||
              langCode.startsWith("en-") ||
              langCode === "eng" ||
              (!lowerLabel && !langCode && sub.default);

            if (!isEnglish) continue;

            const finalSrc = rawSrc.startsWith("/api/subtitle/proxy")
              ? rawSrc
              : `/api/subtitle/proxy?url=${encodeURIComponent(rawSrc)}&referer=${encodeURIComponent(streamReferer)}`;

            const cleanLabel = rawLabel || "English";

            nativeSubs.push({
              src: finalSrc,
              label: cleanLabel,
              kind: "subtitles",
              language: "en",
              default: sub.default ?? isEnglish,
              type: rawSrc.toLowerCase().includes(".srt") ? "srt" : "vtt",
            });
          }
        }

        if (requestId !== fetchRequestIdRef.current) return;

        if (discoveredThumb) {
          setThumbnailsTrack(discoveredThumb);
        }

        setSubtitles(nativeSubs);

        const directHls =
          streamData?.stream_url ||
          streamData?.stream ||
          streamData?.sources?.[0]?.url ||
          streamData?.streams?.find(
            (s: any) => s.type === "hls" || s.url?.includes(".m3u8")
          )?.url;

        if (directHls) {
          const referer =
            streamData?.headers?.Referer ||
            streamData?.streams?.find((s: any) => s.url === directHls)?.referer ||
            "https://megaplay.buzz/";
          const headers: Record<string, string> = {};
          if (referer) headers["Referer"] = referer;
          const proxiedUrl = `/api/stream/proxy.m3u8?url=${encodeURIComponent(
            directHls
          )}&headers=${encodeURIComponent(JSON.stringify(headers))}`;

          setStreamUrl(proxiedUrl);
          setIsIframe(false);
          setIsSwitchingEpisode(false);
          setLoading(false);
          return;
        } else if (streamData?.embeds && streamData.embeds.length > 0) {
          setStreamUrl(streamData.embeds[0].url);
          setIsIframe(true);
          setIsSwitchingEpisode(false);
          setLoading(false);
          return;
        } else if (
          streamData?.streams &&
          streamData.streams.some((s: any) => s.type === "embed" || s.embedUrl)
        ) {
          const embedStream = streamData.streams.find(
            (s: any) => s.type === "embed" || s.embedUrl
          );
          setStreamUrl(embedStream.embedUrl || embedStream.url);
          setIsIframe(true);
          setIsSwitchingEpisode(false);
          setLoading(false);
          return;
        } else if (type === "movie" && tmdbId) {
          // Direct aggregate fallback ONLY for movies (safe, no anime TV season divergence)
          try {
            const aggRes = await fetch(
              `/api/direct-aggregate?id=${tmdbId}&type=movie&vip=true`,
              { signal: abortController.signal }
            );
            if (aggRes.ok) {
              const aggData = await aggRes.json();
              if (requestId !== fetchRequestIdRef.current) return;
              if (aggData && aggData.defaultStreamUrl) {
                setStreamUrl(aggData.defaultStreamUrl);
                setIsIframe(false);
                if (aggData.subtitles && Array.isArray(aggData.subtitles) && aggData.subtitles.length > 0) {
                  const dSubs = aggData.subtitles
                    .filter((s: any) => !isThumbnailOrInvalidTrack(s))
                    .map((s: any) => ({
                      src: s.url,
                      label: s.label || 'English',
                      kind: 'subtitles',
                      language: s.language || 'en',
                      default: s.isDefault ?? true,
                      type: 'vtt',
                    }));
                  setSubtitles(dSubs);
                }
                setIsSwitchingEpisode(false);
                setLoading(false);
                return;
              }
            }
          } catch {}
          if (requestId !== fetchRequestIdRef.current) return;
          if (!streamUrlRef.current) {
            setError("No streaming source found. Try switching to Server 2 or Server 3.");
          }
        } else {
          if (requestId !== fetchRequestIdRef.current) return;
          if (!streamUrlRef.current) {
            const serverName = activeSource === "anivexa" ? "Server 1" : activeSource === "hianime" ? "Server 2" : "Server 3";
            setError(`No stream found on ${serverName} for Episode ${currentEpisode}. Try switching to another server or SUB audio.`);
          }
        }
      } catch (err: any) {
        if (requestId !== fetchRequestIdRef.current) return;
        if (!streamUrlRef.current) {
          setError(err.message || "Error fetching stream URL");
        }
      } finally {
        if (requestId === fetchRequestIdRef.current) {
          setLoading(false);
          setIsSwitchingEpisode(false);
        }
      }
    }
    fetchServer();

    return () => {
      abortController.abort();
    };
  }, [
    currentSeason,
    currentEpisode,
    activeSource,
    activeHianimeServer,
    audioType,
    selectedProvider,
    anilistId,
    tmdbId,
    animeTitle,
    animeDataVersion,
    priorCount,
  ]);

  const vidstackTracks = useMemo<VidstackTrack[]>(() => {
    const seenSrcs = new Set<string>();
    const seenLabels = new Map<string, number>();
    const tracksList: VidstackTrack[] = [];

    for (const track of subtitles) {
      if (!track?.src) continue;
      if (isThumbnailOrInvalidTrack(track)) continue;

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

    if (audioType === "dub") {
      // In DUB mode, do not force subtitles ON by default, but keep them available in CC menu
      for (const t of tracksList) {
        t.default = false;
      }
    } else {
      // In SUB mode, mark the highest scoring compatible track as default
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
    }

    return tracksList;
  }, [subtitles, audioType]);

  const availableProviders = useMemo(() => {
    if (!animeData) return [];
    return Object.keys(animeData).filter(
      (key) => animeData[key]?.episodes?.[audioType]?.length > 0,
    );
  }, [animeData, audioType]);

  const activeBackdrop = tmdbBackdrop || animeBanner || animeCover;

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
            : `/watch/servers/${tmdbId}?type=tv&season=${currentSeason}&episode=${currentEpisode}`
        );
      }
    } else {
      setShowVipModal(true);
    }
  };

  if (!mounted) return null;

  return createPortal(
    <div className="fixed inset-0 z-[9999999] bg-neutral-950 text-white flex flex-col overflow-y-auto overflow-x-hidden selection:bg-white selection:text-black">
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
      <div className="w-full flex flex-col items-center px-3 sm:px-6 md:px-8 pt-5 sm:pt-6 pb-16 min-h-screen">
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
                    {type !== "movie" && (
                      <span className="text-white font-semibold text-xs sm:text-sm shrink-0 bg-white/10 px-2.5 py-0.5 rounded-md border border-white/20">
                        · S{currentSeason} E{currentEpisode}
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
                    className="inline-flex items-center gap-1 sm:gap-1.5 px-3.5 sm:px-4 py-1.5 rounded-full text-[10px] sm:text-xs font-black uppercase tracking-wider bg-white hover:bg-neutral-200 text-neutral-950 shadow-[0_0_20px_rgba(255,255,255,0.25)] hover:shadow-[0_0_25px_rgba(255,255,255,0.4)] transition-all cursor-pointer shrink-0 active:scale-95"
                    title="Unlock VIP Cinema Player"
                  >
                    <Sparkles className="w-3.5 h-3.5 text-neutral-950" />
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
                  onClick={() => handleSelectAnimeSource("anivexa")}
                  className={`px-3 sm:px-4 py-1.5 rounded-full text-xs font-bold transition-all flex items-center gap-1.5 ${
                    activeSource === "anivexa"
                      ? "bg-white text-neutral-950 shadow-md shadow-white/20"
                      : "text-neutral-400 hover:text-white"
                  }`}
                  title="Server 1"
                >
                  <span>Server 1</span>
                </button>
                <button
                  type="button"
                  onClick={() => handleSelectAnimeSource("hianime")}
                  className={`px-3 sm:px-4 py-1.5 rounded-full text-xs font-bold transition-all flex items-center gap-1.5 ${
                    activeSource === "hianime"
                      ? "bg-white text-neutral-950 shadow-md shadow-white/20"
                      : "text-neutral-400 hover:text-white"
                  }`}
                  title="Server 2"
                >
                  <span>Server 2</span>
                </button>
                <button
                  type="button"
                  onClick={() => handleSelectAnimeSource("aniwatch")}
                  className={`px-3 sm:px-4 py-1.5 rounded-full text-xs font-bold transition-all flex items-center gap-1.5 ${
                    activeSource === "aniwatch"
                      ? "bg-white text-neutral-950 shadow-md shadow-white/20"
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
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-white/10 hover:bg-white/20 border border-white/25 text-white text-[11px] sm:text-xs font-semibold transition-all cursor-pointer shadow-sm animate-pulse"
                    title="TV Episode timeline detected. Click to switch to VIP Player"
                  >
                    <span className="w-1.5 h-1.5 rounded-full bg-white" />
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
                        ? "bg-white text-neutral-950 shadow-md shadow-white/20"
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
                        ? "bg-white text-neutral-950 shadow-md shadow-white/20"
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
            {loading && !streamUrl ? (
              <div className="w-full h-full flex flex-col items-center justify-center bg-neutral-900/90 gap-3">
                <div className="w-12 h-12 rounded-full bg-white/5 border border-white/20 backdrop-blur-md flex items-center justify-center shadow-[0_0_25px_rgba(255,255,255,0.15)] animate-pulse">
                  <div className="w-0 h-0 border-t-[6px] border-t-transparent border-b-[6px] border-b-transparent border-l-[10px] border-l-white ml-0.5" />
                </div>
                <span className="text-xs font-semibold tracking-wider uppercase text-neutral-400">
                  Preparing Anime Stream...
                </span>
              </div>
            ) : error && !streamUrl ? (
              <div className="w-full h-full flex flex-col items-center justify-center bg-neutral-900/90 p-6 text-center gap-3">
                <p className="text-red-400 font-bold text-sm">{error}</p>
                <p className="text-xs text-neutral-400 max-w-md">
                  Try switching the audio type or server below.
                </p>
              </div>
            ) : streamUrl ? (
              <>
                {isIframe ? (
                  <div className="relative w-full h-full">
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
                      src={streamUrl}
                      className="w-full h-full border-0 bg-black"
                      allowFullScreen
                    />
                  </div>
                ) : (
                  <div className="relative w-full h-full">
                    <VidstackPlayer
                      src={streamUrl}
                      tracks={vidstackTracks}
                      thumbnails={thumbnailsTrack}
                      autoPlay={true}
                      onDurationChange={(dur) => {
                        if (dur > 0) setStreamDuration(dur);
                      }}
                      onEnded={() => {
                        if (type !== 'movie') {
                          const currentSeasonObj = (tmdbSeasons || []).find((s: any) => s.season_number === currentSeason);
                          const epCount = currentSeasonObj?.episode_count || episodes.length || 0;
                          if (epCount > 0 && currentEpisode >= epCount) {
                            const nextSeasonObj = (tmdbSeasons || []).find((s: any) => s.season_number === currentSeason + 1);
                            if (nextSeasonObj) {
                              handleEpisodeSelect(currentSeason + 1, 1);
                              return;
                            }
                          }
                          handleEpisodeSelect(currentSeason, currentEpisode + 1);
                        }
                      }}
                      title={
                        type === "movie"
                          ? animeTitle
                          : `${animeTitle} - Season ${currentSeason} Episode ${currentEpisode}`
                      }
                      tmdbId={tmdbId ? String(tmdbId) : (anilistId ? `anime_${anilistId}` : undefined)}
                      mediaType={type}
                      season={currentSeason}
                      episode={currentEpisode}
                      episodeId={`s${currentSeason}e${currentEpisode}`}
                      playerType="anime"
                      server={activeSource}
                      audioType={audioType}
                      poster={undefined}
                      className="w-full h-full text-white font-sans"
                    />
                  </div>
                )}

                {/* Seamless Episode Switching In-Place Loading Overlay */}
                {isSwitchingEpisode && (
                  <div className="absolute inset-0 z-40 bg-black/60 backdrop-blur-sm flex flex-col items-center justify-center gap-3 pointer-events-none transition-all duration-200">
                    <div className="w-12 h-12 rounded-full border-2 border-white/20 border-t-white animate-spin flex items-center justify-center shadow-[0_0_25px_rgba(255,255,255,0.2)]">
                      <div className="w-2 h-2 rounded-full bg-white animate-ping" />
                    </div>
                    <div className="flex flex-col items-center gap-1 text-center">
                      <span className="text-xs font-bold tracking-wider uppercase text-white">
                        Loading Episode {currentEpisode}
                      </span>
                      <span className="text-[10px] text-neutral-400 font-medium">
                        Season {currentSeason} · {audioType.toUpperCase()} · Server {activeSource === "anivexa" ? "1" : activeSource === "hianime" ? "2" : "3"}
                      </span>
                    </div>
                  </div>
                )}

                {/* Floating Non-Destructive Error Pill when player is already mounted */}
                {error && streamUrl && (
                  <div className="absolute top-4 left-1/2 -translate-x-1/2 z-50 bg-red-950/90 border border-red-500/50 text-red-200 px-4 py-2 rounded-full text-xs font-medium shadow-xl backdrop-blur-md flex items-center gap-2 animate-in fade-in slide-in-from-top-2 duration-200">
                    <span>{error}</span>
                    <button
                      type="button"
                      onClick={() => setError(null)}
                      className="p-1 hover:text-white cursor-pointer"
                    >
                      <X className="w-3.5 h-3.5" />
                    </button>
                  </div>
                )}

                {/* Audio Fallback Notice Pill */}
                {audioNotice && (
                  <div className="absolute top-4 left-1/2 -translate-x-1/2 z-50 bg-neutral-900/95 border border-white/20 text-neutral-200 px-4 py-2 rounded-full text-xs font-medium shadow-xl backdrop-blur-md flex items-center gap-2 animate-in fade-in slide-in-from-top-2 duration-200">
                    <span>{audioNotice}</span>
                    <button
                      type="button"
                      onClick={() => setAudioNotice(null)}
                      className="p-1 hover:text-white cursor-pointer"
                    >
                      <X className="w-3.5 h-3.5" />
                    </button>
                  </div>
                )}

                {/* Automatic Timeline Mismatch / VIP Conversion Prompt for Movies */}
                {type === "movie" && isRuntimeMismatch && !isMismatchDismissed && (
                  <div className="absolute inset-0 z-40 bg-black/85 backdrop-blur-md flex items-center justify-center p-4">
                    <div
                      className="w-full max-w-md bg-neutral-900/95 border border-white/20 rounded-2xl p-5 sm:p-6 shadow-[0_0_50px_rgba(255,255,255,0.15)] flex flex-col items-center text-center relative"
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

                      <div className="w-12 h-12 rounded-2xl bg-white/10 border border-white/20 flex items-center justify-center text-white mb-3 shadow-[0_0_20px_rgba(255,255,255,0.15)]">
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
                          className="w-full flex-1 py-2.5 px-4 rounded-xl bg-white hover:bg-neutral-200 text-neutral-950 text-xs font-black uppercase tracking-wider flex items-center justify-center gap-1.5 shadow-[0_0_20px_rgba(255,255,255,0.25)] transition-all cursor-pointer"
                        >
                          <Sparkles className="w-4 h-4 text-neutral-950" />
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

          {/* Season & Episode Selector Section (Unified with VIP Series) */}
          {type !== "movie" && (
            <div className="mt-8">
              <SeasonEpisodeSelector
                tvId={String(tmdbId || "")}
                seasons={tmdbSeasons || []}
                currentSeason={currentSeason}
                currentEpisode={currentEpisode}
                onEpisodeSelect={handleEpisodeSelect}
              />
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
            className="w-full max-w-[340px] sm:max-w-sm bg-neutral-900/95 border border-white/20 rounded-2xl sm:rounded-3xl p-5 sm:p-6 shadow-[0_0_50px_rgba(255,255,255,0.15)] flex flex-col items-center text-center relative backdrop-blur-xl animate-in fade-in zoom-in-95 duration-200"
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
            <div className="w-11 h-11 sm:w-12 sm:h-12 rounded-full bg-white/10 border border-white/20 flex items-center justify-center text-white mb-3 shadow-[0_0_15px_rgba(255,255,255,0.15)]">
              <Sparkles className="w-5 h-5 sm:w-6 sm:h-6 text-white" />
            </div>

            <h3 className="text-base sm:text-lg font-black text-white mb-1 tracking-tight">Enter VIP Passkey</h3>
            <p className="text-xs text-neutral-400 mb-4 px-2">
              Enter <span className="text-white font-bold font-mono px-1.5 py-0.5 bg-white/10 rounded border border-white/20">123</span> to unlock dedicated 4K VIP Cinema servers.
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
                    router.push(
                      `/watch/servers/${tmdbId}?type=${type || "tv"}&season=${currentSeason}&episode=${currentEpisode}`
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
                className="w-full bg-black/80 border border-white/15 focus:border-white rounded-xl px-4 py-2.5 sm:py-3 text-center text-white font-mono tracking-widest text-base sm:text-lg focus:outline-none transition-all shadow-inner placeholder:tracking-normal placeholder:text-neutral-500"
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
                  className="flex-1 py-2.5 rounded-xl bg-white hover:bg-neutral-200 text-neutral-950 text-xs sm:text-sm font-black transition-all shadow-[0_0_15px_rgba(255,255,255,0.25)] hover:shadow-[0_0_20px_rgba(255,255,255,0.4)] cursor-pointer active:scale-95"
                >
                  Unlock VIP
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>,
    document.body
  );
}

