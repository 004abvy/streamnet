'use client';

import { useState, useEffect } from 'react';
import styles from './ProvidersSection.module.css';
import PosterCarousel from '../PosterCarousel/PosterCarousel';



export default function ProvidersSection() {
  const [providers, setProviders] = useState<any[]>([]);
  const [activeProvider, setActiveProvider] = useState<any>(null);
  const [mediaType, setMediaType] = useState<'movie' | 'tv'>('movie');
  const [content, setContent] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    const fetchProviders = async () => {
      try {
        const backendUrl = process.env.NEXT_PUBLIC_BACKEND_URL || '';
        const res = await fetch(`${backendUrl}/api/providers`);
        const data = await res.json();
        if (data.results) {
          // Filter to top 20 providers based on display_priority, excluding unwanted ones
          const topProviders = data.results
            .filter((p: any) => {
              const name = p.provider_name.toLowerCase();
              return !name.includes('google play') && !name.includes('public domain');
            })
            .sort((a: any, b: any) => a.display_priority - b.display_priority)
            .slice(0, 20);
          setProviders(topProviders);
          if (topProviders.length > 0) {
            setActiveProvider(topProviders[0]);
          }
        }
      } catch (err) {
        console.error("Failed to fetch providers", err);
      }
    };
    fetchProviders();
  }, []);

  useEffect(() => {
    if (!activeProvider) return;
    
    const fetchContent = async () => {
      setLoading(true);
      try {
        const backendUrl = process.env.NEXT_PUBLIC_BACKEND_URL || '';
        const res = await fetch(`${backendUrl}/api/discover/provider/${activeProvider.provider_id}?type=${mediaType}`);
        const data = await res.json();
        if (data.results) {
          const contentWithMediaType = data.results.map((item: any) => ({
            ...item,
            media_type: mediaType
          }));
          setContent(contentWithMediaType);
        }
      } catch (err) {
        console.error("Failed to fetch provider content", err);
      } finally {
        setLoading(false);
      }
    };

    fetchContent();
  }, [activeProvider, mediaType]);

  if (!activeProvider) return null;

  const shortName = activeProvider.provider_name
    .replace(' Amazon Channel', '')
    .replace(' Plus', '+');

  const carouselTitle = `${shortName} ${mediaType === 'tv' ? 'TV Shows' : 'Movies'}`;
  const browseText = `Browse top ${mediaType === 'tv' ? 'TV shows' : 'movies'} from ${shortName}`;

  return (
    <section className={styles.container}>
      <div className={styles.inner}>
        <div className={styles.header}>
          <div>
            <h2 className={styles.title}>Providers</h2>
            <p className={styles.subtitle}>Browse content from your favorite streaming services</p>
          </div>
          
          <div className={styles.toggleGroup}>
            <button 
              className={`${styles.toggleBtn} ${mediaType === 'movie' ? styles.active : ''}`}
              onClick={() => setMediaType('movie')}
            >
              Movies
            </button>
            <button 
              className={`${styles.toggleBtn} ${mediaType === 'tv' ? styles.active : ''}`}
              onClick={() => setMediaType('tv')}
            >
              TV Shows
            </button>
          </div>
        </div>

        <div className={styles.providersList}>
          {providers.map((provider) => (
            <button
              key={provider.provider_id}
              className={`${styles.providerBtn} ${activeProvider.provider_id === provider.provider_id ? styles.activeProvider : ''}`}
              onClick={() => setActiveProvider(provider)}
              title={provider.provider_name}
            >
              <img 
                src={`https://image.tmdb.org/t/p/w200${provider.logo_path}`} 
                alt={provider.provider_name} 
                className={styles.providerLogo}
              />
            </button>
          ))}
        </div>
        
        <p className={styles.browseText}>
          Browse top {mediaType === 'tv' ? 'TV shows' : 'movies'} from <strong>{shortName}</strong>
        </p>
      </div>

      <div className={styles.contentSection}>
        {loading ? (
          <div className={styles.loading}>Loading...</div>
        ) : content.length > 0 ? (
          <PosterCarousel 
            title={carouselTitle} 
            movies={content} 
            viewAllLink={`/provider/${activeProvider.provider_id}?type=${mediaType}&name=${encodeURIComponent(shortName)}`}
          />
        ) : (
          <div className={styles.loading}>No content found.</div>
        )}
      </div>
    </section>
  );
}
