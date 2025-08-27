// src/app/api/playlist/generate/route.ts
/* eslint-disable @typescript-eslint/no-explicit-any */
import { NextRequest, NextResponse } from 'next/server';
import { getAccessCookie, getMe, searchArtists, availableGenreSeeds, recommendations, withPreviews, searchTracks } from '@/lib/spotify';
import { proposePlanLLM } from '@/lib/ai/provider';

type Body = { prompt: string; approxN?: number };

export async function POST(req: NextRequest){
  const access = getAccessCookie();
  if (!access) return NextResponse.json({ error: 'unauthenticated' }, { status: 401 });

  const body = await req.json().catch(()=>({})) as Body;
  const prompt = (body.prompt||'').trim();
  const approxN = Math.max(1, Math.min(100, Number(body.approxN || 20)));

  try{
    // 1) Ask LLM to plan
    const plan = await proposePlanLLM(prompt);

    // ensure n
    const N = Math.max(1, Math.min(100, plan.n || approxN));

    // 2) Resolve artists + filter genres against Spotify allowed seeds
    const me = await getMe(access);
    const market = me.country || 'FR';

    const allowedGenres = await availableGenreSeeds(access);
    const seed_genres = (plan.genres||[]).map(g=>g.toLowerCase().trim()).filter(Boolean).filter(g=>allowedGenres.includes(g)).slice(0,5);

    // find artist ids
    const seed_artists: string[] = [];
    for (const a of (plan.artists||[])){
      if (seed_artists.length >= 5) break;
      const found = await searchArtists(access, a, 1);
      const id = found?.[0]?.id;
      if (id) seed_artists.push(id);
    }

    // 3) If no seeds at all, try keywords -> find some tracks then lift their artists
    let seed_tracks: string[] = [];
    if (seed_artists.length === 0 && seed_genres.length === 0){
      for (const kw of (plan.keywords||[])){
        if (seed_tracks.length >= 5) break;
        const tr = await searchTracks(access, kw, 1, market);
        const id = tr?.[0]?.id;
        if (id) seed_tracks.push(id);
      }
    }

    if (seed_artists.length + seed_genres.length + seed_tracks.length === 0){
      return NextResponse.json({ error: 'no_seeds', detail: 'Aucun seed valide transmis à Spotify.' }, { status: 422 });
    }

    // 4) Call recommendations
    const rec = await recommendations(access, {
      seed_artists, seed_genres, seed_tracks,
      limit: N, market,
    });

    // 5) Format + dedupe
    const tracks = withPreviews(rec);
    const seen = new Set<string>();
    const unique = tracks.filter(t=>{
      if (!t.id) return false;
      if (seen.has(t.id)) return false;
      seen.add(t.id);
      return true;
    });

    return NextResponse.json({ ok:true, plan, tracks: unique.slice(0,N) });
  }catch(e:any){
    if (e?.status === 422){
      return NextResponse.json({ error: 'no_seeds', detail: 'Aucun seed valide transmis à Spotify.' }, { status: 422 });
    }
    const status = e?.status || 500;
    const detail = e?.detail || String(e?.message||'generate_failed');
    return NextResponse.json({ error: 'generate_failed', status, detail }, { status: 500 });
  }
}
