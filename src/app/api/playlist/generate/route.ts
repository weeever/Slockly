import { NextResponse } from 'next/server';

type GenBody = { prompt?: string; approx?: number; n?: number };

function uniq<T>(arr: T[], key: (t:T)=>string){
  const seen = new Set<string>(); const out:T[] = [];
  for (const x of arr){
    const k = key(x);
    if (!seen.has(k)){ seen.add(k); out.push(x); }
  }
  return out;
}

export async function POST(req: Request){
  try {
    const cookie = (await import('next/headers')).cookies();
    const access = cookie.get('slockly_at')?.value;
    if (!access){
      return NextResponse.json({ error: 'no_token' }, { status: 401 });
    }

    const { prompt, approx, n }: GenBody = await req.json().catch(()=>({})) as any;
    const wanted = Math.max(1, Math.min(100, (approx ?? n ?? 20)|0));
    const q = (prompt||'').trim();
    if (!q){
      return NextResponse.json({ error: 'no_prompt' }, { status: 422 });
    }

    // 1) Try artist search
    const searchArtists = await fetch(`https://api.spotify.com/v1/search?type=artist&limit=5&q=${encodeURIComponent(q)}`, {
      headers: { Authorization: `Bearer ${access}` }
    });
    if (searchArtists.status === 401){
      return NextResponse.json({ error: 'token_expired' }, { status: 401 });
    }
    const artistsJs = searchArtists.ok ? await searchArtists.json() : null;
    const artistSeeds: string[] = (artistsJs?.artists?.items || []).map((a:any)=> a?.id).filter(Boolean);

    // Fallback: infer seeds from track search (using primary artist of top tracks)
    let seeds: string[] = artistSeeds.slice(0,5);
    if (seeds.length === 0){
      const searchTracks = await fetch(`https://api.spotify.com/v1/search?type=track&limit=8&q=${encodeURIComponent(q)}`, {
        headers: { Authorization: `Bearer ${access}` }
      });
      const tracksJs = searchTracks.ok ? await searchTracks.json() : null;
      const primaryArtists = (tracksJs?.tracks?.items||[])
        .map((t:any)=> (t?.artists?.[0]?.id)||null)
        .filter(Boolean);
      seeds = uniq(primaryArtists, s=>s as string).slice(0,5) as string[];
    }

    if (seeds.length === 0){
      return NextResponse.json({ error: 'no_seeds', detail: 'Aucun seed artiste/track trouvé pour ce prompt.' }, { status: 422 });
    }

    // 2) Recommendations
    const params = new URLSearchParams();
    params.set('limit', String(wanted));
    params.set('seed_artists', seeds.join(','));
    // Optional: params.set('market','FR'); // uncomment if you want to force a market

    const rec = await fetch(`https://api.spotify.com/v1/recommendations?${params.toString()}`, {
      headers: { Authorization: `Bearer ${access}` }
    });
    if (!rec.ok){
      const text = await rec.text().catch(()=>'');
      return NextResponse.json({ error: 'spotify_recommendations_failed', status: rec.status, detail: text.slice(0, 300) }, { status: rec.status });
    }
    const recJs = await rec.json();

    const tracks = (recJs?.tracks||[]).map((t:any)=>{
      const artists = (t?.artists||[]).map((a:any)=> a?.name).filter(Boolean);
      const albumCover = (t?.album?.images?.[0]?.url)||null;
      return {
        id: t?.id,
        uri: t?.uri,
        name: t?.name,
        artists,
        albumCover,
        previewUrl: t?.preview_url || null
      };
    }).filter((t:any)=> t?.id && t?.name);

    const unique = uniq(tracks, (t:any)=> t.id);
    return NextResponse.json({ ok: true, tracks: unique });
  } catch (err:any){
    return NextResponse.json({ error: 'server_error', detail: String(err?.message||err) }, { status: 500 });
  }
}
