// src/app/api/auth/spotify/callback/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { exchangeCodeForTokens, setAccessCookie, setRefreshCookie, baseUrl, FRONTEND_URL } from '@/lib/spotify';

export async function GET(req: NextRequest){
  const url = new URL(req.url);
  const code = url.searchParams.get('code') || '';
  const state = url.searchParams.get('state') || '';
  const cookieStore = req.cookies;
  const savedState = cookieStore.get('slockly_state')?.value || '';
  const verifier = cookieStore.get('slockly_pkce')?.value || '';

  const origin = req.nextUrl.origin;
  const home = (FRONTEND_URL || origin).replace(/\/+$/,'') + '/';

  // Validate
  if (!code || !state || state !== savedState || !verifier){
    return NextResponse.redirect(home + '?error=state');
  }

  try{
    const tokens = await exchangeCodeForTokens(code, verifier, origin);
    if (!tokens.access_token) return NextResponse.redirect(home + '?error=token');

    // Set cookies
    const res = NextResponse.redirect(home + 'app');
    setAccessCookie(tokens.access_token, tokens.expires_in || 3600);
    if (tokens.refresh_token) setRefreshCookie(tokens.refresh_token);
    // Clear one-shot cookies
    res.cookies.set('slockly_state','', { path: '/', maxAge: 0 });
    res.cookies.set('slockly_pkce','', { path: '/', maxAge: 0 });
    return res;
  }catch(err){
    return NextResponse.redirect(home + '?error=token');
  }
}
