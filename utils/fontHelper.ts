const GOOGLE_FONTS_API_KEY = 'AIzaSyBnS0w0-E2pSiLsymn200BXSd47h-CdOlM';

let cachedFonts: any[] = [];
let isFetching = false;
let fetchPromise: Promise<any[]> | null = null;

export async function getFontsList() {
  if (cachedFonts.length > 0) return cachedFonts;
  if (fetchPromise) return fetchPromise;

  fetchPromise = fetch(`https://www.googleapis.com/webfonts/v1/webfonts?key=${GOOGLE_FONTS_API_KEY}&sort=trending`)
    .then(res => res.json())
    .then(data => {
      cachedFonts = data.items || [];
      return cachedFonts;
    })
    .catch(err => {
      console.error('Failed to fetch Google Fonts', err);
      return [];
    });

  return fetchPromise;
}

function getMovieVibe(overview: string): string {
  const text = (overview || '').toLowerCase();
  
  if (text.match(/\b(space|alien|future|planet|galaxy|cyber|robot|ai|technology)\b/)) return 'scifi';
  if (text.match(/\b(blood|murder|ghost|demon|evil|kill|dead|dark|scary|horror|terror)\b/)) return 'horror';
  if (text.match(/\b(love|romance|heart|wedding|kiss|relationship|passion)\b/)) return 'romance';
  if (text.match(/\b(magic|dragon|sword|king|queen|knight|fantasy|witch|wizard|realm)\b/)) return 'fantasy';
  if (text.match(/\b(war|battle|hero|soldier|fight|mission|spy|agent|combat|action)\b/)) return 'action';
  
  return 'general';
}

const CINEMATIC_FONTS: Record<string, string[]> = {
  scifi: ['Orbitron', 'Syncopate', 'Monoton', 'Audiowide', 'Chakra Petch', 'Megrim', 'Wallpoet'],
  horror: ['Creepster', 'Nosifer', 'Eater', 'Butcherman', 'Frijole', 'Rubik Glitch'],
  romance: ['Great Vibes', 'Sacramento', 'Tangerine', 'Pacifico', 'Leckerli One'],
  fantasy: ['MedievalSharp', 'Almendra', 'Caesar Dressing', 'Macondo', 'Uncial Antiqua'],
  action: ['Bebas Neue', 'Black Ops One', 'Bungee', 'Russo One', 'Staatliches', 'Teko'],
  general: ['Righteous', 'Audiowide', 'Teko', 'Permanent Marker', 'Syncopate']
};

function selectFontForVibe(vibe: string, fonts: any[], movieId: number): string | null {
  if (!fonts || fonts.length === 0) return null;
  
  // Try to find highly aesthetic curated fonts from the API list first
  const preferredNames = CINEMATIC_FONTS[vibe] || CINEMATIC_FONTS.general;
  let suitableFonts = fonts.filter(f => preferredNames.includes(f.family));
  
  // Fallback to broader aesthetic filtering if curated list is missing
  if (suitableFonts.length === 0) {
    switch (vibe) {
      case 'scifi':
        suitableFonts = fonts.filter(f => f.category === 'monospace' || f.category === 'display');
        break;
      case 'horror':
        suitableFonts = fonts.filter(f => f.category === 'display' || f.category === 'handwriting');
        break;
      case 'romance':
        suitableFonts = fonts.filter(f => f.category === 'handwriting');
        break;
      case 'fantasy':
        suitableFonts = fonts.filter(f => f.category === 'sans-serif' || f.category === 'display');
        break;
      case 'action':
        suitableFonts = fonts.filter(f => f.category === 'display');
        break;
      default:
        suitableFonts = fonts.filter(f => f.category === 'display' || f.category === 'sans-serif');
        break;
    }
  }
  
  if (suitableFonts.length === 0) suitableFonts = fonts;
  
  // Pick deterministically based on movie id
  const index = movieId % suitableFonts.length;
  
  return suitableFonts[index].family;
}

export async function getFontForMovie(overview: string, movieId: number): Promise<string | null> {
  const fonts = await getFontsList();
  const vibe = getMovieVibe(overview);
  return selectFontForVibe(vibe, fonts, movieId);
}
