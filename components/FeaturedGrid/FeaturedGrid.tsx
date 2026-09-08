'use client';

import Link from 'next/link';

interface Movie {
  id: number;
  title?: string;
  name?: string;
  backdrop_path?: string;
  poster_path?: string;
  overview?: string;
  media_type?: string;
}

interface FeaturedGridProps {
  title?: string;
  movies: Movie[];
}

export default function FeaturedGrid({ title, movies }: FeaturedGridProps) {
  if (!movies || movies.length === 0) return null;

  return (
    <div className="mx-auto max-w-[1550px] px-6 py-8">
      {title && <h2 className="text-2xl font-extrabold text-white mb-6">{title}</h2>}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {movies.map((movie) => {
          const displayTitle = movie.title || movie.name;
          const backdrop = movie.backdrop_path || movie.poster_path;
          const isTV = movie.media_type === 'tv' || (movie.name && !movie.title);
          const detailHref = isTV ? `/tv/${movie.id}` : `/movie/${movie.id}`;
          const watchHref = `/watch/${movie.id}`;

          return (
            <div key={movie.id} className="relative overflow-hidden rounded-xl border border-gray-800 bg-gray-900 aspect-[16/9] md:aspect-[2/1] flex items-center justify-center group shadow-xl">
              {backdrop && (
                <img
                  src={`https://image.tmdb.org/t/p/w1280${backdrop}`}
                  alt={displayTitle}
                  className="absolute inset-0 h-full w-full object-cover group-hover:scale-105 transition-transform duration-500"
                  loading="lazy"
                  decoding="async"
                />
              )}
              <div className="absolute inset-0 bg-black/60"></div>
              <div className="absolute top-4 right-4 z-10 w-9 h-9 rounded-lg bg-black/60 border border-white/20 backdrop-blur-md text-white flex items-center justify-center cursor-pointer hover:bg-red-600 transition-colors">
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M19 21l-7-5-7 5V5a2 2 0 0 1 2-2h10a2 2 0 0 1 2 2z"></path>
                </svg>
              </div>

              <div className="relative z-10 flex h-full w-full items-center justify-center">
                <div className="overlay">
                  <div className="mx-auto max-w-3xl space-y-4 p-4 pb-8 text-center md:p-14">
                    <h1 className="line-clamp-2 text-xl font-medium leading-tight tracking-tighter md:text-4xl text-white">{displayTitle}</h1>
                    <p className="line-clamp-3 text-sm text-muted-foreground md:text-lg text-gray-300">{movie.overview}</p>
                    <div className="flex flex-col items-center justify-center gap-4 md:flex-row">
                      <Link
                        href={watchHref}
                        className="inline-flex items-center justify-center whitespace-nowrap text-sm font-medium transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:pointer-events-none disabled:opacity-50 bg-primary text-primary-foreground shadow hover:bg-primary/90 rounded-md px-8 h-11 w-[200px] md:w-auto bg-red-600 text-white hover:bg-red-700"
                      >
                        <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="lucide lucide-play mr-2 size-4 fill-black"><polygon points="6 3 20 12 6 21 6 3"></polygon></svg>
                        Play Now
                      </Link>
                      <Link
                        href={detailHref}
                        className="inline-flex items-center justify-center whitespace-nowrap rounded-md text-sm font-medium transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:pointer-events-none disabled:opacity-50 bg-secondary text-secondary-foreground shadow-sm hover:bg-secondary/80 h-10 rounded-md px-8 h-11 w-[200px] dark:bg-black dark:text-white dark:hover:bg-black/90 md:w-auto border border-white/20 bg-black/40 text-white hover:bg-black/60"
                      >
                        Details
                        <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="lucide lucide-arrow-right ml-2 size-4"><path d="M5 12h14"></path><path d="m12 5 7 7-7 7"></path></svg>
                      </Link>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
