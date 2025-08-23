import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';

export const dynamic = 'force-dynamic';

export async function GET(req: Request){
  const server = process.env.SERVER_URL || 'http://127.0.0.1:8080';
  const url = new URL(req.url);
  const code = url.searchParams.get('code');
  const err = url.searchParams.get('error');
  const state = url.searchParams.get('state');
  const expected = cookies().get('slockly_state')?.value || null;
  const codeVerifier = cookies().get('slockly_pkce')?.value || '';

  if (err){
    return NextResponse.redirect(new URL(`/?error=${encodeURIComponent(err)}`, server));
  }
  if (!code){
    return NextResponse.redirect(new URL('/?error=missing_code', server));
  }
  if (!state || !expected || state !== expected){
    return NextResponse.redirect(new URL('/?error=state', server));
  }

  try {
    const redirectUri = process.env.SPOTIFY_REDIRECT_URI || (server.replace(/\/$/, '') + '/api/auth/spotify/callback');

    const form = new URLSearchParams();
    form.set('grant_type', 'authorization_code');
    form.set('code', code);
    form.set('redirect_uri', redirectUri);
    form.set('client_id', process.env.SPOTIFY_CLIENT_ID!);
    if (codeVerifier) form.set('code_verifier', codeVerifier);

    let res = await fetch('https://accounts.spotify.com/api/token', {
      method: 'POST',
      body: form,
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' }
    });

    // Fallback with client secret if provided
    if (!res.ok && process.env.SPOTIFY_CLIENT_SECRET){
      const form2 = new URLSearchParams();
      form2.set('grant_type', 'authorization_code');
      form2.set('code', code);
      form2.set('redirect_uri', redirectUri);
      res = await fetch('https://accounts.spotify.com/api/token', {
        method: 'POST',
        body: form2,
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded',
          'Authorization': 'Basic ' + Buffer.from(process.env.SPOTIFY_CLIENT_ID + ':' + process.env.SPOTIFY_CLIENT_SECRET).toString('base64')
        }
      });
    }

    if (!res.ok){
      const text = await res.text();
      return NextResponse.redirect(new URL('/?error=token_exchange', server));
    }

    const js = await res.json();
    const { access_token, refresh_token, expires_in } = js as { access_token?: string; refresh_token?: string; expires_in?: number };

    const out = NextResponse.redirect(new URL('/app', server));

    if (access_token){
      out.cookies.set('slockly_at', access_token, {
        httpOnly: true, sameSite: 'lax', path: '/',
        secure: process.env.NODE_ENV === 'production',
        maxAge: Math.max(1, Math.min(3600, Number(expires_in) || 3600))
      });
    }
    if (refresh_token){
      out.cookies.set('slockly_rt', refresh_token, {
        httpOnly: true, sameSite: 'lax', path: '/',
        secure: process.env.NODE_ENV === 'production',
        maxAge: 60*60*24*30
      });
    }
    // clear state/pkce
    out.cookies.set('slockly_state','', { path:'/', httpOnly:true, sameSite:'lax', secure: process.env.NODE_ENV==='production', maxAge: 0 });
    out.cookies.set('slockly_pkce','', { path:'/', httpOnly:true, sameSite:'lax', secure: process.env.NODE_ENV==='production', maxAge: 0 });

    return out;
  } catch (e){
    return NextResponse.redirect(new URL('/?error=callback', server));
  }
}
