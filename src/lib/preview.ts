/* eslint-disable @typescript-eslint/no-explicit-any */
const cache = new Map<string, string|null>();

function key(name: string, artists: string[]){
  return `${name}::${artists.join(',')}`.toLowerCase();
}

export async function withPreviewFallback(track: { name: string, artists: string[], previewUrl?: string|null }){
  const k = key(track.name, track.artists);
  if (cache.has(k)) return cache.get(k)!;

  if (track.previewUrl) { cache.set(k, track.previewUrl); return track.previewUrl; }

  // iTunes
  try{
    const term = encodeURIComponent(`${track.name} ${track.artists[0]||''}`);
    const r = await fetch(`https://itunes.apple.com/search?media=music&limit=1&term=${term}`, { next: { revalidate: 60 }});
    if (r.ok){
      const j:any = await r.json();
      const url = j.results?.[0]?.previewUrl || null;
      if (url){ cache.set(k, url); return url; }
    }
  }catch{}

  // Deezer
  try{
    const q = encodeURIComponent(`${track.name} ${track.artists[0]||''}`);
    const r = await fetch(`https://api.deezer.com/search?q=${q}`, { next: { revalidate: 60 }});
    if (r.ok){
      const j:any = await r.json();
      const url = j.data?.[0]?.preview || null;
      if (url){ cache.set(k, url); return url; }
    }
  }catch{}

  cache.set(k, null);
  return null;
}
