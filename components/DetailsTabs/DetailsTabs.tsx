'use client';

import { useState } from 'react';
import styles from './DetailsTabs.module.css';
import PosterGrid from '../PosterGrid/PosterGrid';

interface DetailsTabsProps {
  movie: any;
}

const TABS = ['Overview', 'Credits', 'Watch', 'Reviews', 'Images', 'Videos', 'Recommendations', 'Similar'];

export default function DetailsTabs({ movie }: DetailsTabsProps) {
  const [activeTab, setActiveTab] = useState('Overview');

  const formatCurrency = (value: number) => {
    if (!value) return '-';
    return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(value);
  };

  const renderContent = () => {
    switch (activeTab) {
      case 'Overview':
        return (
          <div className={styles.content}>
            <table className={styles.infoTable}>
              <tbody>
                <tr className={styles.infoRow}>
                  <td className={styles.infoLabel}>Release Date</td>
                  <td className={styles.infoValue}>
                    {movie.release_date ? new Date(movie.release_date).toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' }) : '-'}
                  </td>
                </tr>
                <tr className={styles.infoRow}>
                  <td className={styles.infoLabel}>Status</td>
                  <td className={styles.infoValue}>{movie.status || '-'}</td>
                </tr>
                <tr className={styles.infoRow}>
                  <td className={styles.infoLabel}>Original Title</td>
                  <td className={styles.infoValue}>{movie.original_title || movie.original_name || '-'}</td>
                </tr>
                <tr className={styles.infoRow}>
                  <td className={styles.infoLabel}>Runtime</td>
                  <td className={styles.infoValue}>
                    {movie.runtime ? `${Math.floor(movie.runtime / 60)}h ${movie.runtime % 60}min` : '-'}
                  </td>
                </tr>
                <tr className={styles.infoRow}>
                  <td className={styles.infoLabel}>Budget</td>
                  <td className={styles.infoValue}>{formatCurrency(movie.budget)}</td>
                </tr>
                <tr className={styles.infoRow}>
                  <td className={styles.infoLabel}>Revenue</td>
                  <td className={styles.infoValue}>{formatCurrency(movie.revenue)}</td>
                </tr>
                <tr className={styles.infoRow}>
                  <td className={styles.infoLabel}>Language</td>
                  <td className={styles.infoValue}>
                    {movie.spoken_languages?.map((l: any) => l.english_name).join(', ') || '-'}
                  </td>
                </tr>
                <tr className={styles.infoRow}>
                  <td className={styles.infoLabel}>Original Language</td>
                  <td className={styles.infoValue}>{movie.original_language?.toUpperCase() || '-'}</td>
                </tr>
                <tr className={styles.infoRow}>
                  <td className={styles.infoLabel}>Production Countries</td>
                  <td className={styles.infoValue}>
                    {movie.production_countries?.map((c: any) => c.name).join(', ') || '-'}
                  </td>
                </tr>
                <tr className={styles.infoRow}>
                  <td className={styles.infoLabel}>Production Companies</td>
                  <td className={styles.infoValue}>
                    {movie.production_companies?.map((c: any) => c.name).join(', ') || '-'}
                  </td>
                </tr>
              </tbody>
            </table>

            {movie.similar?.results && movie.similar.results.length > 0 && (
              <div style={{ marginTop: '3rem' }}>
                <PosterGrid title="You may also like" movies={movie.similar.results.slice(0, 8)} gridColumns={4} />
              </div>
            )}
          </div>
        );
      case 'Videos':
        return (
          <div className={styles.content}>
            {movie.videos?.results?.length > 0 ? (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '2rem' }}>
                {movie.videos.results.slice(0, 3).map((video: any) => (
                  <div key={video.id} style={{ width: '100%', maxWidth: '800px', aspectRatio: '16/9' }}>
                    <iframe 
                      style={{ width: '100%', height: '100%', border: 'none', borderRadius: '8px' }}
                      src={`https://www.youtube.com/embed/${video.key}`} 
                      allowFullScreen
                    ></iframe>
                  </div>
                ))}
              </div>
            ) : (
              <div className={styles.placeholder}>No videos available.</div>
            )}
          </div>
        );
      case 'Credits':
        return (
          <div className={styles.content}>
            {movie.credits?.cast?.length > 0 ? (
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(150px, 1fr))', gap: '1rem' }}>
                {movie.credits.cast.slice(0, 12).map((actor: any) => (
                  <div key={actor.id} style={{ background: '#1a1a1a', borderRadius: '8px', overflow: 'hidden' }}>
                     <img 
                        src={actor.profile_path ? `https://image.tmdb.org/t/p/w200${actor.profile_path}` : 'https://via.placeholder.com/200x300?text=No+Image'} 
                        alt={actor.name}
                        style={{ width: '100%', aspectRatio: '2/3', objectFit: 'cover' }}
                      />
                      <div style={{ padding: '0.8rem' }}>
                        <div style={{ fontWeight: 'bold', fontSize: '0.9rem', marginBottom: '0.2rem' }}>{actor.name}</div>
                        <div style={{ color: '#888', fontSize: '0.8rem' }}>{actor.character}</div>
                      </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className={styles.placeholder}>No cast information available.</div>
            )}
          </div>
        );
      case 'Recommendations':
        return (
          <div className={styles.content}>
            {movie.recommendations?.results && movie.recommendations.results.length > 0 ? (
              <PosterGrid title="" movies={movie.recommendations.results.slice(0, 8)} gridColumns={4} />
            ) : (
              <div className={styles.placeholder}>No recommendations available.</div>
            )}
          </div>
        );
      case 'Similar':
        return (
          <div className={styles.content}>
            {movie.similar?.results && movie.similar.results.length > 0 ? (
              <PosterGrid title="" movies={movie.similar.results.slice(0, 8)} gridColumns={4} />
            ) : (
              <div className={styles.placeholder}>No similar movies available.</div>
            )}
          </div>
        );
      case 'Images':
        return (
          <div className={styles.content}>
            {movie.images?.backdrops && movie.images.backdrops.length > 0 ? (
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))', gap: '1rem' }}>
                {movie.images.backdrops.slice(0, 6).map((img: any, i: number) => (
                  <img 
                    key={i}
                    src={`https://image.tmdb.org/t/p/w500${img.file_path}`} 
                    alt="Backdrop"
                    style={{ width: '100%', borderRadius: '8px', aspectRatio: '16/9', objectFit: 'cover' }}
                  />
                ))}
              </div>
            ) : (
              <div className={styles.placeholder}>No images available.</div>
            )}
          </div>
        );
      case 'Reviews':
        return (
          <div className={styles.content}>
            {movie.reviews?.results && movie.reviews.results.length > 0 ? (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
                {movie.reviews.results.slice(0, 5).map((review: any) => (
                  <div key={review.id} style={{ background: '#111', padding: '1.5rem', borderRadius: '8px' }}>
                    <div style={{ fontWeight: 'bold', marginBottom: '0.5rem', fontSize: '1.1rem' }}>A review by {review.author}</div>
                    <p style={{ color: '#aaa', fontSize: '0.95rem', lineHeight: '1.6' }}>{review.content.substring(0, 400)}...</p>
                  </div>
                ))}
              </div>
            ) : (
              <div className={styles.placeholder}>No reviews available.</div>
            )}
          </div>
        );
      case 'Watch':
        return (
          <div className={styles.content}>
             <div className={styles.placeholder}>
               Watch providers data is not directly fetched in this demo, but you would normally see streaming options here (e.g., Netflix, Hulu, Prime).
             </div>
          </div>
        );
      default:
        return <div className={styles.placeholder}>Content for {activeTab} is not fully implemented in this demo.</div>;
    }
  };

  return (
    <div className={styles.container}>
      <div className={styles.tabList}>
        {TABS.map((tab) => (
          <button 
            key={tab} 
            className={`${styles.tab} ${activeTab === tab ? styles.active : ''}`}
            onClick={() => setActiveTab(tab)}
          >
            {tab}
          </button>
        ))}
      </div>
      {renderContent()}
    </div>
  );
}
