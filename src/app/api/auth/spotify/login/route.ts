// src/app/api/auth/spotify/login/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { buildAuthorizeUrl, makePKCE, buildRedirectUri, DEFAULT_SCOPES } from '@/lib/spotify';

export async function GET(req: NextRequest){
  const origin = req.nextUrl.origin;
  const { verifier, challenge } = makePKCE();
  const state = cryptoRandom();

  // Build URL (ensure scopes are present to avoid authorization mismatch)
  const url = buildAuthorizeUrl(origin, state, challenge);
  const res = NextResponse.redirect(url);

  // Useful debug headers
  res.headers.set('x-slockly-redirect-uri', buildRedirectUri(origin));
  res.headers.set('x-slockly-scopes', DEFAULT_SCOPES.join(' '));

  // Cookies for state + PKCE
  res.cookies.set('slockly_state', state, { httpOnly: true, sameSite: 'lax', path: '/', maxAge: 600 });
  res.cookies.set('slockly_pkce', verifier, { httpOnly: true, sameSite: 'lax', path: '/', maxAge: 600 });
  return res;
}

function cryptoRandom(){
  const arr = new Uint8Array(16);
  for (let i=0;i<arr.length;i++) arr[i] = Math.floor(Math.random()*256);
  // Base64url
  return Buffer.from(arr).toString('base64').replace(/\+/g,'-').replace(/\//g,'_').replace(/=+$/,'');
}
