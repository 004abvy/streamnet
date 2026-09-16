'use client';

import { useState, useEffect, useRef } from 'react';
import styles from './ProvidersSection.module.css';
import PosterCarousel from '../PosterCarousel/PosterCarousel';

const CUSTOM_LOGOS: Record<string, string> = {
  // Top Tier
  '8': 'https://upload.wikimedia.org/wikipedia/commons/0/08/Netflix_2015_logo.svg',
  '175': 'https://upload.wikimedia.org/wikipedia/commons/0/08/Netflix_2015_logo.svg',
  '9': 'https://upload.wikimedia.org/wikipedia/commons/1/11/Amazon_Prime_Video_logo.svg',
  '119': 'https://upload.wikimedia.org/wikipedia/commons/1/11/Amazon_Prime_Video_logo.svg',
  '337': 'https://upload.wikimedia.org/wikipedia/commons/3/3e/Disney%2B_logo.svg',
  '350': 'https://upload.wikimedia.org/wikipedia/commons/2/28/Apple_TV_Plus_Logo.svg',
  '2': 'https://upload.wikimedia.org/wikipedia/commons/2/28/Apple_TV_Plus_Logo.svg',
  '15': 'https://upload.wikimedia.org/wikipedia/commons/e/e4/Hulu_Logo.svg',
  '384': 'https://upload.wikimedia.org/wikipedia/commons/c/ce/Max_logo.svg',
  '1825': 'https://upload.wikimedia.org/wikipedia/commons/c/ce/Max_logo.svg',
  '386': 'https://upload.wikimedia.org/wikipedia/commons/d/d3/Peacock_%28streaming_service%29_logo.svg',
  '531': 'https://upload.wikimedia.org/wikipedia/commons/a/a5/Paramount_Plus.svg',
  '2303': 'https://upload.wikimedia.org/wikipedia/commons/a/a5/Paramount_Plus.svg',
  '2616': 'https://upload.wikimedia.org/wikipedia/commons/a/a5/Paramount_Plus.svg',
  
  // Mid Tier
  '257': 'https://upload.wikimedia.org/wikipedia/commons/3/3e/Fubo_logo.svg',
  '457': 'https://upload.wikimedia.org/wikipedia/commons/c/c5/Vix_logo.svg',
  '190': 'https://upload.wikimedia.org/wikipedia/commons/6/64/CuriosityStream_Logo.svg',
  '2383': 'https://upload.wikimedia.org/wikipedia/commons/0/07/Philo_Logo.svg',
  '583': 'https://upload.wikimedia.org/wikipedia/commons/6/66/MGM_Plus_logo.svg',
  '315': 'https://upload.wikimedia.org/wikipedia/commons/7/7b/Hoichoi_Logo.svg'
};

export default function ProvidersSection() {
  const [providers, setProviders] = useState<any[]>([]);
  const [activeProvider, setActiveProvider] = useState<any>(null);
  const [mediaType, setMediaType] = useState<'movie' | 'tv'>('movie');
  const [content, setContent] = useState<any[]>([]);
  const carouselRef = useRef<HTMLDivElement>(null);
  const [canScrollLeft, setCanScrollLeft] = useState(false);
  const [canScrollRight, setCanScrollRight] = useState(true);

  useEffect(() => {
    const controller = new AbortController();

    const fetchProviders = async () => {
      try {
        const res = await fetch('/api/providers', { signal: controller.signal });
        if (!res.ok) throw new Error(`Providers request failed with status ${res.status}`);
        const data = await res.json();
        if (data.results) {
          const seenBaseNames = new Set<string>();
          // Filter to top 20 providers based on display_priority, excluding unwanted ones and duplicates
          const topProviders = data.results
            .filter((p: any) => {
              const name = p.provider_name.toLowerCase();
              if (name.includes('google play') || name.includes('public domain')) return false;

              // Extract a base name for deduplication
              let baseName = name;
              if (name.includes('netflix')) baseName = 'netflix';
              else if (name.includes('amazon') || name.includes('prime')) baseName = 'amazon';
              else if (name.includes('apple tv')) baseName = 'appletv';
              else if (name.includes('max')) baseName = 'max';
              else if (name.includes('paramount')) baseName = 'paramount';
              else if (name.includes('hulu')) baseName = 'hulu';
              else if (name.includes('disney')) baseName = 'disney';

              if (seenBaseNames.has(baseName)) return false;
              seenBaseNames.add(baseName);
              return true;
            })
            .sort((a: any, b: any) => a.display_priority - b.display_priority)
            .slice(0, 20);
          setProviders(topProviders);
          if (topProviders.length > 0) {
            setActiveProvider(topProviders[0]);
          }
        }
      } catch (err) {
        if (!controller.signal.aborted) console.error('Failed to fetch providers', err);
      }
    };
    fetchProviders();

    return () => controller.abort();
  }, []);

  const checkScroll = () => {
    if (carouselRef.current) {
      const { scrollLeft, scrollWidth, clientWidth } = carouselRef.current;
      setCanScrollLeft(scrollLeft > 0);
      setCanScrollRight(Math.ceil(scrollLeft) < scrollWidth - clientWidth - 5);
    }
  };

  useEffect(() => {
    checkScroll();
    window.addEventListener('resize', checkScroll);
    return () => window.removeEventListener('resize', checkScroll);
  }, [providers]);

  const getScrollAmount = () => {
    if (!carouselRef.current) return 300;
    const cards = carouselRef.current.children;
    if (cards.length > 1) {
      const card1 = cards[0] as HTMLElement;
      const card2 = cards[1] as HTMLElement;
      return card2.offsetLeft - card1.offsetLeft;
    } else if (cards.length === 1) {
      return (cards[0] as HTMLElement).offsetWidth;
    }
    return 300;
  };

  const scrollLeft = () => {
    if (carouselRef.current) {
      carouselRef.current.scrollBy({ left: -getScrollAmount(), behavior: 'smooth' });
    }
  };

  const scrollRight = () => {
    if (carouselRef.current) {
      carouselRef.current.scrollBy({ left: getScrollAmount(), behavior: 'smooth' });
    }
  };

  useEffect(() => {
    if (!activeProvider) return;
    
    const fetchContent = async () => {
      try {
        const res = await fetch(`/api/discover/provider/${activeProvider.provider_id}?type=${mediaType}`);
        if (!res.ok) throw new Error(`Provider content request failed with status ${res.status}`);
        const data = await res.json();
        if (data.results) {
          const contentWithMediaType = data.results.map((item: any) => ({
            ...item,
            media_type: mediaType
          }));
          setContent(contentWithMediaType);
        }
      } catch (err) {
        console.error('Failed to fetch provider content', err);
      }
    };

    fetchContent();
  }, [activeProvider, mediaType]);

  if (!activeProvider) return null;

  const shortName = activeProvider.provider_name
    .replace(' Amazon Channel', '')
    .replace(' Plus', '+');

  const activeBackdrop = content.length > 0 && content[0].backdrop_path
    ? `https://image.tmdb.org/t/p/original${content[0].backdrop_path}`
    : null;

  return (
    <section className={styles.container}>
      {activeBackdrop && (
        <div className={styles.providerBackdrop}>
          <img
            src={activeBackdrop}
            alt={shortName}
            className={styles.providerBackdropImg}
            loading="lazy"
          />
          <div className={styles.providerBackdropOverlay} />
        </div>
      )}
      <div className={styles.inner}>
        <div className={styles.header}>
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

        <div className={styles.carouselWrapper}>
          <button 
            className={`${styles.navBtn} ${styles.leftBtn}`} 
            onClick={scrollLeft}
            disabled={!canScrollLeft}
            aria-label="Previous"
          >
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
              <path d="M15 18l-6-6 6-6" />
            </svg>
          </button>
          
          <button 
            className={`${styles.navBtn} ${styles.rightBtn}`} 
            onClick={scrollRight}
            disabled={!canScrollRight}
            aria-label="Next"
          >
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
              <path d="M9 18l6-6-6-6" />
            </svg>
          </button>

          <div 
            className={styles.providersList}
            ref={carouselRef}
            onScroll={checkScroll}
          >
            {providers.map((provider) => {
              let logoUrl = CUSTOM_LOGOS[provider.provider_id];
              let isCustom = true;
            
            // If we don't have it in our dictionary, try Brandfetch as a fallback vector
            if (!logoUrl) {
              const domain = provider.provider_name.toLowerCase().replace(/[^a-z0-9]/g, '') + '.com';
              logoUrl = `https://cdn.brandfetch.io/${domain}/logo`;
            }
            
            return (
              <button
                key={provider.provider_id}
                className={`${styles.providerBtn} ${activeProvider.provider_id === provider.provider_id ? styles.activeProvider : ''} ${isCustom ? styles.hasCustomLogo : ''}`}
                onClick={() => setActiveProvider(provider)}
                title={provider.provider_name}
              >
                <img 
                  src={logoUrl} 
                  alt={provider.provider_name} 
                  className={`${styles.providerLogo} ${isCustom ? styles.customLogo : ''} ${['350', '2'].includes(provider.provider_id.toString()) ? styles.invertLogo : ''}`}
                  onError={(e) => {
                    // If Brandfetch fails or domain is wrong, fallback to TMDB logo and remove SVG monochrome filtering
                    if (!e.currentTarget.src.includes('tmdb.org')) {
                      e.currentTarget.src = `https://image.tmdb.org/t/p/w200${provider.logo_path}`;
                      e.currentTarget.classList.remove(styles.customLogo);
                    }
                  }}
                />
              </button>
            );
          })}
          </div>
        </div>
      </div>

      <div className={styles.contentSection}>
        {content.length > 0 ? (
          <PosterCarousel 
            title=""
            movies={content} 
            viewAllLink={`/provider/${activeProvider.provider_id}?type=${mediaType}&name=${encodeURIComponent(shortName)}`}
          />
        ) : null}
      </div>
    </section>
  );
}
