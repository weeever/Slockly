import { NextRequest, NextResponse } from 'next/server';
import { getValidAccessToken } from '@/lib/spotify';

const API = 'https://api.spotify.com/v1';

async function spGet(token: string, path: string, params: Record<string, any> = {}) {
  const url = new URL(API + path);
  for (const [k, v] of Object.entries(params)) {
    if (v !== undefined && v !== null && String(v).length) url.searchParams.set(k, String(v));
  }
  const res = await fetch(url.toString(), { headers: { Authorization: `Bearer ${token}` } });
  if (!res.ok) throw new Error(`spotify_http_${res.status}`);
  return res.json();
}

function normalizeTrack(t: any){
  return {
    id: t.id,
    name: t.name,
    uri: t.uri,
    previewUrl: t.preview_url ?? null,
    artists: Array.isArray(t.artists) ? t.artists.map((a:any)=>a.name) : [],
    image: t?.album?.images?.[0]?.url ?? null,
  };
}

export async function POST(req: NextRequest){
  try{
    const token = await getValidAccessToken();
    if (!token) return NextResponse.json({ error: 'unauthenticated' }, { status: 401 });

    const { prompt, approxN } = await req.json();
    const q = String(prompt || '').trim();
    const limit = Math.max(1, Math.min(100, Number(approxN) || 20));

    if (!q) return NextResponse.json({ error: 'no_prompt' }, { status: 422 });

    // 1) Try to get artist seeds
    const searchArtists = await spGet(token, '/search', { q, type: 'artist', limit: 5, market: 'FR' });
    const artistIds = (searchArtists?.artists?.items ?? []).slice(0, 5).map((a:any)=>a.id);

    let recs: any[] = [];
    if (artistIds.length){
      try{
        const r = await spGet(token, '/recommendations', {
          seed_artists: artistIds.join(','),
          limit: Math.min(100, limit*2), // take a bit more then dedupe
          market: 'FR'
        });
        recs = (r?.tracks ?? []).map(normalizeTrack);
      }catch(e:any){
        // swallow and fallback
      }
    }

    // 2) Fallback: search tracks by query
    if (!recs.length){
      const searchTracks = await spGet(token, '/search', { q, type: 'track', limit: Math.min(50, limit*2), market: 'FR' });
      recs = (searchTracks?.tracks?.items ?? []).map(normalizeTrack);
    }

    // 3) Deduplicate and trim to N
    const out: any[] = [];
    const seen = new Set<string>();
    for (const t of recs){
      if (!t?.id || seen.has(t.id)) continue;
      seen.add(t.id);
      out.push(t);
      if (out.length >= limit) break;
    }

    if (!out.length){
      return NextResponse.json({ error: 'no_results', detail: 'Aucun titre correspondant.' }, { status: 422 });
    }

    return NextResponse.json({ ok: true, tracks: out });
  } catch (err:any){
    const msg = String(err?.message || err || 'generate_failed');
    const m = /spotify_http_(\d{3})/.exec(msg);
    const sc = m ? Number(m[1]) : 500;
    return NextResponse.json({ error: 'generate_failed', status: sc, detail: m ? m[1] : msg }, { status: 500 });
  }
}
