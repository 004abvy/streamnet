'use client';

import { useState, useEffect, useRef, Suspense } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import PosterGrid from '../../components/PosterGrid/PosterGrid';
import Pagination from '../../components/Pagination/Pagination';
import Footer from '../../components/Footer/Footer';
import DomeGallery from '../../components/reactbits/DomeGallery';
import styles from './search.module.css';

function SearchContent() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const queryParam = searchParams.get('q') || '';
  const pageParam = parseInt(searchParams.get('page') || '1', 10);

  const [inputQuery, setInputQuery] = useState(queryParam);
  const [suggestions, setSuggestions] = useState<any[]>([]);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [isInputFocused, setIsInputFocused] = useState(false);
  const [results, setResults] = useState<any[]>([]);
  const [totalPages, setTotalPages] = useState(1);
  const [loading, setLoading] = useState(false);
  const [trendingPosters, setTrendingPosters] = useState<any[]>([]);
  const trendingMoviesRef = useRef<any[]>([]);
  const searchBoxRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  // Close suggestions on outside click
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (searchBoxRef.current && !searchBoxRef.current.contains(event.target as Node)) {
        setShowSuggestions(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Fetch trending posters for dome gallery
  useEffect(() => {
    fetch('/api/movies/trending')
      .then(res => res.json())
      .then(data => {
        if (data && data.results) {
          const filtered = data.results.filter((m: any) => m.poster_path);
          const posters = filtered.map((m: any) => ({
              src: `https://image.tmdb.org/t/p/w780${m.poster_path}`,
              alt: m.title || m.name
            }));
          trendingMoviesRef.current = filtered.map((m: any) => ({
            id: m.id,
            media_type: m.media_type || 'movie',
            title: m.title || m.name
          }));
          setTrendingPosters(posters);
        }
      })
      .catch(err => console.warn('Trending fetch error:', err));
  }, []);

  // Fetch full search results when queryParam or pageParam in URL changes
  useEffect(() => {
    setInputQuery(queryParam);
    setShowSuggestions(false);
    setSuggestions([]);
    if (!queryParam) {
      setResults([]);
      setTotalPages(1);
      setLoading(false);
      return;
    }

    setLoading(true);

    fetch(`/api/search?q=${encodeURIComponent(queryParam)}&page=${pageParam}`)
      .then(res => res.ok ? res.json() : null)
      .then((tmdbData) => {
        const filtered = tmdbData?.results?.filter((item: any) => item.media_type === 'movie' || item.media_type === 'tv' || item.poster_path) || [];
        setResults(filtered);
        setTotalPages(Math.min(tmdbData?.total_pages || 1, 500));
        setLoading(false);
      })
      .catch(err => {
        console.warn("Search failed:", err);
        setResults([]);
        setTotalPages(1);
        setLoading(false);
      });
  }, [queryParam, pageParam]);

  // Fetch suggestions live as user types in the input box
  useEffect(() => {
    if (!isInputFocused || !inputQuery.trim() || inputQuery.trim().length < 2) {
      setSuggestions([]);
      setShowSuggestions(false);
      return;
    }

    const timer = setTimeout(() => {
      fetch(`/api/search?q=${encodeURIComponent(inputQuery.trim())}`)
        .then(res => res.ok ? res.json() : null)
        .then(data => {
          if (data && data.results) {
            const filtered = data.results
              .filter((item: any) => item.media_type === 'movie' || item.media_type === 'tv')
              .slice(0, 6);
            setSuggestions(filtered);
            setShowSuggestions(true);
          } else {
            setSuggestions([]);
            setShowSuggestions(false);
          }
        })
        .catch(err => {
          console.warn("Live suggestions error:", err);
          setSuggestions([]);
          setShowSuggestions(false);
        });
    }, 200);

    return () => clearTimeout(timer);
  }, [inputQuery, isInputFocused]);

  const handleSearchFormSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (inputQuery.trim()) {
      setShowSuggestions(false);
      setSuggestions([]);
      inputRef.current?.blur();
      router.push(`/search?q=${encodeURIComponent(inputQuery.trim())}`);
    }
  };

  const handleSelectSuggestion = (item: any) => {
    setShowSuggestions(false);
    if (item.media_type === 'tv') {
      router.push(`/tv/${item.id}`);
    } else {
      router.push(`/movie/${item.id}`);
    }
  };

  const handlePageChange = (newPage: number) => {
    window.scrollTo({ top: 0, behavior: 'smooth' });
    router.push(`/search?q=${encodeURIComponent(queryParam)}&page=${newPage}`);
  };

  return (
    <div className={styles.content}>
      <div style={{ maxWidth: '650px', margin: '0 auto 2.5rem auto', padding: '0 1rem', position: 'relative', zIndex: 10 }} ref={searchBoxRef}>
        <form onSubmit={handleSearchFormSubmit} style={{ display: 'flex', gap: '0.5rem' }}>
          <input
            ref={inputRef}
            type="text"
            value={inputQuery}
            onChange={(e) => {
              setInputQuery(e.target.value);
              if (!e.target.value.trim()) {
                setShowSuggestions(false);
                setSuggestions([]);
              }
            }}
            onFocus={() => {
              setIsInputFocused(true);
              if (inputQuery.trim().length >= 2 && suggestions.length > 0) {
                setShowSuggestions(true);
              }
            }}
            onBlur={() => {
              setTimeout(() => setIsInputFocused(false), 200);
            }}
            placeholder="Search for movies, TV shows, anime..."
            style={{
              flex: 1,
              padding: '0.8rem 1.5rem',
              borderRadius: '9999px',
              border: '1px solid rgba(255, 255, 255, 0.18)',
              background: 'rgba(18, 18, 24, 0.55)',
              backdropFilter: 'blur(28px) saturate(220%) contrast(112%)',
              WebkitBackdropFilter: 'blur(28px) saturate(220%) contrast(112%)',
              boxShadow: '0 20px 50px rgba(0, 0, 0, 0.5), inset 0 1.5px 1px rgba(255, 255, 255, 0.3), inset 0 -1px 2px rgba(255, 255, 255, 0.1), 0 0 15px rgba(255, 255, 255, 0.05)',
              color: '#fff',
              fontSize: '1rem',
              outline: 'none',
              transition: 'all 0.3s ease'
            }}
          />
          <button
            type="submit"
            style={{
              padding: '0.8rem 1.8rem',
              borderRadius: '9999px',
              border: 'none',
              background: '#f59e0b',
              color: '#000',
              fontWeight: 'bold',
              cursor: 'pointer',
              fontSize: '0.95rem',
              boxShadow: '0 4px 15px rgba(245, 158, 11, 0.4)',
              transition: 'all 0.3s ease'
            }}
          >
            Search
          </button>
        </form>

        {/* Live Search Suggestions Dropdown */}
        {showSuggestions && suggestions.length > 0 && (
          <div style={{
            position: 'absolute',
            top: 'calc(100% + 12px)',
            left: '1rem',
            right: '1rem',
            background: 'rgba(18, 18, 24, 0.75)',
            backdropFilter: 'blur(28px) saturate(220%) contrast(112%)',
            WebkitBackdropFilter: 'blur(28px) saturate(220%) contrast(112%)',
            border: '1px solid rgba(255, 255, 255, 0.18)',
            borderRadius: '24px',
            boxShadow: '0 20px 50px rgba(0, 0, 0, 0.5), inset 0 1.5px 1px rgba(255, 255, 255, 0.3), inset 0 -1px 2px rgba(255, 255, 255, 0.1)',
            zIndex: 100,
            overflow: 'hidden'
          }}>
            {suggestions.map((item) => {
              const year = (item.release_date || item.first_air_date || '').split('-')[0];
              const poster = item.poster_path
                ? `https://image.tmdb.org/t/p/w92${item.poster_path}`
                : 'https://images.unsplash.com/photo-1574375927938-d5a98e8ffe85?w=100&auto=format&fit=crop';

              return (
                <div
                  key={item.id}
                  onClick={() => handleSelectSuggestion(item)}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '1rem',
                    padding: '0.85rem 1.2rem',
                    cursor: 'pointer',
                    borderBottom: '1px solid rgba(255, 255, 255, 0.08)',
                    transition: 'background 0.2s',
                  }}
                  onMouseEnter={(e) => (e.currentTarget.style.background = 'rgba(255, 255, 255, 0.1)')}
                  onMouseLeave={(e) => (e.currentTarget.style.background = 'transparent')}
                >
                  <img
                    src={poster}
                    alt={item.title || item.name}
                    style={{
                      width: '42px',
                      height: '62px',
                      objectFit: 'cover',
                      borderRadius: '6px',
                      backgroundColor: '#222',
                      flexShrink: 0
                    }}
                    onError={(e) => {
                      const target = e.target as HTMLImageElement;
                      target.onerror = null;
                      target.src = 'https://images.unsplash.com/photo-1574375927938-d5a98e8ffe85?w=100&auto=format&fit=crop';
                    }}
                  />
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '0.25rem', overflow: 'hidden' }}>
                    <div style={{ fontSize: '0.92rem', fontWeight: 600, color: '#fff', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                      {item.title || item.name}
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: '0.78rem', color: '#aaa' }}>
                      <span style={{ background: 'rgba(245, 158, 11, 0.15)', color: '#f59e0b', fontWeight: 'bold', padding: '1px 5px', borderRadius: '4px', fontSize: '0.72rem' }}>
                        {item.media_type === 'tv' ? 'TV Show' : 'Movie'}
                      </span>
                      {year && <span>• {year}</span>}
                      {item.vote_average > 0 && (
                        <span style={{ color: '#f59e0b', fontWeight: 'bold' }}>
                          ★ {item.vote_average.toFixed(1)}
                        </span>
                      )}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {loading || results.length > 0 ? (
        <>
          <PosterGrid title={queryParam ? `Search Results for "${queryParam}"` : ''} movies={results} isLoading={loading} />
          {!loading && totalPages > 1 && (
            <div style={{ marginTop: '2.5rem', marginBottom: '3rem' }}>
              <Pagination page={pageParam} totalPages={totalPages} onPageChange={handlePageChange} />
            </div>
          )}
          <Footer />
        </>
      ) : queryParam ? (
        <div className={styles.emptyState}>
          <h2>No results found</h2>
          <p>We couldn't find anything matching "{queryParam}". Try another search term above.</p>
        </div>
      ) : (
        <div style={{ position: 'fixed', top: 0, left: 0, width: '100vw', height: '100vh', zIndex: 0, overflow: 'hidden' }}>
          {trendingPosters.length > 0 && (
            <DomeGallery
              images={trendingPosters}
              autoRotate={true}
              autoRotateSpeed={0.05}
              grayscale={false}
              minRadius={800}
              fit={1.2}
              fitBasis="width"
              overlayBlurColor="#000000"
              onImageClick={(index) => {
                const movies = trendingMoviesRef.current;
                if (movies.length === 0) return;
                const movie = movies[index % movies.length];
                if (movie.media_type === 'tv') {
                  router.push(`/tv/${movie.id}`);
                } else {
                  router.push(`/movie/${movie.id}`);
                }
              }}
            />
          )}
        </div>
      )}
    </div>
  );
}

export default function SearchPage() {
  return (
    <main className={styles.container}>
      <Suspense fallback={<div className={styles.content}><div className={styles.loading}>Loading...</div></div>}>
        <SearchContent />
      </Suspense>
    </main>
  );
}
