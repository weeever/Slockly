// src/app/api/auth/spotify/callback/route.ts
import { cookies } from 'next/headers';
import { NextResponse } from 'next/server';
import { SERVER_URL, exchangeCodeForTokens } from '@/lib/spotify';

export async function GET(req: Request){
  const jar = cookies();
  const u = new URL(req.url);
  const code = u.searchParams.get('code') || '';
  const stateParam = u.searchParams.get('state') || '';
  const error = u.searchParams.get('error');

  if (error){
    return NextResponse.redirect(`${SERVER_URL}/?error=${encodeURIComponent(error)}`);
  }
  if (!code){
    return NextResponse.redirect(`${SERVER_URL}/?error=code`);
  }

  const stateCookie = jar.get('slockly_state')?.value || '';
  if (!stateCookie || stateCookie !== stateParam){
    return NextResponse.redirect(`${SERVER_URL}/?error=state`);
  }
  const verifier = jar.get('slockly_pkce_verifier')?.value || '';
  if (!verifier){
    return NextResponse.redirect(`${SERVER_URL}/?error=pkce`);
  }

  try{
    const tok = await exchangeCodeForTokens(code, verifier);
    const now = Date.now();
    const atExp = new Date(now + (tok.expires_in||3600)*1000);
    const rt = tok.refresh_token || '';

    // Set cookies
    jar.set('slockly_at', tok.access_token, { httpOnly: true, path: '/', sameSite: 'lax', expires: atExp });
    if (rt){
      // 30 days
      jar.set('slockly_rt', rt, { httpOnly: true, path: '/', sameSite: 'lax', maxAge: 60*60*24*30 });
    }
    // clear transient
    jar.set('slockly_state', '', { path: '/', maxAge: 0 });
    jar.set('slockly_pkce_verifier', '', { path: '/', maxAge: 0 });

    return NextResponse.redirect(`${SERVER_URL}/app`);
  }catch(e){
    return NextResponse.redirect(`${SERVER_URL}/?error=token`);
  }
}