import { addTracks, createPlaylist, getMe } from '@/lib/spotify';
import { checkRateLimit } from '@/lib/ratelimit';
import { getIP } from '@/lib/utils';

export async function POST(req: Request){
  const rl = checkRateLimit(getIP(req));
  if (rl.limited) return new Response('Rate limited', { status: 429 });
  try {
    const { name, tracks } = await req.json();
    if (!Array.isArray(tracks) || tracks.length === 0) return new Response('No tracks', { status: 400 });
    const me = await getMe();
    const pl = await createPlaylist(me.id, name || 'Slockly Playlist', false);
    await addTracks(pl.id, tracks);
    return Response.json({ id: pl.id, external_url: pl?.external_urls?.spotify });
  } catch (e:any){
    return new Response(JSON.stringify({ error: e.message }), { status: 500 });
  }
}
