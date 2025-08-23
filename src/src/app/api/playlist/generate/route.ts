import { analyze } from '@/lib/ai/provider';
import { search, recommendations, spotifyFetch } from '@/lib/spotify';

async function fetchArtistGenres(id:string){ const r = await spotifyFetch(`/artists/${id}`); if(!r.ok) return []; const j = await r.json(); return (j?.genres||[]) as string[]; }
import { resolvePreview } from '@/lib/preview';
import { checkRateLimit } from '@/lib/ratelimit';
import { getIP } from '@/lib/utils';

type TrackOut = {
  id: string;
  uri: string;
  name: string;
  artists: string[];
  albumCover: string;
  explicit: boolean;
  duration_ms: number;
  preview: string | null;
};

function norm(s: string){ return (s||'').toLowerCase().trim(); }
function dedupe<T>(arr: T[], key: (x:T)=>string){ const seen = new Set<string>(); return arr.filter(x=>{ const k = key(x); if (seen.has(k)) return false; seen.add(k); return true; }); }

export async function POST(req: Request){
  const rl = checkRateLimit(getIP(req));
  if (rl.limited) return new Response('Rate limited', { status: 429 });

  const body = await req.json();
  const prompt: string = body?.prompt || '';
  const approxN: number = Math.max(1, Number(body?.approxN) || 20);
  const market = 'FR'; // choose a stable market for availability

  try {
    // 1) Analyse prompt (fallback heuristique côté provider si pas de clé)
    const parsed = await analyze(prompt, approxN);

    const incArtists = (parsed.artists_include ?? []).map(norm).slice(0, 6);
    const incTracks  = (parsed.tracks_include  ?? []).slice(0, 6);
    const incGenres  = (parsed.genres_include  ?? []).map(norm).slice(0, 6);

    const exArtists  = new Set((parsed.artists_exclude ?? []).map(norm));
    const exTracks   = new Set((parsed.tracks_exclude  ?? []).map(norm));
    const exGenres   = new Set((parsed.genres_exclude  ?? []).map(norm));

    // 2) Résoudre seeds Spotify (IDs)
    const seedArtistIds: string[] = [];
    for (const name of incArtists){
      const res = await search(name, 'artist', 1);
      const id = res?.artists?.items?.[0]?.id;
      if (id) seedArtistIds.push(id);
    }

    const seedTrackIds: string[] = [];
    const initialTracks: any[] = [];
    for (const q of incTracks){
      const res = await search(q, 'track', 3);
      const item = res?.tracks?.items?.[0];
      if (item?.id) {
        seedTrackIds.push(item.id);
        initialTracks.push(item);
      }
    }

    const seedGenres: string[] = incGenres; // Spotify accepte des noms bruts (subset)

    // 3) Construire la playlist
    let collected: any[] = [];

    // a) Ajouter d'abord les titres explicitement demandés
    collected.push(...initialTracks);

    // b) Essayer les recommandations Spotify
    const limits = { mainstream: { min: 60 }, niche: { max: 60 }, mixed: {} as any };
    const pop = (parsed.popularity || 'mixed') as 'mainstream'|'niche'|'mixed';
    const popArgs: any = {};
    if (pop === 'mainstream') popArgs.min_popularity = limits.mainstream.min;
    if (pop === 'niche') popArgs.max_popularity = limits.niche.max;

    try {
      if ((seedArtistIds.length + seedTrackIds.length + seedGenres.length) > 0){
        const reco = await recommendations({
          seed_artists: seedArtistIds,
          seed_tracks: seedTrackIds,
          seed_genres: seedGenres,
          limit: Math.min(100, approxN * 2),
          ...popArgs
        });
        const items = reco?.tracks ?? [];
        collected.push(...items);
      }
    } catch (e){
      // c) Fallback : top-tracks par artiste
      for (const id of seedArtistIds){
        const res = await spotifyFetch(`/artists/${id}/top-tracks?market=${market}`);
        if (res.ok){
          const js = await res.json();
          collected.push(...(js?.tracks ?? []));
        }
      }
    }

    // d) Si on n'a toujours pas assez, essaye une recherche large sur le prompt
    if (collected.length < approxN){
      const res = await search(prompt, 'track', approxN*2);
      collected.push(...(res?.tracks?.items ?? []));
    }

    // 4) Filtrages & dé-dup
    let tracks = collected.map((t:any)=>t).filter(Boolean);

    // dedupe par track.id
    tracks = dedupe(tracks, (t:any)=>t.id);

    // exclusions titres/artistes
    tracks = tracks.filter((t:any)=>{
      const title = norm(t.name);
      if (exTracks.has(title)) return false;
      const artistNames = (t.artists||[]).map((a:any)=>norm(a.name));
      if (artistNames.some(a=>exArtists.has(a))) return false;
      return true;
    });


    // exclusion genres (best-effort) via nom d'artiste present dans exclusions de genre
    if (exGenres.size){
      // exclusion genres (best-effort) via genres des artistes (batch /v1/artists)
    if (exGenres.size){
      try{
        const artistIds = Array.from(new Set(
          tracks.flatMap((t:any)=> (t.artists||[]).map((a:any)=>a.id).filter(Boolean))
        ));
        const genreMap = new Map<string, string[]>();
        for (let i=0;i<artistIds.length;i+=50){
          const batch = artistIds.slice(i, i+50);
          if (batch.length === 0) continue;
          const r = await spotifyFetch(`/v1/artists?ids=${batch.join(',')}`);
          if (!r.ok) continue;
          const j = await r.json();
          for (const a of (j.artists||[])){
            const gs = (a?.genres||[]).map((g:string)=>norm(g));
            if (a?.id) genreMap.set(a.id, gs);
          }
        }
        tracks = tracks.filter((t:any)=>{
          const ids = (t.artists||[]).map((a:any)=>a.id).filter(Boolean);
          const gs:string[] = [];
          for (const id of ids){
            const g = genreMap.get(id); if (g) gs.push(...g);
          }
          return !gs.some((g)=> exGenres.has(g));
        });
        // re-dedupe après filtre
        tracks = dedupe(tracks, (t:any)=>t.id);
      } catch {}
    }
    }

    // 5) Formater + préviews (avec fallback)
    const out: TrackOut[] = [];
    for (const t of tracks){
      const preview = await resolvePreview({
        id: t.id,
        name: t.name,
        artists: (t.artists||[]).map((a:any)=>a.name).join(', '),
        spotify_preview_url: t.preview_url ?? null
      });
      out.push({
        id: t.id,
        uri: t.uri,
        name: t.name,
        artists: (t.artists||[]).map((a:any)=>a.name),
        albumCover: t.album?.images?.[0]?.url || '',
        explicit: !!t.explicit,
        duration_ms: t.duration_ms || 0,
        preview
      });
      if (out.length >= approxN + 2) break;
    }

    // 6) Respecter N ± 2
    const finalN = Math.max(1, approxN);
    const final = out.slice(0, Math.max(1, finalN + 2));

    return Response.json({ tracks: final });
  } catch (e:any){
    console.error('generate error', e?.stack || e);
    return new Response(JSON.stringify({ error: e?.message || 'generate failed' }), { status: 500 });
  }
}
