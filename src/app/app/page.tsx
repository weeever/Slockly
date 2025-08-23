'use client';

import { useEffect, useState, useMemo } from 'react';
import {
  DndContext,
  DragStartEvent,
  DragEndEvent,
  DragOverlay,
  PointerSensor,
  useSensor,
  useSensors,
} from '@dnd-kit/core';
import { SortableContext, verticalListSortingStrategy } from '@dnd-kit/sortable';

import { usePlaylistStore } from '@/store/playlistStore';
import { TrackCard } from '@/components/TrackCard';
import { AudioPlayer } from '@/components/AudioPlayer';
import { Logo } from '@/components/Logo';
import { NavPill } from '@/components/NavPill';
import { UserCard } from '@/components/UserCard';
import { DragGhost } from '@/components/DragGhost';
import { GlassCard } from '@/components/GlassCard';
import { Button } from '@/components/ui/button';

type Me = { display_name: string; images?: { url: string }[] };

const NAME_PLACEHOLDER = 'Entrer votre titre';

export default function AppPage() {
  const { tracks, setTracks, move } = usePlaylistStore();

  const [me, setMe] = useState<Me | null>(null);
  useEffect(() => {
    let cancelled = false;
    (async () => {
      const res = await fetch('/api/auth/spotify/me', { cache: 'no-store' });
      if (!res.ok) { window.location.href = '/'; return; }
      const js = await res.json();
      if (!cancelled) setMe(js);
    })();
    return () => { cancelled = true; };
  }, []);

  const [prompt, setPrompt] = useState('');
  const [excludeArtists, setExcludeArtists] = useState('');
  const [excludeGenres, setExcludeGenres] = useState('');
  const [excludeTracks, setExcludeTracks] = useState('');
  const [approxN, setApproxN] = useState(20);
  const [generating, setGenerating] = useState(false);
  const [pushing, setPushing] = useState(false);

  // valeur par défaut mais placeholder constant
  const [playlistName, setPlaylistName] = useState('Playlist by Slockly');
  const nameSize = useMemo(() => {
    const l = Math.max(NAME_PLACEHOLDER.length, (playlistName || '').length);
    return Math.min(Math.max(l, 12), 36);
  }, [playlistName]);

  // DnD
  const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 6 } }));
  const [activeId, setActiveId] = useState<string | null>(null);
  const onDragStart = (e: DragStartEvent) => setActiveId(String(e.active.id));
  const onDragEnd = (e: DragEndEvent) => {
    const fromId = String(e.active.id);
    const toId = String(e?.over?.id || '');
    setActiveId(null);
    if (fromId && toId && fromId !== toId) move(fromId, toId);
  };
  const activeTrack = tracks.find(t => String(t.id) === String(activeId)) || null;

  async function generate(){
    setGenerating(true);
    try{
      const fullPrompt = [
        prompt,
        excludeArtists ? `Exclure artistes: ${excludeArtists}` : '',
        excludeGenres ? `Exclure genres: ${excludeGenres}` : '',
        excludeTracks ? `Exclure titres: ${excludeTracks}` : ''
      ].filter(Boolean).join('. ');

      const res = await fetch('/api/playlist/generate', {
        method: 'POST',
        headers: {'Content-Type':'application/json'},
        body: JSON.stringify({ prompt: fullPrompt, approxN })
      });
      if (!res.ok){
        const t = await res.text();
        throw new Error(t || 'generate failed');
      }
      const js = await res.json();
      setTracks(js.tracks || []);
    }catch(e:any){
      console.error(e);
      alert('Échec génération: ' + (e?.message || 'inconnue'));
    }finally{
      setGenerating(false);
    }
  }

  async function pushToSpotify(){
    setPushing(true);
    try{
      const name = (playlistName || '').trim() || 'Slockly – Playlist';
      const uris = tracks.map(t=> t.uri);
      const res = await fetch('/api/playlist/push', {
        method: 'POST',
        headers: {'Content-Type':'application/json'},
        body: JSON.stringify({ name, tracks: uris })
      });
      const js = await res.json();
      if (!res.ok) throw new Error(js?.error || 'push failed');
      alert('Playlist créée 🎉\n' + (js?.external_url || ''));
    }catch(e:any){
      alert('Échec envoi: ' + (e?.message || 'inconnue'));
    }finally{
      setPushing(false);
    }
  }

  return (
    <main className="min-h-screen bg-gradient-to-b from-[#0b0714] to-[#0d0b1a] text-white">
      <header className="max-w-6xl mx-auto px-4 py-4 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Logo />
          <div className="font-semibold tracking-wide">Slockly</div>
          <NavPill />
        </div>
        <div className="flex items-center gap-3">
          {me && <UserCard name={me.display_name} avatar={me.images?.[0]?.url} />}
          <a href="/api/auth/spotify/login?logout=1" className="text-white/60 hover:text-white text-sm underline">Déconnexion</a>
        </div>
      </header>

      <section className="max-w-6xl mx-auto px-4 pb-24 grid md:grid-cols-[1fr_1.2fr] gap-6">
        {/* LEFT */}
        <GlassCard className="md:sticky md:top-24">
          <h2 className="font-semibold text-lg mb-2">Chat IA</h2>
          <textarea
            value={prompt}
            onChange={(e)=> setPrompt(e.target.value)}
            placeholder="Décris ton mood... (ex: ambiance club afro, pas de rap FR, 120-125 BPM)"
            className="w-full h-36 p-3 rounded-xl bg-black/30 ring-1 ring-white/10 focus:ring-violet-500/50 outline-none"
          />
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3 mt-3">
            <input value={excludeArtists} onChange={(e)=>setExcludeArtists(e.target.value)} placeholder="Exclure artistes" className="p-3 rounded-xl bg-black/30 ring-1 ring-white/10 focus:ring-violet-500/50 outline-none" />
            <input value={excludeGenres} onChange={(e)=>setExcludeGenres(e.target.value)} placeholder="Exclure genres" className="p-3 rounded-xl bg-black/30 ring-1 ring-white/10 focus:ring-violet-500/50 outline-none" />
            <input value={excludeTracks} onChange={(e)=>setExcludeTracks(e.target.value)} placeholder="Exclure titres" className="p-3 rounded-xl bg-black/30 ring-1 ring-white/10 focus:ring-violet-500/50 outline-none" />
          </div>

          {/* Mini-card pour la range – assombrie */}
          <div className="mt-4 rounded-2xl bg-black/40 ring-1 ring-white/10 p-3">
            <div className="flex items-center gap-3">
              <div className="text-white/70 text-sm leading-none">≈ titres</div>
              <input
                type="range"
                min={5}
                max={100}
                step={1}
                value={approxN}
                onChange={(e)=> setApproxN(parseInt(e.target.value))}
                className="w-full md:w-64 accent-violet-500"
              />
              <span className="text-white/70 text-sm w-8 text-right">{approxN}</span>
            </div>
          </div>

          {/* Boutons SOUS la card : Envoyer (à gauche, + petit) / Générer (à droite, néon) */}
          <div className="mt-3 grid grid-cols-1 sm:grid-cols-2 gap-2">
            {/* gauche */}
            {tracks.length > 0 ? (
              <Button
                variant="outline"
                size="sm"
                onClick={pushToSpotify}
                disabled={pushing}
                className="w-full justify-center px-3 py-2"
              >
                {pushing ? 'Envoi…' : 'Envoyer sur Spotify'}
              </Button>
            ) : (
              <div className="hidden sm:block" />
            )}

            {/* droite (néon) */}
            <Button
              onClick={generate}
              disabled={generating}
              className="w-full justify-center px-5 py-2 bg-violet-600/90 hover:bg-violet-500 text-white shadow-[0_0_24px_rgba(167,139,250,.55)] hover:shadow-[0_0_36px_rgba(167,139,250,.7)] transition-shadow"
            >
              {generating ? 'Génération…' : 'Générer la playlist'}
            </Button>
          </div>
        </GlassCard>

        {/* RIGHT */}
        <GlassCard>
          <div className="flex items-center justify-between gap-3">
            <h2 className="font-semibold text-lg">Aperçu de la playlist</h2>
            <input
              value={playlistName}
              onChange={(e)=> setPlaylistName(e.target.value)}
              placeholder={NAME_PLACEHOLDER}
              size={nameSize}
              className="px-3 py-2 rounded-lg bg-black/30 ring-1 ring-white/10 focus:ring-violet-500/50 outline-none text-left w-auto"
              dir="ltr"
            />
          </div>

          <div className="mt-3 space-y-2">
            {tracks.length === 0 && (
              <div className="text-white/50">Aucun titre pour le moment. Générez une playlist à gauche.</div>
            )}

            {tracks.length > 0 && (
              <DndContext sensors={sensors} onDragStart={onDragStart} onDragEnd={onDragEnd}>
                <SortableContext items={tracks.map(t=> String(t.id))} strategy={verticalListSortingStrategy}>
                  <div className="space-y-2">
                    {tracks.map((t)=> <TrackCard key={t.id} track={t} />)}
                  </div>
                </SortableContext>
                <DragOverlay dropAnimation={{ duration: 150 }}>
                  {activeTrack ? <DragGhost track={activeTrack} /> : null}
                </DragOverlay>
              </DndContext>
            )}
          </div>
        </GlassCard>
      </section>

      <AudioPlayer />
    </main>
  );
}
