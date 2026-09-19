"use client";

import React, { useState, useEffect } from "react";
import { X, Play, Loader } from "lucide-react";
import { useRouter } from "next/navigation";
import VidstackPlayer from "./VidstackPlayer";
import { installAdblockProtection } from "../utils/adblockFramework";

interface PlayeranimeProps {
  animeTitle: string;
  tmdbId?: string | number;
  type?: "tv" | "movie";
  onClose: () => void;
}

export default function Playeranime({
  animeTitle,
  tmdbId,
  type,
  onClose,
}: PlayeranimeProps) {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [anilistId, setAnilistId] = useState<number | null>(null);
  const [episodes, setEpisodes] = useState<any[]>([]);
  const [selectedProvider, setSelectedProvider] = useState<string | null>(null);
  const [selectedEpisodeId, setSelectedEpisodeId] = useState<string | null>(
    null,
  );

  const [streamUrl, setStreamUrl] = useState<string | null>(null);
  const [subtitles, setSubtitles] = useState<any[]>([]);
  const [isIframe, setIsIframe] = useState<boolean>(false);
  const [hasAbsorbedClick, setHasAbsorbedClick] = useState<boolean>(false);

  // Helper to fetch with timeout
  const fetchWithTimeout = async (
    url: string,
    options: any = {},
    timeoutMs = 30000,
  ) => {
    const controller = new AbortController();
    const id = setTimeout(() => controller.abort(new Error("Request timed out after " + timeoutMs + "ms")), timeoutMs);
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

  const [animeData, setAnimeData] = useState<any>(null);
  const [audioType, setAudioType] = useState<"sub" | "dub">("sub");

  // Helper to extract episodes based on preferences
  const loadEpisodes = (
    data: any,
    audio: "sub" | "dub",
    currentProvider: string | null,
  ) => {
    // anikoto and reanime are the most reliable fast providers
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
            }
          }
        `;
        const searchRes = await fetch("https://graphql.anilist.co", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ query, variables: { search: animeTitle } }),
        });

        const searchData = await searchRes.json();
        const mediaId = searchData.data?.Media?.id;

        if (!mediaId) {
          setError("Anime not found on AniList.");
          setLoading(false);
          return;
        }

        setAnilistId(mediaId);

        const epRes = await fetchWithTimeout(
          `http://localhost:4000/episodes/anikoto/reanime/animegg/${mediaId}`,
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

  // Handle Audio Type change
  const handleAudioChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const type = e.target.value as "sub" | "dub";
    setAudioType(type);
    if (animeData) {
      loadEpisodes(animeData, type, selectedProvider);
    }
  };

  // Handle Provider change
  const handleProviderChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const provider = e.target.value;
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

        // selectedEpisodeId is something like "watch/anikoto/11061/sub/anikoto-1"
        // Since Anivexa returns the full path in 'id', we can just use it directly!
        const res = await fetch(`http://localhost:4000/${selectedEpisodeId}`);
        const streamData = await res.json();

        let allTracks = [];

        if (streamData.subtitles && Array.isArray(streamData.subtitles)) {
          const rawTracks = streamData.subtitles.map((sub: any) => ({
            src: `/api/subtitle/proxy?url=${encodeURIComponent(sub.url)}`,
            label: sub.lang || sub.label || sub.language || "Subtitle",
            kind: "subtitles",
            language: sub.lang || sub.srclang || "en",
            default: sub.default || false,
            type: "vtt", // /api/subtitle/proxy always converts to vtt
          }));

          // Ensure unique labels to prevent Vidstack key collision
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
          // Fast background check for valid subtitles before streaming starts
          const workingTracks: any[] = [];
          await Promise.allSettled(
            rawTracks.map(async (track: any) => {
              try {
                const controller = new AbortController();
                const id = setTimeout(() => controller.abort(new Error("Timeout checking subtitle")), 3000);
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

        // Fetch VIP and Direct4K subtitles asynchronously in the background so it doesn't block the video
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

              // Extract VIP subs
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

              // Extract Direct4K subs
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
                // Check them fast
                Promise.allSettled(
                  combinedSubs.map(async (track: any) => {
                    try {
                      const controller = new AbortController();
                      const id = setTimeout(() => controller.abort(new Error("Timeout checking subtitle")), 3000);
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

                      // Ensure unique labels to prevent Vidstack key collision
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

                      // Re-apply CC prioritization
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
            streamData.streams?.find((s: any) => s.url === directHls)
              ?.referer ||
            "";
          const headers: Record<string, string> = {};
          if (referer) headers["Referer"] = referer;
          const proxiedUrl = `/api/stream/proxy.m3u8?url=${encodeURIComponent(directHls)}&headers=${encodeURIComponent(JSON.stringify(headers))}`;

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

  const sortedSubtitles = [...subtitles].sort((a, b) => {
    const labelA = (a.label || "English").toLowerCase();
    const labelB = (b.label || "English").toLowerCase();
    const isEngA = labelA.includes("english") || labelA.includes("eng");
    const isEngB = labelB.includes("english") || labelB.includes("eng");

    if (isEngA && !isEngB) return -1;
    if (!isEngA && isEngB) return 1;
    return labelA.localeCompare(labelB);
  });

  return (
    <div
      style={{
        position: "fixed",
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        backgroundColor: "#000",
        zIndex: 999999,
        display: "flex",
        flexDirection: "column",
      }}
    >
      <div
        style={{
          padding: "1rem",
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          background: "rgba(0,0,0,0.8)",
          color: "white",
        }}
      >
        <h2 style={{ margin: 0, fontSize: "1.2rem" }}>{animeTitle}</h2>
        <div style={{ display: "flex", alignItems: "center", gap: "1rem" }}>


          {tmdbId && (
            <button
              onClick={() => {
                const code = window.prompt("Enter VIP Access Code:");
                if (code === "456") {
                  router.push(
                    `/watch/servers/${tmdbId}?type=${type || "tv"}&season=1&episode=1`,
                  );
                } else if (code !== null) {
                  alert("Invalid VIP code!");
                }
              }}
              style={{
                background: "linear-gradient(45deg, #FFD700, #FFA500)",
                border: "none",
                color: "#000",
                padding: "0.4rem 1rem",
                borderRadius: "8px",
                fontWeight: "bold",
                cursor: "pointer",
              }}
            >
              VIP Server
            </button>
          )}
          <button
            onClick={onClose}
            style={{
              background: "none",
              border: "none",
              color: "white",
              cursor: "pointer",
              padding: "0.5rem",
            }}
          >
            <X size={24} />
          </button>
        </div>
      </div>

      <div
        style={{
          flex: 1,
          display: "flex",
          flexDirection: "column",
          padding: "1rem",
          color: "white",
          overflowY: "auto",
        }}
      >
        <div
          style={{
            flex: 1,
            backgroundColor: "#000",
            borderRadius: "12px",
            overflow: "hidden",
            position: "relative",
            minHeight: "60vh",
          }}
        >
          {loading && (
            <div
              style={{
                position: "absolute",
                inset: 0,
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
              }}
            >
              <Loader size={32} className="animate-spin text-amber-500" />
            </div>
          )}
          {error && (
            <div
              style={{
                position: "absolute",
                inset: 0,
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                color: "#ef4444",
              }}
            >
              {error}
            </div>
          )}

          {streamUrl &&
            (isIframe ? (
              <>
                {!hasAbsorbedClick && (
                  <div
                    style={{
                      position: "absolute",
                      inset: 0,
                      zIndex: 50,
                      cursor: "pointer",
                    }}
                    onClick={(e) => {
                      e.stopPropagation();
                      setHasAbsorbedClick(true);
                    }}
                    title="Click to play"
                  />
                )}
                <iframe
                  src={streamUrl}
                  style={{ width: "100%", height: "100%", border: "none" }}
                  allowFullScreen
                />
              </>
            ) : (
              <div className="relative w-full h-full">
                <div className="absolute top-4 right-4 z-50 bg-black/60 backdrop-blur-md px-3 py-1.5 rounded-lg border border-white/10 flex items-center gap-2">
                  <span className="text-white text-xs font-semibold uppercase tracking-wider">Audio:</span>
                  <select
                    value={audioType}
                    onChange={(e) => {
                      const val = e.target.value as "sub" | "dub";
                      setAudioType(val);
                      if (animeData) {
                        loadEpisodes(animeData, val, selectedProvider);
                      }
                    }}
                    className="bg-transparent text-amber-500 font-bold text-sm outline-none cursor-pointer"
                  >
                    <option value="sub" className="bg-neutral-900 text-white">Sub (Japanese)</option>
                    <option value="dub" className="bg-neutral-900 text-white">Dub (English)</option>
                  </select>
                </div>
                <VidstackPlayer
                  src={streamUrl}
                  tracks={sortedSubtitles}
                  autoPlay={true}
                  title={animeTitle}
                  className="w-full h-full"
                />
              </div>
            ))}
        </div>

        {episodes.length > 0 && (
          <div style={{ marginTop: "2rem" }}>
            <h3 style={{ marginBottom: "1rem" }}>Episodes</h3>
            <div style={{ display: "flex", flexWrap: "wrap", gap: "0.5rem" }}>
              {episodes.map((ep: any) => (
                <button
                  key={ep.id}
                  onClick={() => setSelectedEpisodeId(ep.id)}
                  style={{
                    padding: "0.5rem 1rem",
                    background:
                      selectedEpisodeId === ep.id ? "#E50914" : "#333",
                    color: "white",
                    border: "none",
                    borderRadius: "4px",
                    cursor: "pointer",
                  }}
                >
                  {ep.number}. {ep.title || "Episode"}
                </button>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
