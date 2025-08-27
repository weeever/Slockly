/* eslint-disable @typescript-eslint/no-explicit-any */
// src/lib/ai/provider.ts
// LLM-only planner. No heuristics. If no key -> throw explicit error.
const OPENAI_API_KEY = process.env.OPENAI_API_KEY || process.env.OPENAI_API_KEY || '';
const OPENROUTER_API_KEY = process.env.OPENROUTER_API_KEY || '';
const GEMINI_API_KEY = process.env.GEMINI_API_KEY || '';

export type Plan = {
  n: number;
  artists: string[];
  genres: string[];
  keywords: string[];
  exclusions: {
    artists?: string[];
    genres?: string[];
    terms?: string[];
  }
};

const SYSTEM = `Tu es un planificateur de playlist Spotify. Tu reçois une consigne libre en français.
Ta sortie DOIT être un JSON strict (pas de texte autour) au format:
{
  "n": <entier>,
  "artists": [noms d'artistes], 
  "genres": [genres au format Spotify si connu], 
  "keywords": [mots-clés libres], 
  "exclusions": { "artists":[], "genres":[], "terms":[] }
}
Règles:
- "n": si l'utilisateur donne un nombre (ou via 'Approx. N'), prends-le sinon 20 par défaut.
- Remplis "artists" (max 8) avec des artistes pertinents.
- Remplis "genres" (max 6) avec genres plausibles (même si certains ne sont pas seeds officiels).
- "keywords": mots/phrases utiles (langue, époque, ambiance, bpm, etc.) max 10.
- "exclusions": tout ce que l'utilisateur veut éviter (artistes/genres/termes).
- Ne mets JAMAIS de duplicate dans artists/genres.
- Ne propose AUCUN titre précis ici, seulement le plan.
`;

function chooseProvider(){
  if (OPENAI_API_KEY) return 'openai';
  if (OPENROUTER_API_KEY) return 'openrouter';
  if (GEMINI_API_KEY) return 'gemini';
  throw Object.assign(new Error('no_ai_provider'), { status: 503 });
}

export async function proposePlanLLM(prompt: string): Promise<Plan> {
  const provider = chooseProvider();
  if (provider === 'openai'){
    const res = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: { 'Authorization': `Bearer ${OPENAI_API_KEY}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({
        model: 'gpt-4o-mini',
        response_format: { type: 'json_object' },
        messages: [
          { role: 'system', content: SYSTEM },
          { role: 'user', content: prompt }
        ]
      })
    });
    if (!res.ok) throw new Error('llm_failed_openai_'+res.status);
    const json:any = await res.json();
    const text = json.choices?.[0]?.message?.content || '{}';
    return JSON.parse(text);
  }
  if (provider === 'openrouter'){
    const res = await fetch('https://openrouter.ai/api/v1/chat/completions', {
      method: 'POST',
      headers: { 'Authorization': `Bearer ${OPENROUTER_API_KEY}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({
        model: 'anthropic/claude-3.5-sonnet:beta',
        response_format: {"type":"json_object"},
        messages: [
          { role: 'system', content: SYSTEM },
          { role: 'user', content: prompt }
        ]
      })
    });
    if (!res.ok) throw new Error('llm_failed_openrouter_'+res.status);
    const json:any = await res.json();
    const text = json.choices?.[0]?.message?.content || '{}';
    return JSON.parse(text);
  }
  if (provider == 'gemini'){
    // Gemini JSON mode via "contents" with schema-like prompt
    const res = await fetch('https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key='+GEMINI_API_KEY, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        contents: [{ role: 'user', parts: [{ text: SYSTEM + '\n\nUSER:\n' + prompt + '\nRéponds uniquement en JSON.' }]}],
        generationConfig: { responseMimeType: 'application/json' }
      })
    });
    if (!res.ok) throw new Error('llm_failed_gemini_'+res.status);
    const json:any = await res.json();
    const text = json.candidates?.[0]?.content?.parts?.[0]?.text || '{}';
    return JSON.parse(text);
  }
  throw Object.assign(new Error('no_ai_provider'), { status: 503 });
}
