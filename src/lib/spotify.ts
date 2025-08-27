// src/lib/spotify.ts
import { cookies } from 'next/headers';

const SERVER_URL = process.env.SERVER_URL || '';
export const CLIENT_ID = process.env.SPOTIFY_CLIENT_ID || '';
const CLIENT_SECRET = process.env.SPOTIFY_CLIENT_SECRET || '';
export const DEFAULT_SCOPES = [
  'user-read-email',
  'playlist-modify-public',
  'playlist-modify-private',
].join(' ');

const AT_COOKIE = 'slockly_at';
const RT_COOKIE = 'slockly_rt';
const PKCE_COOKIE = 'slockly_pkce';
const STATE_COOKIE = 'slockly_state';

function baseUrl(origin?: string){
  const o = (origin || SERVER_URL || '').replace(/\/+$/,'');
  return o || 'http://127.0.0.1:8080';
}

export function buildRedirectUri(origin?: string){
  return `${baseUrl(origin)}/api/auth/spotify/callback`;
}

function toBase64Url(input: ArrayBuffer){
  const bytes = Buffer.from(input);
  return bytes.toString('base64')
    .replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/,'');
}

function rand(size = 64){
  const bytes = Buffer.from(crypto.getRandomValues(new Uint8Array(size)));
  return bytes.toString('base64').replace(/[^a-zA-Z0-9]/g,'').slice(0, 64);
}

// Edge/Node compatible crypto
const cryptoSubtle = (globalThis as any).crypto?.subtle || require('crypto').webcrypto.subtle;
const nodeCrypto = require('crypto');

export function makePKCE(){
  const verifier = rand(64);
  const data = new TextEncoder().encode(verifier);
  return cryptoSubtle.digest('SHA-256', data).then((hash:any)=>{
    const challenge = toBase64Url(hash);
    return { verifier, challenge };
  });
}

export function buildAuthorizeUrl(origin: string, state: string, code_challenge: string){
  const params = new URLSearchParams({
    response_type: 'code',
    client_id: CLIENT_ID,
    redirect_uri: buildRedirectUri(origin),
    scope: DEFAULT_SCOPES,
    state,
    code_challenge,
    code_challenge_method: 'S256'
  });
  return `https://accounts.spotify.com/authorize?${params.toString()}`;
}

async function tokenRequest(body: Record<string,string>){
  const res = await fetch('https://accounts.spotify.com/api/token', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams(body).toString()
  });
  const json = await res.json();
  if (!res.ok){ const err:any = new Error('spotify_token_error'); err.detail = json; throw err; }
  return json as { access_token: string; refresh_token?: string; expires_in: number; token_type: string; };
}

export async function exchangeCodeForTokens(code: string, verifier: string, origin: string){
  return tokenRequest({
    grant_type: 'authorization_code',
    code,
    redirect_uri: buildRedirectUri(origin),
    client_id: CLIENT_ID,
    code_verifier: verifier,
  });
}

export async function refreshAccessToken(refresh_token: string){
  return tokenRequest({
    grant_type: 'refresh_token',
    refresh_token,
    client_id: CLIENT_ID,
  });
}

function setCookie(name:string, value:string, maxAge:number, secure:boolean){
  cookies().set(name, value, { httpOnly: true, sameSite: 'lax', secure, path: '/', maxAge });
}

export function setAccessCookie(token: string, expiresInSec: number, origin?: string){
  const secure = baseUrl(origin).startsWith('https://');
  setCookie(AT_COOKIE, token, Math.max(60, Math.min(3600, expiresInSec - 60)), secure);
}

export function setRefreshCookie(token: string, origin?: string){
  const secure = baseUrl(origin).startsWith('https://');
  // 30 days
  setCookie(RT_COOKIE, token, 60*60*24*30, secure);
}

export function clearAuthCookies(){
  const all = [AT_COOKIE, RT_COOKIE, PKCE_COOKIE, STATE_COOKIE];
  for (const n of all){
    cookies().set(n, '', { path:'/', maxAge: 0 });
  }
}

export async function getValidAccessToken(){
  const jar = cookies();
  let at = jar.get(AT_COOKIE)?.value;
  const rt = jar.get(RT_COOKIE)?.value;
  if (at) return at;
  if (!rt) return null;
  try {
    const refreshed = await refreshAccessToken(rt);
    setAccessCookie(refreshed.access_token, refreshed.expires_in, baseUrl());
    if (refreshed.refresh_token){
      setRefreshCookie(refreshed.refresh_token, baseUrl());
    }
    return refreshed.access_token;
  } catch {
    return null;
  }
}

async function spotifyFetch<T>(path: string, init?: RequestInit): Promise<T>{
  const token = await getValidAccessToken();
  if (!token) { const e:any = new Error('unauthorized'); (e.status=401); throw e; }
  const url = `https://api.spotify.com/v1${path}`;
  const res = await fetch(url, {
    ...init,
    headers: {
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json',
      ...(init?.headers || {})
    }
  });
  if (!res.ok){
    const err:any = new Error('spotify_http_' + res.status);
    (err.status = res.status);
    err.detail = await res.text().catch(()=>'');
    throw err;
  }
  return res.json();
}

export async function getMe(){
  const me = await spotifyFetch<any>('/me');
  const image = me.images?.[0]?.url || null;
  return { id: me.id as string, display_name: me.display_name as string, image };
}

export async function searchArtists(q: string){
  const data = await spotifyFetch<any>(`/search?type=artist&limit=10&q=${encodeURIComponent(q)}`);
  return (data.artists?.items || []);
}

export async function searchTracks(q: string){
  const data = await spotifyFetch<any>(`/search?type=track&limit=10&q=${encodeURIComponent(q)}`);
  return (data.tracks?.items || []);
}

export async function recommendations(opts: { seed_artists?: string[], seed_tracks?: string[], seed_genres?: string[], limit?: number }){
  const params = new URLSearchParams();
  if (opts.seed_artists?.length) params.set('seed_artists', opts.seed_artists.join(','));
  if (opts.seed_tracks?.length) params.set('seed_tracks', opts.seed_tracks.join(','));
  if (opts.seed_genres?.length) params.set('seed_genres', opts.seed_genres.join(','));
  params.set('limit', String(Math.max(1, Math.min(100, opts.limit || 20))));
  return spotifyFetch<any>(`/recommendations?${params.toString()}`);
}

export async function createPlaylist(userId: string, name: string, description = '', isPublic = false){
  return spotifyFetch<any>(`/users/${encodeURIComponent(userId)}/playlists`, {
    method: 'POST',
    body: JSON.stringify({ name, description, public: isPublic })
  });
}

export async function addTracksToPlaylist(playlistId: string, uris: string[]){
  return spotifyFetch<any>(`/playlists/${encodeURIComponent(playlistId)}/tracks`, {
    method: 'POST',
    body: JSON.stringify({ uris })
  });
}