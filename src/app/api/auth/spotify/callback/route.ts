// src/app/api/auth/spotify/callback/route.ts
import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { exchangeCodeForTokens } from '@/lib/spotify';

export async function GET(req: Request) {
  const url = new URL(req.url);
  const code = url.searchParams.get('code') || '';
  const state = url.searchParams.get('state') || '';

  const c = cookies();
  const saved = c.get('slockly_oauth_state')?.value || '';
  const verifier = c.get('slockly_pkce_verifier')?.value || '';
  const secure = false;

  if (!state || state !== saved) {
    return NextResponse.redirect(new URL('/?error=state', url.origin));
  }
  if (!code || !verifier) {
    return NextResponse.redirect(new URL('/?error=pkce', url.origin));
  }

  try {
    const tok = await exchangeCodeForTokens(code, verifier, req);
    c.delete('slockly_oauth_state');
    c.delete('slockly_pkce_verifier');
    c.set('slockly_at', tok.access_token, { httpOnly: true, sameSite: 'lax', secure, path: '/' });
    if (tok.refresh_token) {
      c.set('slockly_rt', tok.refresh_token, { httpOnly: true, sameSite: 'lax', secure, path: '/' });
    }
    return NextResponse.redirect(new URL('/app', url.origin));
  } catch (e:any) {
    console.error('spotify_callback_error', e?.message || e);
    return NextResponse.redirect(new URL('/?error=token', url.origin));
  }
}
