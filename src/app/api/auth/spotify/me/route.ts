import { NextResponse } from 'next/server';
import { getValidAccessToken } from '@/lib/spotify';

const API = 'https://api.spotify.com/v1';

async function spGet(token: string, path: string) {
  const url = new URL(API + path);
  const res = await fetch(url, { headers: { Authorization: `Bearer ${token}` } });
  if (!res.ok) {
    return NextResponse.json({ ok: false, error: `spotify_http_${res.status}` }, { status: res.status });
  }
  const data = await res.json();
  return NextResponse.json({
    ok: true,
    me: {
      id: data.id,
      display_name: data.display_name ?? data.id,
      images: Array.isArray(data.images) ? data.images : [],
    }
  }, { headers: { 'Cache-Control': 'no-store' } });
}

export async function GET() {
  const token = await getValidAccessToken();
  if (!token) {
    return NextResponse.json({ ok: false, error: 'unauthenticated' }, { status: 401 });
  }
  return spGet(token, '/me');
}
