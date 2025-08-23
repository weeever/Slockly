
'use client';

import { useAppStore } from '@/store/useAppStore';
import { useState } from 'react';
import { Button } from '@/components/ui/button';

export function PushToSpotifyButton(){
  const { playlist, generating } = useAppStore();
  const [pushing, setPushing] = useState(false);
  const [name, setName] = useState('Slockly – Playlist IA');

  const push = async () => {
    setPushing(true);
    try {
      const res = await fetch('/api/playlist/push', {
        method:'POST',
        headers: { 'Content-Type':'application/json' },
        body: JSON.stringify({ name, tracks: playlist.map(t=>t.uri) })
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data?.error || 'Erreur');
      if (data?.external_url){
        window.open(data.external_url, '_blank');
      }
    } catch (e:any){
      alert('Échec : ' + (e?.message||'push'));
    } finally {
      setPushing(false);
    }
  };

  if (playlist.length === 0) return null;

  return (
    <div className="flex flex-col sm:flex-row sm:items-center gap-2">
      <input
        value={name}
        onChange={e=>setName(e.target.value)}
        aria-label="Nom de la playlist"
        className="w-full sm:max-w-[320px] rounded-xl bg-white/5 ring-1 ring-white/10 px-3 py-2 focus:ring-violet-500/50 outline-none"
      />
      <Button
        disabled={pushing || generating}
        onClick={push}
        className="shadow-[0_0_22px_rgba(168,85,247,.35)]"
      >
        {pushing ? 'Envoi...' : 'Envoyer sur Spotify'}
      </Button>
    </div>
  )
}
