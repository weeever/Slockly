// src/app/api/playlist/generate/route.ts
import { NextResponse } from 'next/server';
import { searchArtists, recommendations, mapTracks } from '@/lib/spotify';

export async function POST(req: Request) {
  try {
    const { prompt, approxN } = await req.json();
    const n = Math.max(1, Math.min(50, Number(approxN) || 20));
    const q = String(prompt || '').trim();
    if (!q) return NextResponse.json({ error: 'no_prompt' }, { status: 422 });

    // Simple, robust seed selection: pick best artist for the query
    const sr = await searchArtists(q, 5);
    const seedArtists: string[] = (sr.artists?.items || []).slice(0, 3).map((a:any)=> a.id).filter(Boolean);
    if (!seedArtists.length) return NextResponse.json({ error: 'no_seeds', detail: 'Aucun artiste trouvé.' }, { status: 422 });

    // Recommendations
    const rec = await recommendations({ seed_artists: seedArtists, limit: n });
    const tracks = mapTracks(rec.tracks || []);

    if (!tracks.length) return NextResponse.json({ error: 'no_results' }, { status: 422 });
    return NextResponse.json({ ok: true, tracks });
  } catch (e:any) {
    console.error('generate_error', e);
    const status = e?.status || 500;
    return NextResponse.json({ error: e?.message || 'server_error', status, detail: e?.detail || '' }, { status: status >= 100 && status < 600 ? status : 500 });
  }
}
