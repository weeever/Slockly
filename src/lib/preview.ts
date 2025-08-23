// src/lib/preview.ts
// Tries Spotify preview_url first (handled by caller), then iTunes, then Deezer
export async function getPreviewFor(trackName: string, artistName: string): Promise<string|null> {
  const itunes = await fetch(`https://itunes.apple.com/search?term=${encodeURIComponent(`${trackName} ${artistName}`)}&entity=song&limit=1`);
  if (itunes.ok) {
    const j = await itunes.json();
    const url = j?.results?.[0]?.previewUrl || null;
    if (url) return url;
  }
  const dz = await fetch(`https://api.deezer.com/search?q=${encodeURIComponent(`track:"${trackName}" artist:"${artistName}"`)}&limit=1`);
  if (dz.ok){
    const j = await dz.json();
    const url = j?.data?.[0]?.preview || null;
    if (url) return url;
  }
  return null;
}
