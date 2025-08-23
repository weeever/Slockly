
type Candidate = { id?: string; name: string; artists: string; spotify_preview_url?: string | null };

const cache = new Map<string, string | null>();

function keyOf(c: Candidate){
  return (c.id || `${c.artists}::${c.name}`).toLowerCase();
}

function sanitize(s: string){
  return s.replace(/[()\[\]\-]/g, ' ').replace(/\s+/g, ' ').trim();
}

export async function resolvePreview(c: Candidate): Promise<string | null>{
  const key = keyOf(c);
  if (cache.has(key)) return cache.get(key)!;

  // 1) Spotify preview if present
  if (c.spotify_preview_url){
    cache.set(key, c.spotify_preview_url);
    return c.spotify_preview_url;
  }

  // 2) iTunes Search API (works without key, allows CORS)
  try {
    const term = encodeURIComponent(`${sanitize(c.artists)} ${sanitize(c.name)}`);
    const res = await fetch(`https://itunes.apple.com/search?term=${term}&entity=song&limit=5&country=FR`);
    if (res.ok){
      const js = await res.json();
      const matches: string[] = [];
      for (const it of js?.results || []){
        const a = String(it?.artistName || '').toLowerCase();
        const t = String(it?.trackName || '').toLowerCase();
        const wantA = c.artists.toLowerCase();
        const wantT = c.name.toLowerCase();
        const ok = (a.includes(wantA.split(',')[0].trim()) || wantA.includes(a)) && (t.includes(wantT) || wantT.includes(t));
        if (ok && it?.previewUrl) matches.push(it.previewUrl);
      }
      const url = matches[0] || js?.results?.[0]?.previewUrl || null;
      if (url){ cache.set(key, url); return url; }
    }
  } catch {}

  // 3) Deezer public API (30s preview)
  try {
    const term = encodeURIComponent(`artist:"${sanitize(c.artists)}" track:"${sanitize(c.name)}"`);
    const res = await fetch(`https://api.deezer.com/search?q=${term}&limit=5`);
    if (res.ok){
      const js = await res.json();
      const url = js?.data?.[0]?.preview || null;
      if (url){ cache.set(key, url); return url; }
    }
  } catch {}

  cache.set(key, null);
  return null;
}
