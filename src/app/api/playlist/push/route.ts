// src/app/api/playlist/push/route.ts
/* eslint-disable @typescript-eslint/no-explicit-any */
import { NextRequest, NextResponse } from 'next/server';
import { getAccessCookie, getMe, createPlaylist, addTracksToPlaylist } from '@/lib/spotify';

type Body = { name: string; tracks: { uri: string }[]; description?: string; isPublic?: boolean };

export async function POST(req: NextRequest){
  const access = getAccessCookie();
  if (!access) return NextResponse.json({ error: 'unauthenticated' }, { status: 401 });
  const body = await req.json().catch(()=>({})) as Body;
  const name = (body.name||'Playlist by Slockly').slice(0, 120);
  const uris = (body.tracks||[]).map(t=>t.uri).filter(Boolean);
  if (uris.length === 0) return NextResponse.json({ error: 'no_tracks' }, { status: 400 });

  try{
    const me = await getMe(access);
    const pl = await createPlaylist(access, me.id, name, body.description||'', !!body.isPublic);
    const chunks:string[][] = [];
    for (let i=0;i<uris.length;i+=100) chunks.push(uris.slice(i, i+100));
    for (const c of chunks){
      await addTracksToPlaylist(access, pl.id, c);
    }
    return NextResponse.json({ ok:true, id: pl.id, url: pl.external_urls?.spotify || '' });
  }catch(e:any){
    const status = e?.status || 500;
    const detail = e?.detail || String(e?.message||'push_failed');
    return NextResponse.json({ error: 'push_failed', status, detail }, { status: 500 });
  }
}
