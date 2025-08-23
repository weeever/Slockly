// src/app/api/auth/spotify/login/route.ts
import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { makePKCE, getSpotifyAuthUrl, DEFAULT_SCOPES } from '@/lib/spotify';

export async function GET(req: Request) {
  const url = new URL(req.url);
  const logout = url.searchParams.get('logout');
  const c = cookies();
  const secure = false; // dev on http

  if (logout) {
    c.delete('slockly_at');
    c.delete('slockly_rt');
    return NextResponse.redirect(new URL('/', url.origin));
  }

  const { verifier, challenge } = makePKCE();
  const state = crypto.randomUUID();

  c.set('slockly_pkce_verifier', verifier, { httpOnly: true, sameSite: 'lax', secure, path: '/' });
  c.set('slockly_oauth_state', state, { httpOnly: true, sameSite: 'lax', secure, path: '/' });

  const authUrl = getSpotifyAuthUrl({ state, challenge, scopes: DEFAULT_SCOPES, req });
  return NextResponse.redirect(authUrl);
}
