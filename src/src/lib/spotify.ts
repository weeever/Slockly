import { cookies, headers } from 'next/headers';
import { NextResponse } from 'next/server';
import { encrypt, decrypt } from './crypto';

const SPOTIFY_TOKEN_COOKIE = 'slockly_rt';
const ACCESS_TOKEN_COOKIE = 'slockly_at';
const CODE_VERIFIER_COOKIE = 'slockly_pkce';
const STATE_COOKIE = 'slockly_state';


export async function getSpotifyAuthUrl(redirectUri: string){
  const clientId = process.env.SPOTIFY_CLIENT_ID!;
  const scopes = [
    'playlist-modify-private','playlist-modify-public','user-read-email','user-read-private'
  ].join(' ');

  const params = new URLSearchParams({
    response_type: 'code',
    client_id: clientId,
    scope: scopes,
    redirect_uri: redirectUri,
    code_challenge_method: 'S256',
  });

  return new URL('https://accounts.spotify.com/authorize?' + params.toString());
}




export async function exchangeCodeForTokens(code: string){
  const codeVerifier = cookies().get(CODE_VERIFIER_COOKIE)?.value;
  if (!codeVerifier) throw new Error('Missing PKCE verifier');
  const redirectUri = process.env.SPOTIFY_REDIRECT_URI || (process.env.SERVER_URL + '/api/auth/spotify/callback');

  const form = new URLSearchParams();
  form.set('grant_type', 'authorization_code');
  form.set('code', code);
  form.set('redirect_uri', redirectUri);
  form.set('client_id', process.env.SPOTIFY_CLIENT_ID!);
  form.set('code_verifier', codeVerifier);

  // Try PKCE first (no secret)
  let res = await fetch('https://accounts.spotify.com/api/token', {
    method: 'POST',
    body: form,
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' }
  });

  if (!res.ok && process.env.SPOTIFY_CLIENT_SECRET){
    // fallback to classic secret exchange
    const form2 = new URLSearchParams();
    form2.set('grant_type', 'authorization_code');
    form2.set('code', code);
    form2.set('redirect_uri', redirectUri);
    res = await fetch('https://accounts.spotify.com/api/token', {
      method: 'POST',
      body: form2,
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
        'Authorization': 'Basic ' + Buffer.from(process.env.SPOTIFY_CLIENT_ID + ':' + process.env.SPOTIFY_CLIENT_SECRET).toString('base64')
      }
    });
  }

  if (!res.ok) {
    const text = await res.text();
    throw new Error('Exchange failed: ' + text);
  }

  const js = await res.json();
  const { access_token, refresh_token, expires_in } = js;
  return { access_token, refresh_token, expires_in };
}


export async function refreshAccessToken(){
  const rtEnc = cookies().get(SPOTIFY_TOKEN_COOKIE)?.value;
  const accessCookie = cookies().get(ACCESS_TOKEN_COOKIE)?.value;
  // If no refresh cookie, fallback directly to access token
  if (!rtEnc) {
    if (accessCookie) return accessCookie;
    throw new Error('Not authenticated');
  }
  const refresh_token = decrypt(rtEnc);
  // If decrypt fails, fallback to access token if present
  if (!refresh_token) {
    if (accessCookie) return accessCookie;
    throw new Error('Invalid refresh token');
  }
  const form = new URLSearchParams();
  form.set('grant_type', 'refresh_token');
  form.set('refresh_token', refresh_token);
  const headers: Record<string,string> = { 'Content-Type': 'application/x-www-form-urlencoded' };
  if (process.env.SPOTIFY_CLIENT_SECRET){
    headers['Authorization'] = 'Basic ' + Buffer.from(process.env.SPOTIFY_CLIENT_ID + ':' + process.env.SPOTIFY_CLIENT_SECRET).toString('base64');
  } else {
    form.set('client_id', process.env.SPOTIFY_CLIENT_ID!);
  }
  try {
    const res = await fetch('https://accounts.spotify.com/api/token', { method: 'POST', headers, body: form });
    if (!res.ok) throw new Error('Refresh failed');
    const js = await res.json();
    const token = js.access_token as string;
    if (token) return token;
  } catch {}
  // Last resort: use access cookie if exists
  if (accessCookie) return accessCookie;
  throw new Error('Could not obtain access token');
}

export async function spotifyFetch(path: string, init?: RequestInit){
  const token = await refreshAccessToken();
  const res = await fetch('https://api.spotify.com/v1' + path, {
    ...init,
    headers: { ...(init?.headers||{}), Authorization: `Bearer ${token}` }
  });
  return res;
}

export async function getMe(){
  const res = await spotifyFetch('/me');
  if (!res.ok) throw new Error('Failed me');
  return res.json();
}

export async function search(q: string, type: string, limit=5){
  const url = `/search?${new URLSearchParams({ q, type, limit: String(limit) }).toString()}`;
  const res = await spotifyFetch(url);
  if (!res.ok) throw new Error('search failed');
  return res.json();
}

export async function recommendations({ seed_artists, seed_tracks, seed_genres, limit, min_popularity, max_popularity }:
  { seed_artists?: string[], seed_tracks?: string[], seed_genres?: string[], limit?: number, min_popularity?: number, max_popularity?: number }){
  const params = new URLSearchParams();
  if (seed_artists?.length) params.set('seed_artists', seed_artists.slice(0,5).join(','));
  if (seed_tracks?.length) params.set('seed_tracks', seed_tracks.slice(0,5).join(','));
  if (seed_genres?.length) params.set('seed_genres', seed_genres.slice(0,5).join(','));
  if (limit) params.set('limit', String(limit));
  if (min_popularity !== undefined) params.set('min_popularity', String(min_popularity));
  if (max_popularity !== undefined) params.set('max_popularity', String(max_popularity));
  const res = await spotifyFetch('/recommendations?' + params.toString());
  if (!res.ok) throw new Error('reco failed');
  return res.json();
}

export async function createPlaylist(userId: string, name: string, isPublic=false, description='Généré par Slockly'){
  const res = await spotifyFetch(`/users/${userId}/playlists`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ name, public: isPublic, description })
  });
  if (!res.ok) throw new Error('create playlist failed');
  return res.json();
}

export async function addTracks(playlistId: string, uris: string[]){
  const batches = [];
  for (let i=0;i<uris.length;i+=100) batches.push(uris.slice(i, i+100));
  const results = [];
  for (const b of batches){
    const res = await spotifyFetch(`/playlists/${playlistId}/tracks`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ uris: b })
    });
    if (!res.ok) throw new Error('add tracks failed');
    results.push(await res.json());
  }
  return results;
}

// utils
function cryptoRandom(n: number){ const b = new Uint8Array(n); crypto.getRandomValues(b); return Buffer.from(b); }
function sha256(data: string){ return crypto.subtle.digest('SHA-256', new TextEncoder().encode(data)); }
function base64url(input: ArrayBuffer | Buffer){
  const buf = Buffer.isBuffer(input) ? input : Buffer.from(new Uint8Array(input));
  return buf.toString('base64').replace(/\+/g,'-').replace(/\//g,'_').replace(/=+$/,'');
}