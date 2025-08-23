import { analyze } from '@/lib/ai/provider';
import { checkRateLimit } from '@/lib/ratelimit';
import { getIP } from '@/lib/utils';

export async function POST(req: Request){
  const rl = checkRateLimit(getIP(req));
  if (rl.limited) return new Response('Rate limited', { status: 429 });
  const body = await req.json();
  const { prompt, approxN } = body || {};
  try {
    const result = await analyze(prompt || '', approxN || 20);
    return Response.json(result);
  } catch (e:any){
    return new Response(JSON.stringify({ error: e.message }), { status: 500 });
  }
}
