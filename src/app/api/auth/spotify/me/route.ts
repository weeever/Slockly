// src/app/api/auth/spotify/me/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { getAccessCookie, getRefreshCookie, refreshAccessToken, setAccessCookie, setRefreshCookie, getMe } from '@/lib/spotify';

export async function GET(_req: NextRequest){
  let access = getAccessCookie();
  const refresh = getRefreshCookie();
  if (!access && !refresh){
    return NextResponse.json({ ok: false, error: 'unauthenticated' }, { status: 401 });
  }

  async function tryMe(token: string){
    try{
      const me = await getMe(token);
      return { ok: true, me };
    }catch(e:any){
      if (e.status === 401) throw e;
      throw e;
    }
  }

  try{
    if (access){
      const out = await tryMe(access);
      return NextResponse.json(out);
    }
    throw { status: 401 };
  }catch(e:any){
    if (refresh){
      try{
        const refreshed = await refreshAccessToken(refresh);
        setAccessCookie(refreshed.access_token, refreshed.expires_in || 3600);
        if (refreshed.refresh_token && refreshed.refresh_token !== refresh){
          setRefreshCookie(refreshed.refresh_token);
        }
        const out = await tryMe(refreshed.access_token);
        return NextResponse.json(out);
      }catch{
        return NextResponse.json({ ok:false }, { status: 401 });
      }
    }
    return NextResponse.json({ ok:false }, { status: 401 });
  }
}
