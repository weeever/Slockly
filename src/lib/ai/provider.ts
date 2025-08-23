// src/lib/ai/provider.ts
import type { NextRequest } from 'next/server';

const OPENAI_API_KEY = process.env.OPENAI_API_KEY || process.env.OPENAI_API_KEY?.trim();
const GEMINI_API_KEY = process.env.GEMINI_API_KEY || process.env.GOOGLE_API_KEY;
const OPENROUTER_API_KEY = process.env.OPENROUTER_API_KEY;
const OLLAMA_BASE = process.env.OLLAMA_BASE_URL;

type Plan = {
  n: number;
  artists: string[];
  genres: string[];
  searchQueries?: string[];
  excludeArtists?: string[];
  excludeGenres?: string[];
  excludeTracks?: string[];
};

const SYS = `Tu es un planificateur de playlists ultra précis.
Retourne UNIQUEMENT un JSON valide sans texte autour, au format:
{
  "n": <entier>,
  "artists": ["..."],
  "genres": ["..."],
  "searchQueries": ["..."], 
  "excludeArtists": ["..."],
  "excludeGenres": ["..."],
  "excludeTracks": ["..."]
}
Règles:
- "artists": varie plusieurs artistes (pas qu'un seul), liens logiques avec la consigne.
- "genres": 1 à 4 genres max, génériques compatibles Spotify (ex: "funk", "pop", "rap", "french hip hop", "anime"). Évite "parody" si non demandé.
- "searchQueries": 2 à 6 requêtes utiles (ex: "pokemon ost", "pokémon opening", "gims feat").
- Évite les parodies si l'utilisateur dit "pas de parodies".
- Si la consigne évoque une franchise (ex: pokemon), inclure orthographes/alias ("Pokémon", "ポケモン", "Nintendo", "anime ost", artistes "Junichi Masuda").
- "n": nombre visé (respecte la valeur demandée).
- N'utilise pas de commentaires dans le JSON, ne renvoie que du JSON.
`;

function tryExtractJSON(text: string): any | null {
  // cherche le premier bloc {...} JSON
  const start = text.indexOf('{');
  const end = text.lastIndexOf('}');
  if (start === -1 || end === -1 || end <= start) return null;
  const candidate = text.slice(start, end + 1);
  try {
    return JSON.parse(candidate);
  } catch {
    // tentative: retirer trailing commas
    try {
      const cleaned = candidate.replace(/,\s*([}\]])/g, '$1');
      return JSON.parse(cleaned);
    } catch {
      return null;
    }
  }
}

function normalizePlan(obj: any, approxN: number): Plan {
  const toArray = (v:any): string[] => Array.isArray(v) ? v.map(String) : [];
  const plan: Plan = {
    n: Math.max(1, Number.isFinite(Number(obj?.n)) ? Number(obj.n) : approxN || 20),
    artists: toArray(obj?.artists).map(s => String(s).trim()).filter(Boolean),
    genres: toArray(obj?.genres).map(s => String(s).trim().toLowerCase()).filter(Boolean),
    searchQueries: toArray(obj?.searchQueries).map(s => String(s).trim()).filter(Boolean),
    excludeArtists: toArray(obj?.excludeArtists).map((s)=>String(s).trim()),
    excludeGenres: toArray(obj?.excludeGenres).map((s)=>String(s).trim().toLowerCase()),
    excludeTracks: toArray(obj?.excludeTracks).map((s)=>String(s).trim()),
  };
  // dédup simples
  const dedup = (arr:string[]) => Array.from(new Set(arr));
  plan.artists = dedup(plan.artists);
  plan.genres = dedup(plan.genres);
  plan.searchQueries = dedup(plan.searchQueries || []);
  plan.excludeArtists = dedup(plan.excludeArtists || []);
  plan.excludeGenres = dedup(plan.excludeGenres || []);
  plan.excludeTracks = dedup(plan.excludeTracks || []);
  return plan;
}

// ----------------- Providers -----------------
async function callOpenAI(prompt: string){
  if (!OPENAI_API_KEY) throw new Error('no_openai');
  const res = await fetch('https://api.openai.com/v1/chat/completions', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${OPENAI_API_KEY}` },
    body: JSON.stringify({
      model: 'gpt-4o-mini',
      messages: [
        { role: 'system', content: SYS },
        { role: 'user', content: prompt }
      ],
      temperature: 0.5,
    })
  });
  if (!res.ok) throw new Error('openai_failed');
  const js = await res.json();
  const text = js.choices?.[0]?.message?.content || '';
  const obj = tryExtractJSON(text);
  if (!obj) throw new Error('openai_parse');
  return obj;
}

async function callGemini(prompt: string){
  if (!GEMINI_API_KEY) throw new Error('no_gemini');
  const res = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash-latest:generateContent?key=${GEMINI_API_KEY}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      contents: [{ role: 'user', parts: [{ text: SYS + '\n\n' + prompt }]}]
    })
  });
  if (!res.ok) throw new Error('gemini_failed');
  const js = await res.json();
  const text = js?.candidates?.[0]?.content?.parts?.map((p:any)=>p.text).join(' ') || '';
  const obj = tryExtractJSON(text);
  if (!obj) throw new Error('gemini_parse');
  return obj;
}

async function callOpenRouter(prompt: string){
  if (!OPENROUTER_API_KEY) throw new Error('no_openrouter');
  const res = await fetch('https://openrouter.ai/api/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${OPENROUTER_API_KEY}`,
    },
    body: JSON.stringify({
      model: 'openrouter/auto',
      messages: [
        { role: 'system', content: SYS },
        { role: 'user', content: prompt }
      ],
      temperature: 0.5,
    })
  });
  if (!res.ok) throw new Error('openrouter_failed');
  const js = await res.json();
  const text = js.choices?.[0]?.message?.content || '';
  const obj = tryExtractJSON(text);
  if (!obj) throw new Error('openrouter_parse');
  return obj;
}

async function callOllama(prompt: string){
  if (!OLLAMA_BASE) throw new Error('no_ollama');
  const url = `${(OLLAMA_BASE||'').replace(/\/+$/,'')}/api/generate`;
  const res = await fetch(url, { method: 'POST', headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ model: 'llama3.1', prompt: SYS + '\n\n' + prompt }) });
  if (!res.ok) throw new Error('ollama_failed');
  // ollama stream -> concat
  const text = await res.text();
  // try to find "response":"..."
  const matches = Array.from(text.matchAll(/"response"\s*:\s*"([^"]*)"/g)).map(m=>m[1]);
  const joined = matches.join('');
  const obj = tryExtractJSON(joined || text);
  if (!obj) throw new Error('ollama_parse');
  return obj;
}

// Public API
export async function proposePlanLLM(prompt: string, approxN: number): Promise<Plan> {
  const providers = [
    async () => await callOpenAI(prompt),
    async () => await callGemini(prompt),
    async () => await callOpenRouter(prompt),
    async () => await callOllama(prompt),
  ];

  let lastErr: any = null;
  for (const fn of providers){
    try {
      const raw = await fn();
      const plan = normalizePlan(raw, approxN);
      if ((plan.artists.length + plan.genres.length + (plan.searchQueries?.length||0)) === 0){
        throw new Error('empty_plan');
      }
      return plan;
    } catch (e:any){
      lastErr = e;
      // continue to next provider
    }
  }
  if (lastErr?.message?.startsWith('no_')){
    // aucun provider dispo
    throw new Error('no_ai_provider');
  }
  throw new Error('ai_all_failed');
}
