// src/lib/spotify.ts
// Unified Spotify helpers + exports used by routes

export const SERVER_URL = (process.env.SERVER_URL || 'http://127.0.0.1:8080').replace(/\/+$/,'');
export const SPOTIFY_CLIENT_ID = process.env.SPOTIFY_CLIENT_ID || '';
export const SPOTIFY_CLIENT_SECRET = process.env.SPOTIFY_CLIENT_SECRET || '';
export const SPOTIFY_REDIRECT_URI = (process.env.SPOTIFY_REDIRECT_URI || `${SERVER_URL}/api/auth/spotify/callback`).replace(/\/+$/,'');

export const DEFAULT_SCOPES: string[] = [
  'user-read-email',
  'user-read-private',
  'playlist-modify-public',
  'playlist-modify-private',
  'ugc-image-upload'
];

export function baseUrl(): string {
  return SERVER_URL;
}

function toQuery(params: Record<string,string|number|boolean|undefined>): string {
  const usp = new URLSearchParams();
  Object.entries(params).forEach(([k,v]) => {
    if (v !== undefined && v !== null) usp.set(k, String(v));
  });
  return usp.toString();
}

function b64urlFromBytes(bytes: Uint8Array): string {
  let str = Buffer.from(bytes).toString('base64');
  return str.replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/,'');
}
function randomBytes(n: number): Uint8Array {
  const arr = new Uint8Array(n);
  // In Next runtime, global crypto is available
  crypto.getRandomValues(arr);
  return arr;
}

export async function pkceChallenge(verifier: string): Promise<string> {
  const data = new TextEncoder().encode(verifier);
  const digest = await crypto.subtle.digest('SHA-256', data);
  return b64urlFromBytes(new Uint8Array(digest));
}

export async function makePKCE(): Promise<{ verifier: string; challenge: string; }> {
  const raw = randomBytes(32);
  const verifier = b64urlFromBytes(raw);
  const challenge = await pkceChallenge(verifier);
  return { verifier, challenge };
}

export function getSpotifyAuthUrl(opts?: { state?: string; code_challenge?: string; scopes?: string[] }){
  const state = opts?.state || crypto.randomUUID();
  const challenge = opts?.code_challenge || '';
  const scopes = (opts?.scopes && opts.scopes.length ? opts.scopes : DEFAULT_SCOPES).join(' ');
  const params = toQuery({
    client_id: SPOTIFY_CLIENT_ID,
    response_type: 'code',
    redirect_uri: SPOTIFY_REDIRECT_URI,
    scope: scopes,
    state,
    code_challenge_method: 'S256',
    code_challenge: challenge
  });
  return new URL('https://accounts.spotify.com/authorize?' + params);
}

type TokenResponse = {
  access_token: string;
  token_type: string;
  scope: string;
  expires_in: number;
  refresh_token?: string;
};

export async function exchangeCodeForTokens(code: string, verifier: string): Promise<TokenResponse> {
  const body = new URLSearchParams();
  body.set('grant_type', 'authorization_code');
  body.set('code', code);
  body.set('redirect_uri', SPOTIFY_REDIRECT_URI);
  body.set('client_id', SPOTIFY_CLIENT_ID);
  body.set('code_verifier', verifier);
  const res = await fetch('https://accounts.spotify.com/api/token', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body
  });
  if (!res.ok){
    const txt = await res.text().catch(()=>'');
    throw new Error('spotify_token_error:' + txt);
  }
  return await res.json();
}

export async function refreshAccessToken(refresh_token: string): Promise<TokenResponse> {
  const body = new URLSearchParams();
  body.set('grant_type', 'refresh_token');
  body.set('refresh_token', refresh_token);
  body.set('client_id', SPOTIFY_CLIENT_ID);
  const res = await fetch('https://accounts.spotify.com/api/token', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body
  });
  if (!res.ok){
    const txt = await res.text().catch(()=>'');
    throw new Error('spotify_refresh_error:' + txt);
  }
  return await res.json();
}

// Minimal fetch helper (bearer)
async function spotifyFetch<T=any>(token: string, path: string, init?: RequestInit): Promise<T> {
  const url = path.startsWith('http') ? path : `https://api.spotify.com/v1${path}`;
  const res = await fetch(url, {
    ...init,
    headers: {
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json',
      ...(init?.headers||{})
    }
  });
  if (!res.ok){
    const txt = await res.text().catch(()=>'');
    throw new Error('spotify_http_' + res.status + ':' + txt);
  }
  return await res.json();
}

export async function getMe(token: string){
  return spotifyFetch(token, '/me');
}

// Convenience search/reco helpers used by your generator route (optional if not needed)
export async function searchArtists(token: string, q: string, limit=5){
  return spotifyFetch(token, `/search?${toQuery({ q, type: 'artist', limit })}`);
}
export async function searchTracks(token: string, q: string, limit=10){
  return spotifyFetch(token, `/search?${toQuery({ q, type: 'track', limit })}`);
}
export async function recommendations(token: string, params: Record<string,string>){
  return spotifyFetch(token, `/recommendations?${toQuery(params)}`);
}
export async function withPreviews(token: string, trackIds: string[]){
  if (!trackIds.length) return [];
  // hydrate tracks info
  const chunk = (arr: string[], n: number) => arr.length ? [arr.slice(0,n), ...chunk(arr.slice(n), n)] : [];
  const parts = chunk(trackIds, 50);
  const out: any[] = [];
  for (const ids of parts){
    const data = await spotifyFetch<any>(token, `/tracks?ids=${ids.join(',')}`);
    out.push(...(data.tracks||[]));
  }
  return out;
}

export async function createPlaylist(token: string, userId: string, name: string, isPublic=false, description?: string){
  return spotifyFetch(token, `/users/${encodeURIComponent(userId)}/playlists`, {
    method: 'POST',
    body: JSON.stringify({ name, public: isPublic, description })
  });
}
export async function addTracksToPlaylist(token: string, playlistId: string, uris: string[]){
  if (!uris.length) return;
  return spotifyFetch(token, `/playlists/${encodeURIComponent(playlistId)}/tracks`, {
    method: 'POST',
    body: JSON.stringify({ uris })
  });
}