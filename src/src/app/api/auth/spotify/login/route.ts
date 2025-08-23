import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { randomBytes, createHash } from 'crypto';

function b64url(buf: Buffer){
  return buf.toString('base64').replace(/\+/g,'-').replace(/\//g,'_').replace(/=+$/,'');
}
function sha256b64url(verifier: string){
  return b64url(createHash('sha256').update(verifier).digest());
}

export async function GET(req: Request){
  const { searchParams } = new URL(req.url);
  const logout = searchParams.get('logout');

  const server = process.env.SERVER_URL || 'http://127.0.0.1:8080';
  const redirectUri = process.env.SPOTIFY_REDIRECT_URI || (server.replace(/\/$/, '') + '/api/auth/spotify/callback');
  const clientId = process.env.SPOTIFY_CLIENT_ID!;
  const scope = [
    'playlist-modify-private',
    'playlist-modify-public',
    'user-read-email',
    'user-read-private'
  ].join(' ');

  const c = cookies();

  if (logout){
    c.delete('slockly_at');
    c.delete('slockly_rt');
    c.delete('slockly_state');
    c.delete('slockly_pkce');
    return NextResponse.redirect(new URL('/', server));
  }

  const codeVerifier = b64url(randomBytes(64));
  const codeChallenge = sha256b64url(codeVerifier);
  const state = b64url(randomBytes(16));

  c.set('slockly_pkce', codeVerifier, {
    httpOnly: true, sameSite: 'lax', path: '/', maxAge: 600,
    secure: process.env.NODE_ENV === 'production'
  });
  c.set('slockly_state', state, {
    httpOnly: true, sameSite: 'lax', path: '/', maxAge: 600,
    secure: process.env.NODE_ENV === 'production'
  });

  const authUrl = new URL('https://accounts.spotify.com/authorize');
  authUrl.searchParams.set('response_type', 'code');
  authUrl.searchParams.set('client_id', clientId);
  authUrl.searchParams.set('scope', scope);
  authUrl.searchParams.set('redirect_uri', redirectUri);
  authUrl.searchParams.set('code_challenge_method', 'S256');
  authUrl.searchParams.set('code_challenge', codeChallenge);
  authUrl.searchParams.set('state', state);

  return NextResponse.redirect(authUrl);
}
