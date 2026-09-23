'use client';

import { useState } from 'react';
import Footer from '../../components/Footer/Footer';
import Masonry from '../../components/reactbits/Masonary';

// Diverse heights for masonry effect
const INITIAL_COLLECTIONS = [
  {
    "id": "marvel",
    "title": "Marvel Cinematic Universe",
    "query": "Avengers",
    "img": "https://image.tmdb.org/t/p/w780/ulzhLuWrPK07P1YkdWQLZnQh1JL.jpg",
    "url": "/search?q=Marvel",
    "heightMultiplier": 1.6
  },
  {
    "id": "starwars",
    "title": "Star Wars",
    "query": "Star Wars",
    "img": "https://image.tmdb.org/t/p/w780/fai0rspsNeJCS69wHNjOdWxcI7P.jpg",
    "url": "/search?q=Star+Wars",
    "heightMultiplier": 0.65
  },
  {
    "id": "batman",
    "title": "The Dark Knight Trilogy",
    "query": "The Dark Knight",
    "img": "https://image.tmdb.org/t/p/w780/qJ2tW6WMUDux911r6m7haRef0WH.jpg",
    "url": "/search?q=Batman",
    "heightMultiplier": 1.4
  },
  {
    "id": "harrypotter",
    "title": "Harry Potter",
    "query": "Harry Potter",
    "img": "https://image.tmdb.org/t/p/w780/sdEOH0992YZ0QSxgXNIGLq1ToUi.jpg",
    "url": "/search?q=Harry+Potter",
    "heightMultiplier": 0.8
  },
  {
    "id": "lotr",
    "title": "The Lord of the Rings",
    "query": "The Lord of the Rings",
    "img": "https://image.tmdb.org/t/p/w780/rCzpDGLbOoPwLjy3OAm5NUPOTrC.jpg",
    "url": "/search?q=Lord+of+the+Rings",
    "heightMultiplier": 1.8
  },
  {
    "id": "matrix",
    "title": "The Matrix",
    "query": "The Matrix",
    "img": "https://image.tmdb.org/t/p/w780/dXNAPwY7VrqMAo51EKhhCJfaGb5.jpg",
    "url": "/search?q=Matrix",
    "heightMultiplier": 1
  },
  {
    "id": "spiderman",
    "title": "Spider-Man",
    "query": "Spider-Man",
    "img": "https://image.tmdb.org/t/p/w780/bjiS5ipwxb9JFy3XRRN4OAilSeX.jpg",
    "url": "/search?q=Spider-Man",
    "heightMultiplier": 0.6
  },
  {
    "id": "fastfurious",
    "title": "Fast & Furious",
    "query": "Fast & Furious",
    "img": "https://image.tmdb.org/t/p/w780/qRyy2UmjC5ur9bDi3kpNNRCc5nc.jpg",
    "url": "/search?q=Fast+and+Furious",
    "heightMultiplier": 1.5
  },
  {
    "id": "jurassic",
    "title": "Jurassic Park",
    "query": "Jurassic Park",
    "img": "https://image.tmdb.org/t/p/w780/d9mtMGQDLANKieb9PbD3yK7xxzo.jpg",
    "url": "/search?q=Jurassic",
    "heightMultiplier": 0.75
  },
  {
    "id": "transformers",
    "title": "Transformers",
    "query": "Transformers",
    "img": "https://image.tmdb.org/t/p/w780/iRCgqpdVE4wyLQvGYU3ZP7pAtUc.jpg",
    "url": "/search?q=Transformers",
    "heightMultiplier": 1.75
  },
  {
    "id": "xmen",
    "title": "X-Men",
    "query": "X-Men",
    "img": "https://image.tmdb.org/t/p/w780/ikA8UhYdTGpqbatFa93nIf6noSr.jpg",
    "url": "/search?q=X-Men",
    "heightMultiplier": 0.85
  },
  {
    "id": "dceu",
    "title": "DC Extended Universe",
    "query": "Justice League",
    "img": "https://image.tmdb.org/t/p/w780/eifGNCSDuxJeS1loAXil5bIGgvC.jpg",
    "url": "/search?q=Justice+League",
    "heightMultiplier": 1.35
  },
  {
    "id": "pirates",
    "title": "Pirates of the Caribbean",
    "query": "Pirates of the Caribbean",
    "img": "https://image.tmdb.org/t/p/w780/poHwCZeWzJCShH7tOjg8RIoyjcw.jpg",
    "url": "/search?q=Pirates+of+the+Caribbean",
    "heightMultiplier": 1.5
  },
  {
    "id": "jamesbond",
    "title": "James Bond 007",
    "query": "James Bond",
    "img": "https://image.tmdb.org/t/p/w780/2263QlCCvIxM9nyb2C3RjPq3bto.jpg",
    "url": "/search?q=James+Bond",
    "heightMultiplier": 0.68
  },
  {
    "id": "missionimpossible",
    "title": "Mission: Impossible",
    "query": "Mission: Impossible",
    "img": "https://image.tmdb.org/t/p/w780/l5uxY5m5OInWpcExIpKG6AR3rgL.jpg",
    "url": "/search?q=Mission+Impossible",
    "heightMultiplier": 1.2
  },
  {
    "id": "avatar",
    "title": "Avatar",
    "query": "Avatar",
    "img": "https://image.tmdb.org/t/p/w780/gKY6q7SjCkAU6FqvqWybDYgUKIF.jpg",
    "url": "/search?q=Avatar",
    "heightMultiplier": 0.9
  },
  {
    "id": "hungergames",
    "title": "The Hunger Games",
    "query": "The Hunger Games",
    "img": "https://image.tmdb.org/t/p/w780/apa5G43Hha7kH7wJG0gkkHT7FA9.jpg",
    "url": "/search?q=Hunger+Games",
    "heightMultiplier": 1.45
  },
  {
    "id": "indiana",
    "title": "Indiana Jones",
    "query": "Indiana Jones",
    "img": "https://image.tmdb.org/t/p/w780/gpdVNUaa4LhRMLfJOPj1AZdhAZ3.jpg",
    "url": "/search?q=Indiana+Jones",
    "heightMultiplier": 0.75
  },
  {
    "id": "terminator",
    "title": "The Terminator",
    "query": "Terminator",
    "img": "https://image.tmdb.org/t/p/w780/qvktm0BHcnmDpul4Hz01GIazWPr.jpg",
    "url": "/search?q=Terminator",
    "heightMultiplier": 1.6
  },
  {
    "id": "alien",
    "title": "Alien",
    "query": "Alien",
    "img": "https://image.tmdb.org/t/p/w780/vfrQk5IPloGg1v9Rzbh2Eg3VGyM.jpg",
    "url": "/search?q=Alien",
    "heightMultiplier": 0.8
  },
  {
    "id": "planetoftheapes",
    "title": "Planet of the Apes",
    "query": "Planet of the Apes",
    "img": "https://image.tmdb.org/t/p/w780/oqA45qMyyo1TtrnVEBKxqmTPhbN.jpg",
    "url": "/search?q=Planet+of+the+Apes",
    "heightMultiplier": 1.3
  },
  {
    "id": "madmax",
    "title": "Mad Max",
    "query": "Mad Max",
    "img": "https://image.tmdb.org/t/p/w780/ulcAi4dKpAjHwYGS08vNyx9H6I9.jpg",
    "url": "/search?q=Mad+Max",
    "heightMultiplier": 0.95
  },
  {
    "id": "startrek",
    "title": "Star Trek",
    "query": "Star Trek",
    "img": "https://image.tmdb.org/t/p/w780/lV5OpzAss1z06YNagOVap1I35mH.jpg",
    "url": "/search?q=Star+Trek",
    "heightMultiplier": 1.15
  },
  {
    "id": "johnwick",
    "title": "John Wick",
    "query": "John Wick",
    "img": "https://image.tmdb.org/t/p/w780/wXqWR7dHncNRbxoEGybEy7QTe9h.jpg",
    "url": "/search?q=John+Wick",
    "heightMultiplier": 1.7
  },
  {
    "id": "toystory",
    "title": "Toy Story",
    "query": "Toy Story",
    "img": "https://image.tmdb.org/t/p/w780/sfQtVlIHljToOwYjhe21KPGzZWK.jpg",
    "url": "/search?q=Toy+Story",
    "heightMultiplier": 0.65
  },
  {
    "id": "shrek",
    "title": "Shrek",
    "query": "Shrek",
    "img": "https://image.tmdb.org/t/p/w780/iB64vpL3dIObOtMZgX3RqdVdQDc.jpg",
    "url": "/search?q=Shrek",
    "heightMultiplier": 1.25
  },
  {
    "id": "rocky",
    "title": "Rocky",
    "query": "Rocky",
    "img": "https://image.tmdb.org/t/p/w780/xSI0dbKLDETwhiVUy6hGE8KXUln.jpg",
    "url": "/search?q=Rocky",
    "heightMultiplier": 0.85
  }
];

export default function CollectionsPage() {
  const [hoveredItem, setHoveredItem] = useState<any>(null);

  return (
    <main style={{ minHeight: '100vh', position: 'relative', backgroundColor: '#000', color: '#fff' }}>
      
      {/* Background Wrapper for Sticky effect (fixes Framer Motion transform breaking position: fixed) */}
      <div style={{ position: 'absolute', top: 0, left: 0, width: '100%', height: '100%', zIndex: 0, pointerEvents: 'none', overflow: 'hidden' }}>
        {/* Base Dark Layer */}
        <div style={{ position: 'sticky', top: 0, width: '100%', height: '100vh', background: 'radial-gradient(circle at 50% 50%, #1a1a2e 0%, #05050a 100%)' }} />

        {/* Dynamic blurred image layer */}
        <div 
          style={{
            position: 'sticky', 
            top: 0, 
            width: '100%', 
            height: '100vh', 
            marginTop: '-100vh', // Overlay exactly on top of the base layer
            backgroundImage: hoveredItem ? `url(${hoveredItem.img})` : 'none',
            backgroundSize: '100% 100%',
            backgroundPosition: 'center',
            opacity: hoveredItem ? 0.6 : 0,
            filter: 'blur(100px) saturate(250%) brightness(0.7)',
            transform: 'scale(1.3)',
            transition: 'all 0.8s cubic-bezier(0.4, 0, 0.2, 1)',
          }}
        />
      </div>

      <div style={{ padding: '100px clamp(1rem, 5vw, 6rem) 2rem', maxWidth: '1800px', margin: '0 auto', position: 'relative', zIndex: 1 }}>
        <h1 style={{ fontSize: 'clamp(2rem, 3vw, 4rem)', fontWeight: 800, margin: '0 0 0.5rem', letterSpacing: '-0.02em' }}>
          Collections
        </h1>
        <p style={{ color: '#9ca3af', fontSize: 'clamp(1rem, 1.2vw, 1.2rem)', marginBottom: '3rem', maxWidth: '800px' }}>
          Dive into your favorite cinematic universes and franchises.
        </p>

        <div style={{ position: 'relative', width: '100%', minHeight: '120vh' }}>
            <Masonry
              items={INITIAL_COLLECTIONS}
              animateFrom="bottom"
              scaleOnHover={true}
              hoverScale={1.03}
              blurToFocus={true}
              colorShiftOnHover={false}
              onHoverChange={setHoveredItem}
            />
        </div>
      </div>
      <Footer />
    </main>
  );
}
