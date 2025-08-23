'use client';

import { useState } from 'react';
import { useAppStore } from '@/store/useAppStore';
import * as Slider from '@radix-ui/react-slider';

export function PromptBox(){
  const { generating, approxN, setApproxN, setPlaylist, setGenerating, setExclusions, exclusions } = useAppStore();
  const [prompt, setPrompt] = useState('Une vibe nocturne chillwave, pas de rap FR, inclure des années 2010-2020, plutôt niche');
  const [localEx, setLocalEx] = useState('');

  const handleGenerate = async () => {
    setGenerating(true);
    try {
      if (localEx.trim().length>0) setExclusions(localEx);
      const res = await fetch('/api/playlist/generate', { method: 'POST', headers: {'Content-Type':'application/json'}, body: JSON.stringify({ prompt, approxN }) });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Erreur');
      setPlaylist(data.tracks || []);
    } catch (e:any){
      alert('Échec : ' + e.message);
    } finally {
      setGenerating(false);
    }
  };

  return (
    <div className="space-y-4">
      <div>
        <div className="text-sm text-white/60 mb-1">Décrivez le mood / style</div>
        <textarea rows={5} value={prompt} onChange={e=>setPrompt(e.target.value)} className="w-full resize-none"/>
      </div>

      <div>
        <div className="text-sm text-white/60 mb-2 flex items-center justify-between">
          <span>Nombre approx. de titres: {approxN}</span>
        </div>
        <Slider.Root
          className="relative flex items-center select-none touch-none w-full h-5"
          value={[approxN]}
          min={5} max={50} step={1}
          onValueChange={(v)=>setApproxN(v[0])}
          aria-label="Nombre de titres">
          <Slider.Track className="bg-white/10 relative grow rounded-full h-1.5">
            <Slider.Range className="absolute h-full rounded-full bg-brand-500" />
          </Slider.Track>
          <Slider.Thumb className="block w-4 h-4 bg-brand-500 rounded-full focus:outline-none" />
        </Slider.Root>
      </div>

      <div>
        <div className="text-sm text-white/60 mb-1">Exclusions (ex: "retire SCH, le rap FR, Coldplay")</div>
        <input value={localEx} onChange={e=>setLocalEx(e.target.value)} placeholder="Artistes / genres / titres à bannir" className="w-full"/>
        {exclusions && <div className="text-xs text-white/50 mt-1">Exclusions actives : {exclusions}</div>}
      </div>

      <button disabled={generating} onClick={handleGenerate} className="btn-primary disabled:opacity-50">
        {generating ? 'Génération...' : 'Générer la playlist'}
      </button>
    </div>
  )
}
