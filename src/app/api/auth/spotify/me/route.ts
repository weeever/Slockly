// src/app/api/auth/spotify/me/route.ts
import { NextResponse } from 'next/server';
import { getMe } from '@/lib/spotify';

export async function GET() {
  try {
    const me = await getMe();
    // Normalize minimal payload for UI
    const payload = {
      id: me.id,
      display_name: me.display_name || me.id,
      image: (me.images && me.images[0]?.url) || null
    };
    return NextResponse.json(payload);
  } catch (e:any) {
    const msg = String(e?.message || '');
    const status = msg.startsWith('spotify_me_') ? Number(msg.split('_').pop()) : 401;
    return NextResponse.json({ error: 'unauthorized' }, { status });
  }
}
