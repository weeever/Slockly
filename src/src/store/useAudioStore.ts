
'use client';
import { create } from 'zustand';

type AudioState = {
  audio: HTMLAudioElement | null;
  currentId: string | null;
  currentUrl: string | null;
  currentName?: string | null;
  currentArtists?: string | null;
  currentCover?: string | null;
  progress?: number;
  duration?: number;
  visible: boolean;
  volume: number;
  playing: boolean;
  ensure(): HTMLAudioElement;
  play(id: string, url: string, meta?: { name?: string; artists?: string; cover?: string }): void;
  toggle(): void;
  pause(): void;
  setVolume(v: number): void;
};

export const useAudioStore = create<AudioState>((set, get)=> ({
  audio: null,
  currentId: null,
  currentUrl: null,
  visible: false,
  volume: 0.8,
  playing: false,
  ensure(){
      if (typeof window === 'undefined' || typeof Audio === 'undefined') return;
    let a = get().audio;
    if (!a){
      a = new Audio();
      a.preload = 'none';
      a.crossOrigin = 'anonymous';
      a.volume = get().volume;
      a.addEventListener('ended', ()=> set({ playing: false, progress: 0 }));
      set({ audio: a });
    }
    return a;
  },
  play(id, url, meta){
    const a = get().ensure();
    if (get().currentUrl !== url){
      a.pause();
      a.src = url;
      a.load();
    }
    a.play().catch(()=>{});
    set({ currentId: id, currentUrl: url, currentName: meta?.name||null, currentArtists: meta?.artists||null, currentCover: meta?.cover||null, visible: true, playing: true });
  },
  toggle(){
    const a = get().ensure();
    if (a.paused){ a.play().catch(()=>{}); set({ playing: true, visible: true }); }
    else { a.pause(); set({ playing: false }); }
  },
  pause(){
    const a = get().ensure();
    a.pause();
    set({ playing: false });
  },
  setVolume(v){
    const a = get().ensure();
    a.volume = v;
    set({ volume: v });
  }
}));
