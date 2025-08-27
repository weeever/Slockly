// src/app/api/playlist/push/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { getValidAccessToken, getMe, createPlaylist, addTracks } from '@/lib/spotify';

export async function POST(req: NextRequest){
  const token = await getValidAccessToken();
  if (!token) return NextResponse.json({ error:'unauthorized' }, { status: 401 });

  const { name, uris } = await req.json().catch(()=>({}));
  if (!Array.isArray(uris) || uris.length === 0){
    return NextResponse.json({ error:'no_tracks' }, { status: 422 });
  }
  const playlistName = String(name||'Playlist by Slockly').slice(0, 100);

  try{
    const me = await getMe();
    const p = await createPlaylist(me.id, playlistName);
    await addTracks(p.id, uris);
    return NextResponse.json({ ok:true, id: p.id, url: p.external_urls?.spotify || null });
  }catch(e:any){
    const msg = String(e?.message||'');
    const status = msg.startsWith('spotify_http_') ? Number(msg.slice(13)) : 500;
    return NextResponse.json({ error:'push_failed', status, detail: msg }, { status });
  }
}
