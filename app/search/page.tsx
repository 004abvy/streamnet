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

  let initialSearch = queryParam;
  let initialYear = '';
  const yearMatch = queryParam.match(/\b(19\d{2}|20\d{2})\b$/);
  if (yearMatch) {
    initialYear = yearMatch[1];
    initialSearch = queryParam.replace(yearMatch[0], '').trim();
  }

  const [inputQuery, setInputQuery] = useState(initialSearch);
  const [inputYear, setInputYear] = useState(initialYear);
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
  const [showDome, setShowDome] = useState(false);

  // Delay DomeGallery rendering until page transition completes
  useEffect(() => {
    const timer = setTimeout(() => setShowDome(true), 600);
    return () => clearTimeout(timer);
  }, []);

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
    let newSearch = queryParam;
    let newYear = '';
    const ym = queryParam.match(/\b(19\d{2}|20\d{2})\b$/);
    if (ym) {
      newYear = ym[1];
      newSearch = queryParam.replace(ym[0], '').trim();
    }
    
    setInputQuery(newSearch);
    setInputYear(newYear);
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
    const fullQuery = inputYear.trim() ? `${inputQuery.trim()} ${inputYear.trim()}` : inputQuery.trim();
    if (!isInputFocused || !fullQuery || fullQuery.length < 2) {
      setSuggestions([]);
      setShowSuggestions(false);
      return;
    }

    const timer = setTimeout(() => {
      fetch(`/api/search?q=${encodeURIComponent(fullQuery)}`)
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
    const finalQuery = inputYear.trim() ? `${inputQuery.trim()} ${inputYear.trim()}` : inputQuery.trim();
    if (finalQuery) {
      setShowSuggestions(false);
      setSuggestions([]);
      inputRef.current?.blur();
      router.push(`/search?q=${encodeURIComponent(finalQuery)}`);
    }
  };

  const handleSelectSuggestion = (item: any) => {
    setShowSuggestions(false);
    setSuggestions([]);
    if (inputRef.current) {
      inputRef.current.blur();
    }
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
      <div className={styles.searchBoxWrapper} ref={searchBoxRef}>
        <form onSubmit={handleSearchFormSubmit} className={styles.searchForm}>
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
            placeholder="Search movies, tv, anime..."
            className={styles.searchInput}
          />
          <input
            type="text"
            value={inputYear}
            onChange={(e) => {
              setInputYear(e.target.value);
            }}
            onFocus={() => setIsInputFocused(true)}
            onBlur={() => {
              setTimeout(() => setIsInputFocused(false), 200);
            }}
            placeholder="Year"
            className={styles.yearInput}
          />
          <button
            type="submit"
            className={styles.searchSubmitBtn}
          >
            Search
          </button>
        </form>

        {/* Live Search Suggestions Dropdown */}
        {showSuggestions && suggestions.length > 0 && (
          <div className={styles.suggestionsDropdown}>
            {suggestions.map((item) => {
              const year = (item.release_date || item.first_air_date || '').split('-')[0];
              const poster = item.poster_path
                ? `https://image.tmdb.org/t/p/w92${item.poster_path}`
                : 'https://images.unsplash.com/photo-1574375927938-d5a98e8ffe85?w=100&auto=format&fit=crop';

              return (
                <div
                  key={item.id}
                  onMouseDown={(e) => {
                    e.preventDefault();
                    handleSelectSuggestion(item);
                  }}
                  className={styles.suggestionItem}
                >
                  <img
                    src={poster}
                    alt={item.title || item.name}
                    className={styles.suggestionPoster}
                    onError={(e) => {
                      const target = e.target as HTMLImageElement;
                      target.onerror = null;
                      target.src = 'https://images.unsplash.com/photo-1574375927938-d5a98e8ffe85?w=100&auto=format&fit=crop';
                    }}
                  />
                  <div className={styles.suggestionInfo}>
                    <div className={styles.suggestionTitle}>
                      {item.title || item.name}
                    </div>
                    <div className={styles.suggestionMeta}>
                      <span className={styles.suggestionBadge}>
                        {item.media_type === 'tv' ? 'TV Show' : 'Movie'}
                      </span>
                      {year && <span>• {year}</span>}
                      {item.vote_average > 0 && (
                        <span className={styles.suggestionRating}>
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
          {trendingPosters.length > 0 && showDome && (
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
