'use client';

import { useState, useEffect, useRef, Suspense } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import Navbar from '../../components/Navbar/Navbar';
import PosterGrid from '../../components/PosterGrid/PosterGrid';
import styles from './search.module.css';

function SearchContent() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const queryParam = searchParams.get('q') || '';
  
  const [inputQuery, setInputQuery] = useState(queryParam);
  const [suggestions, setSuggestions] = useState<any[]>([]);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [results, setResults] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const searchBoxRef = useRef<HTMLDivElement>(null);

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

  // Fetch full search results when queryParam in URL changes
  useEffect(() => {
    setInputQuery(queryParam);
    if (!queryParam) {
      setResults([]);
      setLoading(false);
      return;
    }

    setLoading(true);
    const backendUrl = process.env.NEXT_PUBLIC_BACKEND_URL || '';
    
    fetch(`/api/search?q=${encodeURIComponent(queryParam)}`)
      .then(res => res.ok ? res.json() : null)
      .then(data => {
        const filtered = data?.results?.filter((item: any) => item.media_type === 'movie' || item.media_type === 'tv') || [];
        setResults(filtered);
        setLoading(false);
      })
      .catch(err => {
        console.warn("Search failed:", err);
        setLoading(false);
      });
  }, [queryParam]);

  // Fetch suggestions live as user types in the input box
  useEffect(() => {
    if (!inputQuery.trim() || inputQuery.trim().length < 2) {
      setSuggestions([]);
      setShowSuggestions(false);
      return;
    }

    const timer = setTimeout(() => {
      const backendUrl = process.env.NEXT_PUBLIC_BACKEND_URL || '';
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
  }, [inputQuery]);

  const handleSearchFormSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (inputQuery.trim()) {
      setShowSuggestions(false);
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

  return (
    <div className={styles.content}>
      <div style={{ maxWidth: '650px', margin: '0 auto 2.5rem auto', padding: '0 1rem', position: 'relative' }} ref={searchBoxRef}>
        <form onSubmit={handleSearchFormSubmit} style={{ display: 'flex', gap: '0.5rem' }}>
          <input
            type="text"
            value={inputQuery}
            onChange={(e) => setInputQuery(e.target.value)}
            onFocus={() => { if (suggestions.length > 0) setShowSuggestions(true); }}
            placeholder="Search for movies, TV shows, anime..."
            style={{
              flex: 1,
              padding: '0.8rem 1.2rem',
              borderRadius: '25px',
              border: '1px solid #333',
              background: '#141414',
              color: '#fff',
              fontSize: '1rem',
              outline: 'none',
            }}
          />
          <button
            type="submit"
            style={{
              padding: '0.8rem 1.5rem',
              borderRadius: '25px',
              border: 'none',
              background: '#f59e0b',
              color: '#000',
              fontWeight: 'bold',
              cursor: 'pointer',
              fontSize: '0.95rem'
            }}
          >
            Search
          </button>
        </form>

        {/* Live Search Suggestions Dropdown */}
        {showSuggestions && suggestions.length > 0 && (
          <div style={{
            position: 'absolute',
            top: 'calc(100% + 6px)',
            left: '1rem',
            right: '1rem',
            background: '#12121a',
            border: '1px solid #28283a',
            borderRadius: '12px',
            boxShadow: '0 15px 35px rgba(0,0,0,0.9)',
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
                    padding: '0.65rem 1rem',
                    cursor: 'pointer',
                    borderBottom: '1px solid #1c1c2b',
                    transition: 'background 0.2s',
                  }}
                  onMouseEnter={(e) => (e.currentTarget.style.background = '#1c1c2a')}
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
        <PosterGrid title={queryParam ? `Search Results for "${queryParam}"` : ''} movies={results} isLoading={loading} />
      ) : queryParam ? (
        <div className={styles.emptyState}>
          <h2>No results found</h2>
          <p>We couldn't find anything matching "{queryParam}". Try another search term above.</p>
        </div>
      ) : (
        <div className={styles.emptyState}>
          <h2>Search Movies & TV Shows</h2>
          <p>Type a title in the search bar above to start searching.</p>
        </div>
      )}
    </div>
  );
}

export default function SearchPage() {
  return (
    <main className={styles.container}>
      <Navbar />
      <Suspense fallback={<div className={styles.content}><div className={styles.loading}>Loading...</div></div>}>
        <SearchContent />
      </Suspense>
    </main>
  );
}
