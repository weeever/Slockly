import { create } from 'zustand';
import type { Track } from '@/store/playlistStore';

type AudioState = {
  audio?: HTMLAudioElement | null;
  visible: boolean;
  playing: boolean;
  volume: number;
  currentId?: string | null;
  currentName?: string | null;
  currentArtists?: string[] | null;
  currentCover?: string | null;
  progress: number;
  duration: number;
  ensure: () => void;
  playPreview: (t: Track) => Promise<void>;
  toggle: () => void;
  setVolume: (v: number) => void;
  seekTo: (t: number) => void;
};

export const useAudioStore = create<AudioState>((set, get) => ({
  audio: undefined,
  visible: false,
  playing: false,
  volume: 0.7,
  currentId: null,
  currentName: null,
  currentArtists: null,
  currentCover: null,
  progress: 0,
  duration: 0,

  ensure: () => {
    if (typeof window === 'undefined') return;
    let a = get().audio;
    if (!a) {
      a = new Audio();
      a.preload = 'none';
      a.crossOrigin = 'anonymous';
      a.volume = get().volume;
      a.addEventListener('timeupdate', () => {
        set({ progress: a!.currentTime, duration: a!.duration || 0 });
      });
      a.addEventListener('ended', () => set({ playing: false }));
      a.addEventListener('pause', () => set({ playing: false }));
      a.addEventListener('play', () => set({ playing: true, visible: true }));
      set({ audio: a });
    }
  },

  playPreview: async (t) => {
    if (!t?.previewUrl) return;
    get().ensure();
    const a = get().audio!;
    if (!a) return;
    try {
      if (get().currentId !== t.id) {
        a.src = t.previewUrl!;
        set({
          currentId: t.id,
          currentName: t.name,
          currentArtists: t.artists || [],
          currentCover: t.albumCover || null,
          progress: 0,
          duration: 0,
          visible: true,
        });
      }
      await a.play();
      set({ playing: true, visible: true });
    } catch (e) {
      console.error('preview play failed', e);
    }
  },

  toggle: () => {
    get().ensure();
    const a = get().audio;
    if (!a) return;
    if (a.paused) a.play().catch(()=>{});
    else a.pause();
  },

  setVolume: (v: number) => {
    const vol = Math.min(1, Math.max(0, v));
    const a = get().audio;
    if (a) a.volume = vol;
    set({ volume: vol });
  },

  seekTo: (t: number) => {
    const a = get().audio;
    if (!a) return;
    a.currentTime = Math.max(0, Math.min(a.duration || 0, t));
    set({ progress: a.currentTime });
  },
}));
