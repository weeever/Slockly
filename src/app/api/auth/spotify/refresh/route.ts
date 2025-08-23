import { refreshAccessToken } from '@/lib/spotify';

export async function GET(){
  try {
    const token = await refreshAccessToken();
    return Response.json({ access_token: token });
  } catch (e:any){
    return new Response(JSON.stringify({ error: e.message }), { status: 401 });
  }
}
