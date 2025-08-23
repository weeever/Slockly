// src/lib/spotify.ts
// Unified Spotify helpers + exports required by routes
import { cookies, headers } from 'next/headers';

// ---- ENV ----
const CLIENT_ID = process.env.NEXT_PUBLIC_SPOTIFY_CLIENT_ID || process.env.SPOTIFY_CLIENT_ID || '';
if (!CLIENT_ID) {
  console.warn('[spotify] Missing SPOTIFY_CLIENT_ID / NEXT_PUBLIC_SPOTIFY_CLIENT_ID');
}

export const DEFAULT_SCOPES = [
  'user-read-email',
  'user-read-private',
  'playlist-modify-public',
  'playlist-modify-private',
  'ugc-image-upload'
];

// Build absolute server URL from the incoming request when possible
export function getServerURLFromRequest(req?: Request | { headers?: Headers }): string {
  try {
    const h = (req && 'headers' in req && req.headers) ? (req.headers as any) : headers();
    // Prefer x-forwarded-host for proxies, fallback to host
    const host = (h.get ? (h.get('x-forwarded-host') || h.get('host')) : '') || '127.0.0.1:8080';
    const proto = (h.get ? (h.get('x-forwarded-proto') || 'http') : 'http');
    return `${proto}://${host}`;
  } catch {
    // During build or edge misfires
    const env = process.env.NEXT_PUBLIC_SERVER_URL || process.env.SERVER_URL || 'http://127.0.0.1:8080';
    return env.replace(/\/+$/,''); // strip trailing slashes
  }
}

export function redirectUriFor(req?: Request | { headers?: Headers }): string {
  return getServerURLFromRequest(req) + '/api/auth/spotify/callback';
}

// ---- PKCE ----
function base64url(buf: ArrayBuffer) {
  return Buffer.from(buf).toString('base64').replace(/\+/g,'-').replace(/\//g,'_').replace(/=+$/,'');
}
function randomBytes(n: number) {
  return require('crypto').randomBytes(n);
}
export function makePKCE() {
  const verifier = base64url(randomBytes(64));
  const challenge = base64url(require('crypto').createHash('sha256').update(verifier).digest());
  return { verifier, challenge };
}

// ---- Auth URLs ----
export function getSpotifyAuthUrl(opts: { state: string; challenge: string; scopes?: string[]; req?: Request | {headers?: Headers} }) {
  const { state, challenge } = opts;
  const scopes = (opts.scopes && opts.scopes.length ? opts.scopes : DEFAULT_SCOPES).join(' ');
  const params = new URLSearchParams({
    client_id: CLIENT_ID,
    response_type: 'code',
    redirect_uri: redirectUriFor(opts.req),
    code_challenge_method: 'S256',
    code_challenge: challenge,
    scope: scopes,
    state,
    show_dialog: 'false'
  });
  return new URL('https://accounts.spotify.com/authorize?' + params.toString()).toString();
}

// ---- Token exchange / refresh ----
type Tokens = { access_token: string; token_type: string; expires_in: number; refresh_token?: string; scope?: string; };
async function postToken(form: Record<string,string>) {
  const res = await fetch('https://accounts.spotify.com/api/token', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams(form).toString()
  });
  if (!res.ok) {
    const t = await res.text().catch(()=>'');
    throw new Error('spotify_token_' + res.status + ':' + t);
  }
  return res.json() as Promise<Tokens>;
}

export async function exchangeCodeForTokens(code: string, verifier: string, req?: Request) {
  const REDIRECT_URI = redirectUriFor(req);
  const tok = await postToken({
    grant_type: 'authorization_code',
    client_id: CLIENT_ID,
    code,
    redirect_uri: REDIRECT_URI,
    code_verifier: verifier
  });
  return tok;
}

export async function refreshAccessToken(refreshToken: string) {
  const tok = await postToken({
    grant_type: 'refresh_token',
    client_id: CLIENT_ID,
    refresh_token: refreshToken
  });
  return tok;
}

// ---- API fetch helper with auto-refresh (when using API routes) ----
export async function spotifyFetch(path: string, init?: RequestInit, opts?: { forceToken?: string }) {
  const c = cookies();
  let at = opts?.forceToken || c.get('slockly_at')?.value || '';
  const rt = c.get('slockly_rt')?.value || '';
  async function call(token: string) {
    const res = await fetch('https://api.spotify.com/v1' + path, {
      ...init,
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json',
        ...(init && init.headers ? init.headers as any : {})
      }
    });
    return res;
  }

  if (!at && rt){
    // try refresh
    try {
      const newTok = await refreshAccessToken(rt);
      at = newTok.access_token;
      const secure = false; // localhost dev
      cookies().set('slockly_at', at, { httpOnly: true, sameSite: 'lax', secure, path: '/' });
      if (newTok.refresh_token) cookies().set('slockly_rt', newTok.refresh_token, { httpOnly: true, sameSite: 'lax', secure, path: '/' });
    } catch {
      // ignore
    }
  }
  if (!at) {
    const r = new Response(JSON.stringify({ error: 'no_access_token' }), { status: 401 });
    // mimic fetch Response for callers that expect fetch
    (r as any).ok = false;
    return r as any as Response;
  }

  let res = await call(at);
  if (res.status === 401 && rt){
    try {
      const newTok = await refreshAccessToken(rt);
      at = newTok.access_token;
      const secure = false;
      cookies().set('slockly_at', at, { httpOnly: true, sameSite: 'lax', secure, path: '/' });
      if (newTok.refresh_token) cookies().set('slockly_rt', newTok.refresh_token, { httpOnly: true, sameSite: 'lax', secure, path: '/' });
      res = await call(at);
    } catch {}
  }
  return res;
}

// ---- Thin endpoints ----
export async function getMe() {
  const res = await spotifyFetch('/me');
  if (!res.ok) throw new Error('spotify_me_' + res.status);
  return res.json();
}

export async function searchArtists(q: string, limit = 5) {
  const res = await spotifyFetch('/search?' + new URLSearchParams({ q, type: 'artist', limit: String(limit) }).toString());
  if (!res.ok) throw new Error('spotify_search_' + res.status);
  return res.json();
}

export async function searchTracks(q: string, limit = 10) {
  const res = await spotifyFetch('/search?' + new URLSearchParams({ q, type: 'track', limit: String(limit) }).toString());
  if (!res.ok) throw new Error('spotify_search_' + res.status);
  return res.json();
}

export async function recommendations(opts: { seed_artists?: string[]; seed_tracks?: string[]; seed_genres?: string[]; limit?: number }) {
  const params = new URLSearchParams();
  if (opts.seed_artists?.length) params.set('seed_artists', opts.seed_artists.slice(0,5).join(','));
  if (opts.seed_tracks?.length) params.set('seed_tracks', opts.seed_tracks.slice(0,5).join(','));
  if (opts.seed_genres?.length) params.set('seed_genres', opts.seed_genres.slice(0,5).join(','));
  params.set('limit', String(Math.max(1, Math.min(100, opts.limit ?? 20))));
  if (!params.get('seed_artists') && !params.get('seed_tracks') && !params.get('seed_genres')) {
    const r = new Response(JSON.stringify({ error: 'no_seeds' }), { status: 422 });
    (r as any).ok = false;
    return r as any as Response;
  }
  const res = await spotifyFetch('/recommendations?' + params.toString());
  if (!res.ok) {
    const txt = await res.text().catch(()=>'');
    throw Object.assign(new Error('spotify_recommendations_failed'), { status: res.status, detail: txt });
  }
  return res.json();
}

export async function createPlaylist(userId: string, name: string, description = '', isPublic = false) {
  const res = await spotifyFetch(`/users/${encodeURIComponent(userId)}/playlists`, {
    method: 'POST',
    body: JSON.stringify({ name, description, public: isPublic })
  });
  if (!res.ok) throw new Error('spotify_create_playlist_' + res.status);
  return res.json();
}

export async function addTracksToPlaylist(playlistId: string, uris: string[]) {
  const res = await spotifyFetch(`/playlists/${encodeURIComponent(playlistId)}/tracks`, {
    method: 'POST',
    body: JSON.stringify({ uris })
  });
  if (!res.ok) throw new Error('spotify_add_tracks_' + res.status);
  return res.json();
}

// Utility: normalize tracks to a minimal shape
export type SimplifiedTrack = {
  id: string;
  name: string;
  uri: string;
  preview_url?: string|null;
  artists: string[];
  albumCover?: string|null;
};

export function mapTracks(items: any[]): SimplifiedTrack[] {
  return (items||[]).map((t:any)=> ({
    id: t.id,
    name: t.name,
    uri: t.uri,
    preview_url: t.preview_url ?? t.previewUrl ?? null,
    artists: (t.artists||[]).map((a:any)=> a.name).filter(Boolean),
    albumCover: t.album?.images?.[0]?.url ?? t.albumCover ?? null
  }));
}
