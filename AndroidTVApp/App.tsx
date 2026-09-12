import React, { useState, useEffect } from 'react';
import {
  SafeAreaView,
  ScrollView,
  StatusBar,
  StyleSheet,
  Text,
  View,
  FlatList,
  Image,
  TouchableHighlight,
  ActivityIndicator,
  BackHandler,
} from 'react-native';
import Video from 'react-native-video';

const BACKEND_URL = 'https://streamnet-nine.vercel.app/'; // Android Emulator to host localhost

interface MediaItem {
  id: number;
  title?: string;
  name?: string;
  poster_path: string;
}

const SidebarItem = ({ title, isActive, onPress }: { title: string; isActive: boolean; onPress: () => void }) => {
  const [isFocused, setIsFocused] = useState(false);

  return (
    <TouchableHighlight
      onFocus={() => setIsFocused(true)}
      onBlur={() => setIsFocused(false)}
      onPress={onPress}
      style={[
        styles.sidebarItem,
        isActive && styles.sidebarItemActive,
        isFocused && styles.sidebarItemFocused,
      ]}
      underlayColor="transparent"
    >
      <Text
        style={[
          styles.sidebarText,
          isActive && styles.sidebarTextActive,
          isFocused && styles.sidebarTextFocused,
        ]}
      >
        {title}
      </Text>
    </TouchableHighlight>
  );
};

const Sidebar = ({ currentRoute, onRouteChange }: { currentRoute: string; onRouteChange: (r: string) => void }) => {
  const menuItems = [
    { id: 'home', title: 'Home' },
    { id: 'movies', title: 'Movies' },
    { id: 'series', title: 'Series' },
    { id: 'search', title: 'Search' },
  ];

  return (
    <View style={styles.sidebarContainer}>
      <Text style={styles.logo}>S-Net</Text>
      <View style={styles.sidebarMenu}>
        {menuItems.map((item) => (
          <SidebarItem
            key={item.id}
            title={item.title}
            isActive={currentRoute === item.id}
            onPress={() => onRouteChange(item.id)}
          />
        ))}
      </View>
    </View>
  );
};

const PosterCard = ({ item, onPlay }: { item: MediaItem, onPlay: (item: MediaItem) => void }) => {
  const [isFocused, setIsFocused] = useState(false);

  return (
    <TouchableHighlight
      onFocus={() => setIsFocused(true)}
      onBlur={() => setIsFocused(false)}
      onPress={() => onPlay(item)}
      style={[styles.card, isFocused && styles.cardFocused]}
      underlayColor="transparent"
    >
      <View>
        <Image
          source={{ uri: `https://image.tmdb.org/t/p/w500${item.poster_path}` }}
          style={[styles.poster, isFocused && styles.posterFocused]}
        />
        <Text style={[styles.title, isFocused && styles.titleFocused]} numberOfLines={2}>
          {item.title || item.name}
        </Text>
      </View>
    </TouchableHighlight>
  );
};

const Section = ({ title, data, onPlay }: { title: string; data: MediaItem[], onPlay: (item: MediaItem) => void }) => {
  return (
    <View style={styles.sectionContainer}>
      <Text style={styles.sectionTitle}>{title}</Text>
      <FlatList
        horizontal
        data={data}
        keyExtractor={(item) => item.id.toString()}
        renderItem={({ item }) => <PosterCard item={item} onPlay={onPlay} />}
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.listContainer}
      />
    </View>
  );
};

const formatStreamUrl = (rawUrl: string, proxyUrl?: string): { url: string, headers?: any } => {
  if (!rawUrl) return { url: '' };
  let headers: any = undefined;

  // If a proxy URL is provided, we can extract the required headers from its query parameters
  // so that the Android TV player can connect directly to the source provider (bypassing Vercel lag).
  if (proxyUrl && proxyUrl.includes('headers=')) {
    try {
      const match = proxyUrl.match(/headers=([^&]+)/);
      if (match && match[1]) {
        headers = JSON.parse(decodeURIComponent(match[1]));
      }
    } catch (e) {
      console.warn("Failed to parse headers from proxy URL");
    }
  }

  return { url: rawUrl, headers };
};

// Simple Video Player Screen
const VideoPlayerScreen = ({ media, onClose }: { media: MediaItem, onClose: () => void }) => {
  const [isLoading, setIsLoading] = useState(true);
  const [sources, setSources] = useState<Array<{ provider?: string; url: string; headers?: any }>>([]);
  const [currentSourceIndex, setCurrentSourceIndex] = useState(0);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  // Fetch real video URLs on mount
  useEffect(() => {
    const fetchVideoUrl = async () => {
      try {
        let candidateUrls: Array<{ provider?: string; url: string; headers?: any }> = [];

        // 1. Try auto-resolve API from backend
        const res = await fetch(`${BACKEND_URL}/api/stream/auto-resolve?id=${media.id}&type=movie`);
        if (res.ok) {
          const data = await res.json();
          if (Array.isArray(data.sources) && data.sources.length > 0) {
            data.sources.forEach((s: any) => {
              const u = s.rawUrl || s.streamUrl || s.url;
              if (u) {
                const formatted = formatStreamUrl(u, s.url);
                candidateUrls.push({ provider: s.provider || s.name, url: formatted.url, headers: formatted.headers });
              }
            });
          } else if (data.streamUrl) {
            const formatted = formatStreamUrl(data.rawUrl || data.streamUrl, data.streamUrl);
            candidateUrls.push({ provider: data.provider, url: formatted.url, headers: formatted.headers });
          }
        }
        
        // 2. Fallback to direct backend API
        if (candidateUrls.length === 0) {
          const directRes = await fetch(`${BACKEND_URL}/api/direct/movie/${media.id}`);
          if (directRes.ok) {
            const directData = await directRes.json();
            if (directData && Array.isArray(directData.sources)) {
              directData.sources.forEach((s: any) => {
                const u = s.rawUrl || s.url || s.streamUrl;
                if (u) {
                  const formatted = formatStreamUrl(u, s.url);
                  candidateUrls.push({ provider: s.name || s.provider, url: formatted.url, headers: formatted.headers });
                }
              });
            }
          }
        }

        if (candidateUrls.length > 0) {
          setSources(candidateUrls);
          setCurrentSourceIndex(0);
        } else {
          setErrorMsg("Failed to find any stream sources for this movie.");
        }
      } catch (e) {
        console.error("Stream fetch error:", e);
        setErrorMsg("Network error finding stream.");
      }
    };
    fetchVideoUrl();
  }, [media.id]);

  // Handle Android TV Back Button to exit player
  useEffect(() => {
    const backAction = () => {
      onClose();
      return true;
    };
    const backHandler = BackHandler.addEventListener('hardwareBackPress', backAction);
    return () => backHandler.remove();
  }, [onClose]);

  const handlePlaybackError = (e: any) => {
    console.warn(`Playback error on source ${currentSourceIndex} (${sources[currentSourceIndex]?.provider}):`, e);
    if (currentSourceIndex + 1 < sources.length) {
      console.log(`Fallback: Switching to source ${currentSourceIndex + 1} (${sources[currentSourceIndex + 1]?.provider})`);
      setIsLoading(true);
      setCurrentSourceIndex((prev) => prev + 1);
    } else {
      const errStr = e.error?.errorString || e.error?.errorException || 'Unknown playback error';
      setErrorMsg(`Playback failed on all ${sources.length} sources.\nLast error: ${errStr}`);
      setIsLoading(false);
    }
  };

  const currentSource = sources[currentSourceIndex];

  return (
    <View style={styles.playerContainer}>
      {currentSource ? (
        <Video
          key={currentSource.url}
          source={{
            uri: currentSource.url,
            type: currentSource.url.includes('.m3u8') || currentSource.url.includes('manifest=1') ? 'm3u8' : undefined,
            headers: currentSource.headers
          }}
          style={styles.fullScreenVideo}
          controls={true}
          resizeMode="contain"
          onLoadStart={() => setIsLoading(true)}
          onLoad={() => setIsLoading(false)}
          onError={handlePlaybackError}
          autoPlay={true}
          bufferConfig={{
            minBufferMs: 60000,
            maxBufferMs: 120000,
            bufferForPlaybackMs: 5000,
            bufferForPlaybackAfterRebufferMs: 10000
          }}
        />
      ) : errorMsg ? (
        <View style={styles.playerLoadingOverlay}>
          <Text style={{ color: '#fff', fontSize: 18, textAlign: 'center', paddingHorizontal: 20 }}>{errorMsg}</Text>
        </View>
      ) : null}

      {isLoading && !errorMsg && (
        <View style={styles.playerLoadingOverlay}>
          <ActivityIndicator size="large" color="#e50914" />
          <Text style={{ color: '#fff', marginTop: 10 }}>
            Preparing {media.title || media.name} Stream{currentSource?.provider ? ` (${currentSource.provider})` : ''}...
          </Text>
        </View>
      )}
    </View>
  );
};

function App(): React.JSX.Element {
  const [currentRoute, setCurrentRoute] = useState('home');
  const [trendingMovies, setTrendingMovies] = useState<MediaItem[]>([]);
  const [trendingTv, setTrendingTv] = useState<MediaItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [playingMedia, setPlayingMedia] = useState<MediaItem | null>(null);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const [moviesRes, tvRes] = await Promise.all([
          fetch(`${BACKEND_URL}/api/movies/trending`),
          fetch(`${BACKEND_URL}/api/tv/trending`),
        ]);

        if (moviesRes.ok) {
          const moviesData = await moviesRes.json();
          setTrendingMovies(moviesData.results || []);
        }

        if (tvRes.ok) {
          const tvData = await tvRes.json();
          setTrendingTv(tvData.results || []);
        }
      } catch (error) {
        console.error('Error fetching data:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, []);

  if (playingMedia) {
    return (
      <SafeAreaView style={styles.backgroundStyle}>
        <StatusBar hidden={true} />
        <VideoPlayerScreen media={playingMedia} onClose={() => setPlayingMedia(null)} />
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.backgroundStyle}>
      <StatusBar barStyle="light-content" hidden={true} />

      <View style={styles.mainLayout}>
        <Sidebar currentRoute={currentRoute} onRouteChange={setCurrentRoute} />

        <View style={styles.contentContainer}>
          <View style={styles.header}>
            <Text style={styles.headerText}>
              {currentRoute === 'home' ? 'Discover' : currentRoute.charAt(0).toUpperCase() + currentRoute.slice(1)}
            </Text>
          </View>

          {loading ? (
            <View style={styles.loadingContainer}>
              <ActivityIndicator size="large" color="#e50914" />
            </View>
          ) : (
            <ScrollView style={styles.scrollContent}>
              {currentRoute === 'home' || currentRoute === 'movies' ? (
                <Section title="Trending Movies" data={trendingMovies} onPlay={setPlayingMedia} />
              ) : null}
              {currentRoute === 'home' || currentRoute === 'series' ? (
                <Section title="Trending Series" data={trendingTv} onPlay={setPlayingMedia} />
              ) : null}
            </ScrollView>
          )}
        </View>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  backgroundStyle: {
    flex: 1,
    backgroundColor: '#0f0f0f',
  },
  mainLayout: {
    flex: 1,
    flexDirection: 'row',
  },
  sidebarContainer: {
    width: 200,
    backgroundColor: '#000000',
    paddingTop: 30,
    alignItems: 'center',
    borderRightWidth: 1,
    borderRightColor: '#222',
  },
  logo: {
    color: '#e50914',
    fontSize: 28,
    fontWeight: 'bold',
    marginBottom: 40,
  },
  sidebarMenu: {
    width: '100%',
  },
  sidebarItem: {
    paddingVertical: 15,
    paddingHorizontal: 20,
    width: '100%',
    borderLeftWidth: 4,
    borderLeftColor: 'transparent',
  },
  sidebarItemActive: {
    borderLeftColor: '#e50914',
    backgroundColor: '#1a1a1a',
  },
  sidebarItemFocused: {
    backgroundColor: '#333333',
    transform: [{ scale: 1.05 }],
  },
  sidebarText: {
    color: '#888888',
    fontSize: 18,
  },
  sidebarTextActive: {
    color: '#ffffff',
    fontWeight: 'bold',
  },
  sidebarTextFocused: {
    color: '#ffffff',
  },
  contentContainer: {
    flex: 1,
    backgroundColor: '#0f0f0f',
  },
  scrollContent: {
    flex: 1,
  },
  header: {
    padding: 30,
    paddingBottom: 10,
  },
  headerText: {
    color: '#ffffff',
    fontSize: 36,
    fontWeight: 'bold',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  sectionContainer: {
    marginTop: 20,
    marginBottom: 20,
  },
  sectionTitle: {
    color: '#ffffff',
    fontSize: 22,
    fontWeight: 'bold',
    marginLeft: 30,
    marginBottom: 15,
  },
  listContainer: {
    paddingLeft: 30,
    paddingRight: 30,
  },
  card: {
    marginRight: 20,
    borderRadius: 8,
    alignItems: 'center',
    width: 160,
  },
  cardFocused: {
    transform: [{ scale: 1.05 }],
  },
  poster: {
    width: 160,
    height: 240,
    borderRadius: 8,
    borderWidth: 3,
    borderColor: 'transparent',
  },
  posterFocused: {
    borderColor: '#ffffff',
    borderWidth: 3,
  },
  title: {
    color: '#a3a3a3',
    fontSize: 14,
    marginTop: 8,
    textAlign: 'center',
    width: 150,
  },
  titleFocused: {
    color: '#ffffff',
    fontWeight: 'bold',
  },
  playerContainer: {
    flex: 1,
    backgroundColor: 'black',
  },
  fullScreenVideo: {
    flex: 1,
    width: '100%',
    height: '100%',
  },
  playerLoadingOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0,0,0,0.8)',
    justifyContent: 'center',
    alignItems: 'center',
  },
});

export default App;

