// src/app/api/auth/spotify/login/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { buildAuthorizeUrl, makePKCE, buildRedirectUri } from '@/lib/spotify';
import crypto from 'crypto';

export async function GET(req: NextRequest){
  const origin = process.env.SERVER_URL || req.nextUrl.origin;
  const { verifier, challenge } = await makePKCE();
  const state = crypto.randomUUID();

  const authUrl = buildAuthorizeUrl(origin, state, challenge);
  const res = NextResponse.redirect(authUrl);
  // set transient cookies for PKCE + state
  res.cookies.set('slockly_pkce', verifier, { httpOnly: true, sameSite: 'lax', path: '/', maxAge: 600 });
  res.cookies.set('slockly_state', state, { httpOnly: true, sameSite: 'lax', path: '/', maxAge: 600 });
  // debug header
  res.headers.set('x-slockly-redirect-uri', buildRedirectUri(origin));
  return res;
}