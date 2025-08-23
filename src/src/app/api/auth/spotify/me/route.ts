import { getMe } from '@/lib/spotify';
import { checkRateLimit } from '@/lib/ratelimit';
import { getIP } from '@/lib/utils';

export async function GET(req: Request){
  const rl = checkRateLimit(getIP(req));
  if (rl.limited) return new Response('Rate limited', { status: 429 });
  try {
    const me = await getMe();
    return Response.json(me);
  } catch (e:any){
    return new Response(JSON.stringify({ error: e.message }), { status: 401 });
  }
}
