
'use client';
import { createPortal } from 'react-dom';
import { useEffect, useMemo, useState } from 'react';
import { DndContext, DragStartEvent, DragEndEvent, DragOverlay } from '@dnd-kit/core';
import { SortableContext, verticalListSortingStrategy } from '@dnd-kit/sortable';
import { usePlaylistStore } from '@/store/playlistStore';
import { TrackCard } from '@/components/TrackCard';
import { AudioPlayer } from '@/components/AudioPlayer';
import { Logo } from '@/components/Logo';
import { NavPill } from '@/components/NavPill';
import { UserCard } from '@/components/UserCard';
import { DragGhost } from '@/components/DragGhost';
import { NeonBackground } from '@/components/NeonBackground';
import { GlassCard } from '@/components/GlassCard';
import { Button } from '@/components/ui/button';

type Me = { display_name: string; images?: {url:string}[] };

export default function AppPage(){
  const { tracks, setTracks, move } = usePlaylistStore();
  const [me, setMe] = useState<Me | null>(null);
  const [loadingMe, setLoadingMe] = useState(true);

  const [prompt, setPrompt] = useState('');
  const [excludeArtists, setExcludeArtists] = useState('');
  const [excludeGenres, setExcludeGenres] = useState('');
  const [excludeTracks, setExcludeTracks] = useState('');
  const [approxN, setApproxN] = useState(20);
  const [generating, setGenerating] = useState(false);
  const [pushing, setPushing] = useState(false);

  useEffect(()=>{
    let cancelled = false;
    (async ()=>{
      const res = await fetch('/api/auth/spotify/me', { cache:'no-store' });
      if (!res.ok){ window.location.href = '/'; return; }
      const js = await res.json();
      if (!cancelled) { setMe(js); setLoadingMe(false); }
    })();
    return ()=>{ cancelled = true; };
  }, []);

  const [activeId, setActiveId] = useState<string | null>(null);

  const onDragStart = (e: any) => { setActiveId(String(e.active.id)); };
  const onDragEnd = (e: DragEndEvent) => {
    const fromId = String(e.active.id);
    const toId = String(e?.over?.id || '');
    if (fromId && toId && fromId !== toId){
      move(fromId, toId);
    }
  };

  async function generate(){
    setGenerating(true);
    try {
      const fullPrompt = [
        prompt,
        excludeArtists ? `Exclure artistes: ${excludeArtists}` : '',
        excludeGenres ? `Exclure genres: ${excludeGenres}` : '',
        excludeTracks ? `Exclure titres: ${excludeTracks}` : ''
      ].filter(Boolean).join('. ');

      const res = await fetch('/api/playlist/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ prompt: fullPrompt, approxN })
      });
      if (!res.ok){
        const text = await res.text();
        throw new Error(text || 'generate failed');
      }
      const js = await res.json();
      setTracks(js.tracks || []);
    } catch (e:any){
      console.error(e);
      alert('Échec génération: ' + (e?.message || 'inconnue'));
    } finally {
      setGenerating(false);
    }
  }

  async function pushToSpotify(){
    setPushing(true);
    try {
      const name = 'Slockly – ' + (prompt || 'Playlist');
      const uris = tracks.map(t=> t.uri);
      const res = await fetch('/api/playlist/push', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name, tracks: uris })
      });
      const js = await res.json();
      if (!res.ok) throw new Error(js?.error || 'push failed');
      alert('Playlist créée 🎉\\n' + (js?.external_url || ''));
    } catch (e:any){
      alert('Échec envoi: ' + (e?.message || 'inconnue'));
    } finally {
      setPushing(false);
    }
  }

  const activeTrack = tracks.find(t=> t.id===activeId) || null;

  return (
    <main className="min-h-screen bg-gradient-to-b from-[#0b0714] to-[#0d0b1a] text-white">
      {/* Header */}
      <header className="max-w-6xl mx-auto px-4 py-4 flex items-center justify-between">
        <div className="flex items-center gap-3"><Logo/><div className="font-semibold tracking-wide">Slockly</div><NavPill/></div>
        <div className="flex items-center gap-3">{me && <UserCard name={me.display_name} avatar={me.images?.[0]?.url} />}
          <a href="/api/auth/spotify/login?logout=1" className="text-white/60 hover:text-white text-sm underline">Déconnexion</a></div>
      </header>

      {/* Body */}
      <section className="max-w-6xl mx-auto px-4 pb-24 grid md:grid-cols-[1fr_1.2fr] gap-6">
        {/* Left: Chat/Prompt */}
        <GlassCard className="md:sticky md:top-24">
          <h2 className="font-semibold text-lg mb-2">Chat IA</h2>
          <textarea
            value={prompt}
            onChange={(e)=> setPrompt(e.target.value)}
            placeholder="Décris ton mood... (ex: ambiance club afro, pas de rap FR, 120-125 BPM)"
            className="w-full h-36 p-3 rounded-xl bg-black/30 ring-1 ring-white/10 focus:ring-violet-500/50 outline-none"
          />
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3 mt-3">
            <input value={excludeArtists} onChange={(e)=> setExcludeArtists(e.target.value)} placeholder="Exclure artistes" className="p-3 rounded-xl bg-black/30 ring-1 ring-white/10 focus:ring-violet-500/50 outline-none" />
            <input value={excludeGenres} onChange={(e)=> setExcludeGenres(e.target.value)} placeholder="Exclure genres" className="p-3 rounded-xl bg-black/30 ring-1 ring-white/10 focus:ring-violet-500/50 outline-none" />
            <input value={excludeTracks} onChange={(e)=> setExcludeTracks(e.target.value)} placeholder="Exclure titres" className="p-3 rounded-xl bg-black/30 ring-1 ring-white/10 focus:ring-violet-500/50 outline-none" />
          </div>
          <div className="mt-4 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <label className="text-white/70 text-sm">Approx. N</label>
              <input type="range" min={5} max={100} step={1} value={approxN} onChange={(e)=> setApproxN(parseInt(e.target.value))} className="w-48 accent-violet-500" />
              <span className="text-white/70 text-sm w-8 text-right">{approxN}</span>
            </div>
            <div className="flex items-center gap-2">
              <Button onClick={generate} disabled={generating} className="shadow-[0_0_24px_rgba(168,85,247,0.35)]">
                {generating ? 'Génération...' : 'Générer la playlist'}
              </Button>
              {tracks.length>0 && <Button variant="outline" onClick={pushToSpotify} disabled={pushing}>
                {pushing ? 'Envoi...' : 'Envoyer sur Spotify'}
              </Button>}
            </div>
          </div>
        </GlassCard>

        {/* Right: Playlist */}
        <GlassCard>
          <div className="flex items-center justify-between">
            <h2 className="font-semibold text-lg">Aperçu de la playlist</h2>
          </div>
          <div className="mt-3 space-y-2">
            {tracks.length === 0 && <div className="text-white/50">Aucun titre pour le moment. Générez une playlist à gauche.</div>}
            {tracks.length > 0 && (
              <DndContext onDragStart={onDragStart} onDragEnd={onDragEnd}>
                <SortableContext items={tracks.map(t=> t.id)} strategy={verticalListSortingStrategy}>
                  <div className="space-y-2">
                    {tracks.map((t)=> <TrackCard key={t.id} track={t} />)}
                  </div>
                </SortableContext>{typeof window!=='undefined' && createPortal(<DragOverlay dropAnimation={{ duration: 180 }}><div className='opacity-90 scale-[1.02]'><div className='pointer-events-none'>{(activeId && tracks.find(t=>t.id===activeId)) ? <TrackCard track={tracks.find(t=>t.id===activeId)!} /> : null}</div></div></DragOverlay>, document.body)}
                <DragOverlay dropAnimation={{ duration: 150 }}>
                  {activeTrack ? <DragGhost track={activeTrack}/> : null}
                </DragOverlay>
              </DndContext>
            )}
          </div>
        </GlassCard>
      </section>
      <AudioPlayer/>
    </main>
  );
}