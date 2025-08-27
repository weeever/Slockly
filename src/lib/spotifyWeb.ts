// src/lib/spotifyWeb.ts
import { cookies, headers } from 'next/headers';

const API_BASE = 'https://api.spotify.com/v1';

export function getAccessTokenFromCookies(): string | null {
  const store = cookies();
  const at = store.get('slockly_at')?.value || null;
  return at;
}

async function spotifyFetch(path: string, init: RequestInit = {}){
  const token = getAccessTokenFromCookies();
  if (!token) {
    const err: any = new Error('spotify_no_token');
    err.status = 401;
    throw err;
  }
  const url = path.startsWith('http') ? path : `${API_BASE}${path}`;
  const res = await fetch(url, {
    ...init,
    headers: {
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json',
      ...(init.headers||{} as any),
    }
  });
  if (!res.ok){
    const e: any = new Error(`spotify_http_${res.status}`);
    e.status = res.status;
    e.detail = await res.text().catch(()=>'');
    throw e;
  }
  return res;
}

export async function me(){
  const res = await spotifyFetch('/me');
  const body = await res.json();
  return body;
}

export async function availableGenreSeeds(): Promise<string[]>{
  const res = await spotifyFetch('/recommendations/available-genre-seeds');
  const body = await res.json();
  return body.genres || [];
}

export async function searchArtists(q: string, market?: string){
  const res = await spotifyFetch(`/search?type=artist&limit=10&q=${encodeURIComponent(q)}${market ? `&market=${market}` : ''}`);
  const body = await res.json();
  return (body.artists?.items || []) as any[];
}

export async function searchTracks(q: string, market?: string){
  const res = await spotifyFetch(`/search?type=track&limit=30&q=${encodeURIComponent(q)}${market ? `&market=${market}` : ''}`);
  const body = await res.json();
  return (body.tracks?.items || []) as any[];
}

export async function relatedArtists(id: string){
  const res = await spotifyFetch(`/artists/${id}/related-artists`);
  const body = await res.json();
  return body.artists || [];
}

export async function topTracksForArtist(id: string, market='FR'){
  const res = await spotifyFetch(`/artists/${id}/top-tracks?market=${market}`);
  const body = await res.json();
  return body.tracks || [];
}

export async function recommendations(opts: {
  seed_artists?: string[];
  seed_genres?: string[];
  seed_tracks?: string[];
  limit?: number;
  market?: string;
  min_energy?: number;
  max_energy?: number;
  target_energy?: number;
}){
  const p = new URLSearchParams();
  const seed_artists = (opts.seed_artists||[]).slice(0,5);
  const seed_genres  = (opts.seed_genres||[]).slice(0,5);
  const seed_tracks  = (opts.seed_tracks||[]).slice(0,5);
  if (seed_artists.length) p.set('seed_artists', seed_artists.join(','));
  if (seed_genres.length)  p.set('seed_genres', seed_genres.join(','));
  if (seed_tracks.length)  p.set('seed_tracks', seed_tracks.join(','));
  p.set('limit', String(Math.max(1, Math.min(100, opts.limit||20))));
  if (opts.market) p.set('market', opts.market);
  if (opts.min_energy!=null) p.set('min_energy', String(opts.min_energy));
  if (opts.max_energy!=null) p.set('max_energy', String(opts.max_energy));
  if (opts.target_energy!=null) p.set('target_energy', String(opts.target_energy));

  try{
    const res = await spotifyFetch(`/recommendations?${p.toString()}`);
    const body = await res.json();
    return body.tracks || [];
  }catch(err:any){
    // swallow 400/404 into empty list to allow fallbacks
    if (err && (err.status===400 || err.status===404)) return [];
    throw err;
  }
}

export type UTrack = {
  id: string;
  uri: string;
  name: string;
  artists: string[];
  artistsFull?: { id: string; name: string }[];
  cover: string | null;
  album?: { id: string; name: string; image: string | null };
  previewUrl: string | null;
};

export function mapTrack(t:any): UTrack {
  const cover = t?.album?.images?.[0]?.url || null;
  const artists = (t?.artists||[]).map((a:any)=>a?.name).filter(Boolean);
  const artistsFull = (t?.artists||[]).map((a:any)=>({id:a?.id, name:a?.name})).filter(a=>a.id && a.name);
  return {
    id: t?.id,
    uri: t?.uri,
    name: t?.name,
    artists,
    artistsFull,
    cover,
    album: { id: t?.album?.id, name: t?.album?.name, image: cover },
    previewUrl: t?.preview_url || null,
  };
}

export function dedupeAndCap(tracks: UTrack[], n: number){
  const seen = new Set<string>();
  const byArtistCount = new Map<string, number>();
  const cap = n <= 20 ? 2 : n <= 40 ? 3 : 4;

  const out: UTrack[] = [];
  for (const t of tracks){
    if (!t?.id) continue;
    if (seen.has(t.id)) continue;
    const keyArtists = (t.artists||[]).join('|');
    const count = byArtistCount.get(keyArtists) || 0;
    if (count >= cap) continue;
    seen.add(t.id);
    byArtistCount.set(keyArtists, count+1);
    out.push(t);
    if (out.length >= n) break;
  }
  return out;
}