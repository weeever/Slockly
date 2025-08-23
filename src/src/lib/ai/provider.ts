import type { NextRequest } from 'next/server';

type Parsed = {
  artists_include: string[];
  artists_exclude: string[];
  genres_include: string[];
  genres_exclude: string[];
  tracks_include: string[];
  tracks_exclude: string[];
  approx_n: number;
  popularity: 'mainstream' | 'niche' | 'mixed';
};

// --- helpers ---
const lower = (s:string='')=> s.toLowerCase();
const words = (s:string='')=> lower(s).split(/[^\p{L}0-9]+/u).filter(Boolean);

function uniq(arr: string[]){ return Array.from(new Set(arr.filter(Boolean))); }

// Domain knowledge: French slang / intents
const VOCAB = {
  gym: ['salle','pousser','muscu','fonte','workout','pump','entrainement','deadlift','legday','cardio'],
  banRap: ['pasderap','pasderapfr','no-rap','no-rapfr','pas-rap','sans-rap','no-hiphop','pasdehiphop'],
  energyHigh: ['ambiance','club','energie','énérgie','boost','banger','punchy','secoué','taper','bourrin','speed','vite'],
  chill: ['chill','calme','posé','relax','détente'],
};

const GENRE_ALIASES: Record<string,string[]> = {
  'funk': ['funk','funky','disco','nu-disco','funk house','french house'],
  'house': ['house','electro house','french house','edm','club'],
  'rap fr': ['rap fr','rap français','rap francais','fr rap','hip hop fr'],
};

const ARTISTS_CANON: Record<string,string[]> = {
  'Daft Punk': ['daftpunk','daft'],
  'Jamiroquai': ['jamiroquai'],
  'Bruno Mars': ['brunomars','bruno'],
  'Mark Ronson': ['markronson'],
  'Nile Rodgers': ['nilerodgers','chic'],
  'Earth Wind & Fire': ['earthwindandfire','ewf'],
  'Justice': ['justice'],
  'Parcels': ['parcels'],
  'Chromeo': ['chromeo'],
};

const ARTISTS_RAP_FR = ['GIMS','Niska','PNL','Booba','SCH','Bigflo & Oli','IAM','Naps','Soso Maness','Jul','Ninho'];

function expandGenres(genres: string[]): string[]{
  const out = new Set<string>();
  for (const g of genres){
    const key = lower(g);
    out.add(g);
    for (const [canon, aliases] of Object.entries(GENRE_ALIASES)){
      if (aliases.includes(key)) out.add(canon);
    }
  }
  return Array.from(out);
}

// Heuristic parser used when LLM keys are absent or to post-process
export function smartParse(input: string, approxN: number): Parsed{
  const w = words(input);
  const txt = lower(input);

  let wantGym = w.some(x=> VOCAB.gym.includes(x));
  let wantHighEnergy = wantGym || w.some(x=> VOCAB.energyHigh.includes(x));
  let wantChill = w.some(x=> VOCAB.chill.includes(x));

  // Genres
  let genres: string[] = [];
  if (txt.includes('funk')) genres.push('funk','nu-disco','disco','funk house','french house');
  if (txt.includes('house')) genres.push('house','french house');
  if (txt.includes('disco')) genres.push('disco','nu-disco');

  // Artists
  let includeArtists: string[] = [];
  if (txt.includes('funk')) includeArtists.push('Bruno Mars','Daft Punk','Jamiroquai','Mark Ronson','Parcels','Chromeo','Justice','Earth Wind & Fire','Nile Rodgers');

  // Exclusions
  const excludeArtists: string[] = [];
  if (/rap(\s|-)?fr/.test(txt) || VOCAB.banRap.some(k=> txt.includes(k))) excludeArtists.push(...ARTISTS_RAP_FR);

  // Popularité
  let popularity: Parsed['popularity'] = wantChill ? 'mixed' : (wantHighEnergy ? 'mainstream' : 'mixed');

  // Final
  return {
    artists_include: uniq(includeArtists).slice(0,8),
    artists_exclude: uniq(excludeArtists),
    genres_include: expandGenres(genres).slice(0,8),
    genres_exclude: [],
    tracks_include: [],
    tracks_exclude: [],
    approx_n: approxN,
    popularity
  };
}

// --- Provider selection: remote-first ---
async function callOpenAI(prompt: string): Promise<Parsed | null>{
  const key = process.env.OPENAI_API_KEY;
  if (!key) return null;
  try{
    const res = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: { 'Authorization': `Bearer ${key}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({
        model: 'gpt-4o-mini',
        messages: [
          { role: 'system', content: 'Tu es un expert en musique francophone. Analyse une consigne utilisateur (souvent familière) et renvoie un JSON compact avec artistes/genres/titres à inclure/exclure et un nombre N. Évite les incohérences: si on parle de funk pour la salle, ne propose pas de rap FR. Si on dit no rap, exclure Bigflo & Oli, IAM, etc. Toujours privilégier funk/disco/french house si on mentionne funk. Réponds UNIQUEMENT en JSON.'},
          { role: 'user', content: prompt }
        ],
        temperature: 0.2,
        max_tokens: 300,
        response_format: { type: 'json_object' }
      })
    });
    if (!res.ok) return null;
    const js = await res.json();
    const txt = js.choices?.[0]?.message?.content || '{}';
    const parsed = JSON.parse(txt);
    // sanitize
    const p: Parsed = {
      artists_include: parsed.artists_include || [],
      artists_exclude: parsed.artists_exclude || [],
      genres_include: parsed.genres_include || [],
      genres_exclude: parsed.genres_exclude || [],
      tracks_include: parsed.tracks_include || [],
      tracks_exclude: parsed.tracks_exclude || [],
      approx_n: Number(parsed.approx_n || parsed.n || 20),
      popularity: parsed.popularity || 'mixed'
    };
    return p;
  }catch{return null;}
}

async function callGemini(prompt: string): Promise<Parsed | null>{
  const key = process.env.GEMINI_API_KEY;
  if (!key) return null;
  try{
    const res = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${key}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        contents: [{ role: 'user', parts: [{ text: `Analyse et renvoie un JSON (français). ${prompt}` }]}],
        generationConfig: { temperature: 0.2, maxOutputTokens: 300 }
      })
    });
    if (!res.ok) return null;
    const js = await res.json();
    const text = js?.candidates?.[0]?.content?.parts?.[0]?.text || '{}';
    const m = text.match(/\{[\s\S]*\}/);
    const parsed = JSON.parse(m ? m[0] : '{}');
    const p: Parsed = {
      artists_include: parsed.artists_include || [],
      artists_exclude: parsed.artists_exclude || [],
      genres_include: parsed.genres_include || [],
      genres_exclude: parsed.genres_exclude || [],
      tracks_include: parsed.tracks_include || [],
      tracks_exclude: parsed.tracks_exclude || [],
      approx_n: Number(parsed.approx_n || parsed.n || 20),
      popularity: parsed.popularity || 'mixed'
    };
    return p;
  }catch{return null;}
}

async function callOpenRouter(prompt: string): Promise<Parsed | null>{
  const key = process.env.OPENROUTER_API_KEY;
  if (!key) return null;
  try{
    const res = await fetch('https://openrouter.ai/api/v1/chat/completions', {
      method: 'POST',
      headers: { 'Authorization': `Bearer ${key}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({
        model: 'google/gemini-2.0-flash-001',
        messages: [{ role:'system', content:'Réponds en JSON compact comme indiqué.'},{ role:'user', content: prompt }],
        temperature: 0.2
      })
    });
    if (!res.ok) return null;
    const js = await res.json();
    const txt = js.choices?.[0]?.message?.content || '{}';
    return JSON.parse(txt);
  }catch{return null;}
}


function normalise(s: string){ return (s||'').toLowerCase().normalize('NFKD').replace(/[’']/g, "'"); }
function hasAny(text: string, arr: string[]){ return arr.some(w=> text.includes(w)); }

function smartHeuristics(prompt: string, approxN: number): Parsed {
  const p = normalise(prompt);
  const inc_genres = new Set<string>();
  const exc_genres = new Set<string>();
  const inc_artists = new Set<string>();
  const exc_artists = new Set<string>();
  const inc_tracks = new Set<string>();
  const exc_tracks = new Set<string>();
  let popularity: 'mainstream'|'niche'|'mixed' = 'mixed';

  const synonyms = {
    funk: ['funk','funky','nu disco','nudisco','disco','groove','groovy','p-funk','electro funk','g-funk'],
    workout: ['workout','gym','salle','muscu','pousser de la fonte','seance','entrainement'],
    exclude_fr_rap: ['rap fr','rap français','rap francais','rapfr'],
    hiphop: ['hip hop','hip-hop','rap'],
    house: ['house','french house','filter house','funky house','electro house'],
    techno: ['techno','hard techno','indus'],
    chill: ['chill','calme','relax','downtempo'],
    energetic: ['punchy','energetic','énergie','energie','bpm','vite','dynamique','club','dance']
  };

  if (synonyms.funk.some(w=> p.includes(w))) { ['funk','disco','nu-disco','funky house'].forEach(g=>inc_genres.add(g)); }
  if (synonyms.house.some(w=> p.includes(w))) { ['house','french house','funky house','nu-disco'].forEach(g=>inc_genres.add(g)); }
  if (synonyms.hiphop.some(w=> p.includes(w))) { inc_genres.add('hip hop'); }
  if (synonyms.techno.some(w=> p.includes(w))) { inc_genres.add('techno'); }
  if (synonyms.chill.some(w=> p.includes(w))) { popularity = 'niche'; }
  if (synonyms.energetic.some(w=> p.includes(w))) { popularity = 'mainstream'; }
  if (synonyms.workout.some(w=> p.includes(w)) && synonyms.funk.some(w=> p.includes(w))) { ['rap','rap fr','rap français'].forEach(g=> exc_genres.add(g)); }
  if (synonyms.exclude_fr_rap.some(w=> p.includes(w))) { ['rap','rap fr','rap français'].forEach(g=> exc_genres.add(g)); }

  const incMatch = p.match(/inclure[:\-]?([^\.]+)/);
  if (incMatch) { incMatch[1].split(/,|;|\band\b/).map(s=>s.trim()).forEach(x=> inc_artists.add(x)); }
  const excMatch = p.match(/exclure[:\-]?([^\.]+)/);
  if (excMatch) { excMatch[1].split(/,|;|\band\b/).map(s=>s.trim()).forEach(x=> { exc_artists.add(x); exc_genres.add(x); exc_tracks.add(x); }); }

  return {
    artists_include: Array.from(inc_artists).slice(0,8),
    artists_exclude: Array.from(exc_artists).slice(0,12),
    tracks_include: Array.from(inc_tracks).slice(0,8),
    tracks_exclude: Array.from(exc_tracks).slice(0,12),
    genres_include: Array.from(inc_genres).slice(0,6),
    genres_exclude: Array.from(exc_genres).slice(0,10),
    popularity: popularity,
    n: approxN || 20
  };
}
export async function analyze(prompt: string, approxN: number): Promise<Parsed>{
  // 1) Try OpenAI → 2) Gemini → 3) OpenRouter → 4) smart heuristics
  const openai = await callOpenAI(prompt);
  if (openai) return openai;
  const gem = await callGemini(prompt);
  if (gem) return gem;
  const or = await callOpenRouter(prompt);
  if (or) return or;

  // Fallback heuristics (never local unless OLLAMA_BASE_URL is used elsewhere explicitly)
  return smartParse(prompt, approxN);
}
