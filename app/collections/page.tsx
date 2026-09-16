'use client';

import { useState, useEffect } from 'react';
import Footer from '../../components/Footer/Footer';
import Masonry from '../../components/reactbits/Masonary';

// Diverse heights for masonry effect
const INITIAL_COLLECTIONS = [
  { id: 'marvel', title: 'Marvel Cinematic Universe', query: 'Avengers', img: 'https://image.tmdb.org/t/p/w780/or06FN3Dka5tukK1e9sl16pB3iy.jpg', url: '/search?q=Marvel', heightMultiplier: 1.5 },
  { id: 'starwars', title: 'Star Wars', query: 'Star Wars', img: 'https://image.tmdb.org/t/p/w780/6FfCtAuVAW8XJjZ7eWeLibRLWTw.jpg', url: '/search?q=Star+Wars', heightMultiplier: 1.5 },
  { id: 'batman', title: 'The Dark Knight Trilogy', query: 'The Dark Knight', img: 'https://image.tmdb.org/t/p/w780/1hRoyzDtpgMU7Dz4DD22k7oaZc1.jpg', url: '/search?q=Batman', heightMultiplier: 1.5 },
  { id: 'harrypotter', title: 'Harry Potter', query: 'Harry Potter', img: 'https://image.tmdb.org/t/p/w780/wuMc08IPKEbNUfiSnhXXXEb2PZ5.jpg', url: '/search?q=Harry+Potter', heightMultiplier: 1.5 },
  { id: 'lotr', title: 'The Lord of the Rings', query: 'The Lord of the Rings', img: 'https://image.tmdb.org/t/p/w780/6oom5QYQ2yQTMJIbnvbkBL9cHo6.jpg', url: '/search?q=Lord+of+the+Rings', heightMultiplier: 1.5 },
  { id: 'matrix', title: 'The Matrix', query: 'The Matrix', img: 'https://image.tmdb.org/t/p/w780/f89U3ADr1oiB1s9GkdPOEpXUk5H.jpg', url: '/search?q=Matrix', heightMultiplier: 1.5 },
  { id: 'spiderman', title: 'Spider-Man', query: 'Spider-Man', img: 'https://image.tmdb.org/t/p/w780/gh4cZbhZxyTbgxQPxD0dOudNPTn.jpg', url: '/search?q=Spider-Man', heightMultiplier: 1.5 },
  { id: 'fastfurious', title: 'Fast & Furious', query: 'Fast & Furious', img: 'https://image.tmdb.org/t/p/w780/2OMB0ynKlyIenMJWI2Dy9IWT4c.jpg', url: '/search?q=Fast+and+Furious', heightMultiplier: 1.5 },
  { id: 'jurassic', title: 'Jurassic Park', query: 'Jurassic Park', img: 'https://image.tmdb.org/t/p/w780/or06FN3Dka5tukK1e9sl16pB3iy.jpg', url: '/search?q=Jurassic', heightMultiplier: 1.5 },
  { id: 'transformers', title: 'Transformers', query: 'Transformers', img: 'https://image.tmdb.org/t/p/w780/1n1xTOrT2A2nN3zK08hR4d1Pox4.jpg', url: '/search?q=Transformers', heightMultiplier: 1.5 },
  { id: 'xmen', title: 'X-Men', query: 'X-Men', img: 'https://image.tmdb.org/t/p/w780/49WJfeN0moxb9IPfGn8AIqMGskD.jpg', url: '/search?q=X-Men', heightMultiplier: 1.5 },
  { id: 'dceu', title: 'DC Extended Universe', query: 'Justice League', img: 'https://image.tmdb.org/t/p/w780/eIfGW1AuyPzcbZ5G9X3sT1tU38H.jpg', url: '/search?q=Justice+League', heightMultiplier: 1.5 },
  { id: 'pirates', title: 'Pirates of the Caribbean', query: 'Pirates of the Caribbean', img: 'https://image.tmdb.org/t/p/w780/z8onk7B8m7w7qE70o0lM11N11Jg.jpg', url: '/search?q=Pirates+of+the+Caribbean', heightMultiplier: 1.5 },
  { id: 'jamesbond', title: 'James Bond 007', query: 'James Bond', img: 'https://image.tmdb.org/t/p/w780/7Ff4x2xZ6127N438GZ3R9OqE41e.jpg', url: '/search?q=James+Bond', heightMultiplier: 1.5 }
];

export default function CollectionsPage() {
  const [items, setItems] = useState(INITIAL_COLLECTIONS);

  useEffect(() => {
    let isMounted = true;
    const fetchCollectionPosters = async () => {
      try {
        const updated = INITIAL_COLLECTIONS.map((col) => ({ ...col }));
        const promises = INITIAL_COLLECTIONS.map((col) =>
          fetch(`/api/search/movie?query=${encodeURIComponent(col.query)}`)
            .then((r) => r.json())
            .catch(() => null)
        );

        const results = await Promise.all(promises);

        for (let i = 0; i < updated.length; i++) {
          const res = results[i];
          if (res && res.results && res.results.length > 0) {
            const topMatch = res.results.find((m: any) => m.poster_path);
            if (topMatch && topMatch.poster_path) {
              updated[i].img = `https://image.tmdb.org/t/p/w780${topMatch.poster_path}`;
            }
          }
        }

        if (isMounted) {
          setItems(updated);
        }
      } catch (err) {
        console.error('Failed to fetch live collection posters:', err);
      }
    };

    fetchCollectionPosters();
    return () => { isMounted = false; };
  }, []);

  return (
    <main style={{ minHeight: '100vh', backgroundColor: '#000', color: '#fff' }}>
      <div style={{ padding: '100px clamp(1rem, 5vw, 6rem) 2rem', maxWidth: '1800px', margin: '0 auto' }}>
        <h1 style={{ fontSize: 'clamp(2rem, 3vw, 4rem)', fontWeight: 800, margin: '0 0 0.5rem', letterSpacing: '-0.02em' }}>
          Collections
        </h1>
        <p style={{ color: '#9ca3af', fontSize: 'clamp(1rem, 1.2vw, 1.2rem)', marginBottom: '3rem', maxWidth: '800px' }}>
          Dive into your favorite cinematic universes and franchises.
        </p>

        <div style={{ position: 'relative', width: '100%', minHeight: '120vh' }}>
          <Masonry
            items={items}
            animateFrom="bottom"
            scaleOnHover={true}
            hoverScale={1.03}
            blurToFocus={true}
            colorShiftOnHover={false}
          />
        </div>
      </div>
      <Footer />
    </main>
  );
}
