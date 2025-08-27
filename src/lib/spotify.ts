/* eslint-disable @typescript-eslint/no-explicit-any */
// src/lib/spotify.ts
import crypto from 'crypto';
import { cookies } from 'next/headers';

const CLIENT_ID = process.env.SPOTIFY_CLIENT_ID || '';
const CLIENT_SECRET = process.env.SPOTIFY_CLIENT_SECRET || '';
const SERVER_URL = process.env.SERVER_URL || '';
const FRONTEND_URL = process.env.NEXT_PUBLIC_FRONTEND_URL || process.env.FRONTEND_URL || '';
export const DEFAULT_SCOPES = [
  'user-read-email',
  'playlist-modify-public',
  'playlist-modify-private'
];

// ---------- URL helpers ----------
export function baseUrl(reqOrigin?: string) {
  const base = (SERVER_URL || reqOrigin || '').trim();
  try {
    return new URL(base).toString().replace(/\/+$/,''); // ensure absolute + no trailing slash
  } catch {
    // last resort in dev
    return 'http://127.0.0.1:8080';
  }
}

export function buildRedirectUri(origin?: string) {
  return `${baseUrl(origin)}/api/auth/spotify/callback`;
}

export function makePKCE(){
  const verifier = crypto.randomBytes(32).toString('base64url');
  const challenge = crypto
    .createHash('sha256')
    .update(verifier)
    .digest('base64')
    .replace(/\+/g,'-').replace(/\//g,'_').replace(/=+$/,'');
  return { verifier, challenge };
}

export function buildAuthorizeUrl(origin: string, state: string, codeChallenge: string){
  const redirect_uri = buildRedirectUri(origin);
  const params = new URLSearchParams();
  params.set('response_type', 'code');
  params.set('client_id', CLIENT_ID);
  params.set('redirect_uri', redirect_uri);
  params.set('scope', DEFAULT_SCOPES.join(' '));
  params.set('state', state);
  params.set('code_challenge', codeChallenge);
  params.set('code_challenge_method', 'S256');
  return new URL('https://accounts.spotify.com/authorize?' + params.toString());
}

// ---------- Cookies helpers ----------
const ACCESS_COOKIE = 'slockly_at';
const REFRESH_COOKIE = 'slockly_rt';

export function setAccessCookie(token: string, maxAgeSec: number){
  cookies().set(ACCESS_COOKIE, token, { httpOnly: true, sameSite: 'lax', path: '/', secure: false, maxAge: maxAgeSec });
}
export function setRefreshCookie(token: string){
  // Spotify refresh token is long-lived; we keep 30 days by default
  cookies().set(REFRESH_COOKIE, token, { httpOnly: true, sameSite: 'lax', path: '/', secure: false, maxAge: 60*60*24*30 });
}
export function getAccessCookie(){ return cookies().get(ACCESS_COOKIE)?.value || ''; }
export function getRefreshCookie(){ return cookies().get(REFRESH_COOKIE)?.value || ''; }

// ---------- Spotify HTTP ----------
const API = 'https://api.spotify.com/v1';

async function spotifyFetch<T>(path: string, accessToken: string, init?: RequestInit & { query?: Record<string,string|number|boolean|undefined> }) : Promise<T> {
  const url = new URL(path.startsWith('http') ? path : API + path);
  if (init?.query){
    for (const [k,v] of Object.entries(init.query)){
      if (v !== undefined) url.searchParams.set(k, String(v));
    }
  }
  const res = await fetch(url, {
    ...init,
    headers: {
      'Authorization': `Bearer ${accessToken}`,
      'Content-Type': 'application/json',
      ...(init?.headers||{})
    }
  });
  if (!res.ok){
    const text = await res.text().catch(()=>'');
    const err:any = new Error('spotify_http_'+res.status);
    err.status = res.status;
    err.detail = text;
    throw err;
  }
  return res.json() as Promise<T>;
}

async function tokenFetch(form: Record<string,string>){
  const body = new URLSearchParams(form);
  const headers: Record<string,string> = { 'Content-Type': 'application/x-www-form-urlencoded' };
  // For confidential clients, Spotify expects Basic auth
  if (CLIENT_ID && CLIENT_SECRET){
    const basic = Buffer.from(`${CLIENT_ID}:${CLIENT_SECRET}`).toString('base64');
    headers['Authorization'] = `Basic ${basic}`;
  }
  const res = await fetch('https://accounts.spotify.com/api/token', {
    method: 'POST', headers, body
  });
  if (!res.ok){
    const text = await res.text().catch(()=>'');
    const err:any = new Error('spotify_token_'+res.status);
    err.status = res.status;
    err.detail = text;
    throw err;
  }
  return res.json() as Promise<any>;
}

// ---------- Auth flows ----------
export async function exchangeCodeForTokens(code: string, codeVerifier: string, origin?: string){
  const redirect_uri = buildRedirectUri(origin);
  const payload: Record<string,string> = {
    grant_type: 'authorization_code',
    code, redirect_uri,
    client_id: CLIENT_ID,
    code_verifier: codeVerifier,
  };
  const json = await tokenFetch(payload);
  return {
    access_token: json.access_token as string,
    refresh_token: json.refresh_token as string,
    expires_in: json.expires_in as number,
    scope: json.scope as string,
    token_type: json.token_type as string,
  };
}

export async function refreshAccessToken(refreshToken: string){
  const payload: Record<string,string> = {
    grant_type: 'refresh_token',
    refresh_token: refreshToken,
    client_id: CLIENT_ID,
  };
  const json = await tokenFetch(payload);
  return {
    access_token: json.access_token as string,
    refresh_token: (json.refresh_token || refreshToken) as string,
    expires_in: json.expires_in as number,
  };
}

// ---------- Web API helpers ----------
export async function getMeRaw(accessToken: string){
  return spotifyFetch<any>('/me', accessToken);
}
export async function getMe(accessToken: string){
  const me = await getMeRaw(accessToken);
  const avatar = (me.images && me.images[0] && me.images[0].url) ? me.images[0].url : null;
  return { id: me.id, display_name: me.display_name || me.id, country: me.country || 'FR', avatar };
}

export async function searchArtists(accessToken: string, q: string, limit=5){
  const json = await spotifyFetch<any>('/search', accessToken, { query: { type: 'artist', q, limit } });
  return (json.artists?.items || []) as any[];
}

export async function searchTracks(accessToken: string, q: string, limit=10, market?: string){
  const json = await spotifyFetch<any>('/search', accessToken, { query: { type: 'track', q, limit, market } });
  return (json.tracks?.items || []) as any[];
}

export async function availableGenreSeeds(accessToken: string){
  const json = await spotifyFetch<any>('/recommendations/available-genre-seeds', accessToken);
  return (json.genres || []) as string[];
}

export type RecOptions = {
  seed_artists?: string[];
  seed_genres?: string[];
  seed_tracks?: string[];
  limit?: number;
  market?: string;
  min_energy?: number;
  target_energy?: number;
  max_energy?: number;
  min_popularity?: number;
  max_popularity?: number;
};
export async function recommendations(accessToken: string, opts: RecOptions){
  const seedsCount = (opts.seed_artists?.length||0)+(opts.seed_genres?.length||0)+(opts.seed_tracks?.length||0);
  if (seedsCount === 0) {
    const e:any = new Error('no_seeds');
    e.status = 422;
    throw e;
  }
  const query: Record<string,string|number> = { limit: Math.min(100, opts.limit||20) };
  if (opts.market) query.market = opts.market;
  if (opts.seed_artists?.length) query.seed_artists = (opts.seed_artists as string[]).slice(0,5).join(',');
  if (opts.seed_genres?.length) query.seed_genres = (opts.seed_genres as string[]).slice(0,5).join(',');
  if (opts.seed_tracks?.length) query.seed_tracks = (opts.seed_tracks as string[]).slice(0,5).join(',');
  if (opts.min_energy!=null) query.min_energy = opts.min_energy;
  if (opts.max_energy!=null) query.max_energy = opts.max_energy;
  if (opts.target_energy!=null) query.target_energy = opts.target_energy;
  if (opts.min_popularity!=null) query.min_popularity = opts.min_popularity;
  if (opts.max_popularity!=null) query.max_popularity = opts.max_popularity;
  const json = await spotifyFetch<any>('/recommendations', accessToken, { query });
  return (json.tracks || []) as any[];
}

export async function createPlaylist(accessToken: string, userId: string, name: string, description = '', isPublic = false){
  const body = JSON.stringify({ name, description, public: isPublic });
  const json = await spotifyFetch<any>(`/users/${encodeURIComponent(userId)}/playlists`, accessToken, { method: 'POST', body });
  return json;
}

export async function addTracksToPlaylist(accessToken: string, playlistId: string, uris: string[]){
  const body = JSON.stringify({ uris });
  const json = await spotifyFetch<any>(`/playlists/${encodeURIComponent(playlistId)}/tracks`, accessToken, { method: 'POST', body });
  return json;
}

export function withPreviews(items: any[]){
  return items.map(t => {
    const artists = (t.artists||[]).map((a:any)=>a.name);
    const cover = t.album?.images?.[1]?.url || t.album?.images?.[0]?.url || null;
    return {
      id: t.id, uri: t.uri, name: t.name,
      artists, previewUrl: t.preview_url || null, cover
    };
  });
}

export { CLIENT_ID, CLIENT_SECRET, SERVER_URL, FRONTEND_URL };
