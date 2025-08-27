// src/lib/ai/provider.ts
// Sélectionne automatiquement un provider IA dispo (OpenAI, OpenRouter, Gemini) et
// renvoie un plan JSON strict pour la génération de playlist.

type Plan = {
  seeds: { artists: string[]; genres: string[]; keywords?: string[] };
  exclude?: { artists?: string[]; genres?: string[] };
  diversity?: { maxPerArtist?: number };
};

const OPENAI_API_KEY = process.env.OPENAI_API_KEY || '';
const OPENROUTER_API_KEY = process.env.OPENROUTER_API_KEY || '';
const GEMINI_API_KEY = process.env.GEMINI_API_KEY || '';

async function callJSONModel(system: string, user: string): Promise<any | null> {
  // OpenAI compatible en priorité
  if (OPENAI_API_KEY) {
    const res = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: { 'Authorization': `Bearer ${OPENAI_API_KEY}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({
        model: 'gpt-4o-mini',
        messages: [
          { role: 'system', content: system },
          { role: 'user', content: user },
        ],
        temperature: 0.3,
        response_format: { type: 'json_object' },
      })
    });
    if (res.ok) {
      const j = await res.json();
      const txt = j?.choices?.[0]?.message?.content || '{}';
      try { return JSON.parse(txt); } catch { return null; }
    }
  }

  // OpenRouter (OpenAI compatible)
  if (OPENROUTER_API_KEY) {
    const res = await fetch('https://openrouter.ai/api/v1/chat/completions', {
      method: 'POST',
      headers: { 'Authorization': `Bearer ${OPENROUTER_API_KEY}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({
        model: 'openai/gpt-4o-mini',
        messages: [
          { role: 'system', content: system },
          { role: 'user', content: user },
        ],
        temperature: 0.3,
        response_format: { type: 'json_object' },
      })
    });
    if (res.ok) {
      const j = await res.json();
      const txt = j?.choices?.[0]?.message?.content || '{}';
      try { return JSON.parse(txt); } catch { return null; }
    }
  }

  // Gemini (pas de JSON schema strict, on parse best-effort)
  if (GEMINI_API_KEY) {
    const res = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${GEMINI_API_KEY}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        contents: [{ role: 'user', parts: [{ text: `${system}\n\nUSER:\n${user}\n\nRéponds UNIQUEMENT en JSON.` }] }]
      })
    });
    if (res.ok) {
      const j = await res.json();
      const txt = j?.candidates?.[0]?.content?.parts?.[0]?.text || '{}';
      try { return JSON.parse(txt); } catch { return null; }
    }
  }

  return null;
}

export async function proposePlanLLM(prompt: string, N: number): Promise<Plan> {
  const system = `
Tu es un planificateur de playlists Spotify. Tu réponds UNIQUEMENT en JSON.
Schéma : {"seeds":{"artists":[],"genres":[],"keywords":[]},"exclude":{"artists":[],"genres":[]},"diversity":{"maxPerArtist":2}}
Règles :
- "artists" = 3 à 8 artistes pertinents selon la demande.
- "genres" = 2 à 8 genres (Spotify canonical si possible).
- "keywords" = 2 à 6 mots/phrases utiles pour recherche textuelle.
- "exclude" respecte strictement les interdictions utilisateur.
- "diversity.maxPerArtist" propose 2 si N<=20, 3 si 21-40, 4 au-delà.
Ne mets pas de commentaires. Pas d'autres clés.
`.trim();

  const user = `
Prompt utilisateur: ${prompt}
N demandé: ${N}
`.trim();

  const out = await callJSONModel(system, user);

  // Fallback robuste si l'IA est indispo ou renvoie n'importe quoi
  if (!out || typeof out !== 'object') {
    // heuristique minimale pour éviter un échec dur
    const p = (prompt || '').toLowerCase();
    const artists: string[] = [];
    const genres: string[] = [];

    // très basique : si un mot unique -> artiste seed
    if (p.trim().split(/\s+/).length <= 3) artists.push(prompt);

    return {
      seeds: { artists, genres, keywords: [prompt] },
      exclude: { artists: [], genres: [] },
      diversity: { maxPerArtist: N <= 20 ? 2 : N <= 40 ? 3 : 4 },
    };
  }

  // Normalisation légère
  const seeds = out.seeds || {};
  seeds.artists = Array.isArray(seeds.artists) ? seeds.artists : [];
  seeds.genres = Array.isArray(seeds.genres) ? seeds.genres : [];
  seeds.keywords = Array.isArray(seeds.keywords) ? seeds.keywords : [];

  const exclude = out.exclude || {};
  exclude.artists = Array.isArray(exclude.artists) ? exclude.artists : [];
  exclude.genres = Array.isArray(exclude.genres) ? exclude.genres : [];

  const diversity = out.diversity || {};
  let maxPerArtist = Number(diversity.maxPerArtist || 0);
  if (!maxPerArtist) maxPerArtist = (N <= 20 ? 2 : (N <= 40 ? 3 : 4));

  return {
    seeds,
    exclude,
    diversity: { maxPerArtist },
  };
}