import { NextResponse } from 'next/server';
import { addTracksToPlaylist, createPlaylist, getMe } from '@/lib/spotify';

type Body = { name?: string, uris?: string[], tracks?: Array<{ uri?: string, id?: string }> };

export async function POST(req: Request){
  try{
    const body = await req.json() as Body;
    const name = body.name?.trim() || 'Playlist by Slockly';
    let uris: string[] = Array.from(new Set((body.uris||[]).filter(Boolean)));

    if (!uris.length && Array.isArray(body.tracks)){
      for (const t of body.tracks){
        if (t?.uri) uris.push(t.uri);
        else if (t?.id) uris.push(`spotify:track:${t.id}`);
      }
      uris = Array.from(new Set(uris));
    }

    if (!uris.length) return NextResponse.json({ error: 'no_tracks' }, { status: 400 });

    const me = await getMe();
    const pl = await createPlaylist(me.id, name, false);
    await addTracksToPlaylist(pl.id, uris);

    return NextResponse.json({ ok: true, id: pl.id, external_url: pl.external_urls?.spotify });
  }catch(e:any){
    console.error('push_error', e);
    return NextResponse.json({ error: e?.message || 'push_failed' }, { status: 500 });
  }
}
