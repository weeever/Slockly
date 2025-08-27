// src/app/api/auth/spotify/callback/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { exchangeCodeForTokens, setAccessCookie, setRefreshCookie, buildRedirectUri } from '@/lib/spotify';

export async function GET(req: NextRequest){
  const url = new URL(req.url);
  const origin = process.env.SERVER_URL || `${url.protocol}//${url.host}`;
  const code = url.searchParams.get('code');
  const state = url.searchParams.get('state');

  const cookiesIn = req.cookies;
  const expectedState = cookiesIn.get('slockly_state')?.value;
  const verifier = cookiesIn.get('slockly_pkce')?.value;

  if (!code || !verifier || !state || !expectedState || state !== expectedState){
    return NextResponse.redirect(`${origin}/?error=token`);
  }

  try{
    const tok = await exchangeCodeForTokens(code, verifier, origin);
    setAccessCookie(tok.access_token, tok.expires_in, origin);
    if (tok.refresh_token) setRefreshCookie(tok.refresh_token, origin);

    // clear transient cookies
    const res = NextResponse.redirect(`${origin}/app`);
    res.cookies.set('slockly_state', '', { path:'/', maxAge: 0 });
    res.cookies.set('slockly_pkce', '', { path:'/', maxAge: 0 });
    return res;
  }catch(e:any){
    const res = NextResponse.redirect(`${origin}/?error=token`);
    return res;
  }
}