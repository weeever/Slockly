'use client';

import { useAppStore } from '@/store/useAppStore';
import { useState } from 'react';

export function PushToSpotifyButton(){
  const { playlist, generating } = useAppStore();
  const [pushing, setPushing] = useState(false);
  const [name, setName] = useState('Slockly – Playlist IA');

  const push = async () => {
    setPushing(true);
    try {
      const res = await fetch('/api/playlist/push', { method:'POST', headers:{'Content-Type':'application/json'}, body: JSON.stringify({ name, tracks: playlist.map(t=>t.uri) }) });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Erreur');
      // Try confetti if available at runtime
      try {
        const mod = await import('canvas-confetti');
        mod.default({ spread: 90, particleCount: 160 });
      } catch {}
      alert('Playlist créée ! Ouvrir dans Spotify : ' + data.external_url);
    } catch (e:any){
      alert('Échec : ' + e.message);
    } finally {
      setPushing(false);
    }
  };

  if (playlist.length === 0) return null;

  return (
    <div className="flex items-center gap-2">
      <input value={name} onChange={e=>setName(e.target.value)} className="max-w-[260px]" aria-label="Nom de la playlist"/>
      <button className="btn-primary disabled:opacity-50" disabled={pushing || generating} onClick={push}>
        {pushing ? 'Envoi...' : 'Envoyer sur Spotify'}
      </button>
    </div>
  )
}
