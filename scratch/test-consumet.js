import { ANIME } from '@consumet/extensions';

async function test() {
  const gogoanime = new ANIME.Gogoanime();
  try {
    const search = await gogoanime.search('Doraemon');
    console.log("Search Results:", search.results.map(r => r.title));
    
    if (search.results.length > 0) {
      const animeInfo = await gogoanime.fetchAnimeInfo(search.results[0].id);
      console.log("Episodes:", animeInfo.episodes.length);
      
      if (animeInfo.episodes.length > 0) {
        const sources = await gogoanime.fetchEpisodeSources(animeInfo.episodes[0].id);
        console.log("Sources:", sources.sources);
      }
    }
  } catch(e) {
    console.error(e);
  }
}

test();
