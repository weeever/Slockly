import { NextResponse } from 'next/server';

export async function GET() {
  try {
    // Access token from cookie set by your callback route
    const cookie = (await import('next/headers')).cookies();
    const access = cookie.get('slockly_at')?.value;

    if (!access) {
      return NextResponse.json({ ok: false, error: 'no_token' }, { status: 401 });
    }

    const r = await fetch('https://api.spotify.com/v1/me', {
      headers: { Authorization: `Bearer ${access}` }
    });

    if (!r.ok) {
      const text = await r.text().catch(()=>'') || '';
      return NextResponse.json({ ok: false, error: 'spotify_me_failed', status: r.status, detail: text.slice(0, 300) }, { status: r.status });
    }

    const js = await r.json();
    const name = js.display_name || js.id || '—';
    const avatar = (Array.isArray(js.images) && js.images[0]?.url) || null;

    return NextResponse.json({
      ok: true,
      id: js.id,
      name,
      avatar,
      product: js.product,
      followers: js.followers?.total ?? null
    });
  } catch (err:any) {
    return NextResponse.json({ ok: false, error: 'server_error', detail: String(err?.message||err) }, { status: 500 });
  }
}
