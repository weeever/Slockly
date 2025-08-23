// Zustand store (ensure it matches your app; safe to drop-in)
import { create } from 'zustand';

export type Track = {
  id: string;
  uri: string;
  name: string;
  artists: string[];
  albumCover?: string | null;
  previewUrl?: string | null;
};

type State = {
  tracks: Track[];
  setTracks: (ts: Track[]) => void;
  remove: (id: string) => void;
  move: (fromId: string, toId: string) => void;
};

export const usePlaylistStore = create<State>((set, get) => ({
  tracks: [],
  setTracks: (ts) => set({ tracks: ts }),
  remove: (id) => set({ tracks: get().tracks.filter(t => String(t.id) !== String(id)) }),
  move: (fromId, toId) => {
    const list = [...get().tracks];
    const fromIdx = list.findIndex(t => String(t.id) === String(fromId));
    const toIdx = list.findIndex(t => String(t.id) === String(toId));
    if (fromIdx === -1 || toIdx === -1 || fromIdx === toIdx) return;
    const [item] = list.splice(fromIdx, 1);
    list.splice(toIdx, 0, item);
    set({ tracks: list });
  },
}));
