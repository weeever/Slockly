// src/app/api/auth/spotify/login/route.ts
import { cookies } from 'next/headers';
import { NextResponse } from 'next/server';
import { makePKCE, getSpotifyAuthUrl } from '@/lib/spotify';

export async function GET(){
  const { verifier, challenge } = await makePKCE();
  const state = crypto.randomUUID(); // string, not an object

  const jar = cookies();
  // Short lifetime for CSRF + PKCE
  jar.set('slockly_state', state, { httpOnly: true, path: '/', sameSite: 'lax', maxAge: 600 });
  jar.set('slockly_pkce_verifier', verifier, { httpOnly: true, path: '/', sameSite: 'lax', maxAge: 600 });

  const url = getSpotifyAuthUrl({ state, code_challenge: challenge });
  return NextResponse.redirect(url);
}