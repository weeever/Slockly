
'use client';
import { create } from 'zustand';

export type Track = {
  id: string;
  uri: string;
  name: string;
  artists: string[];
  albumCover: string;
  explicit: boolean;
  duration_ms: number;
  preview: string | null;
};

type State = {
  tracks: Track[];
  setTracks: (t: Track[]) => void;
  removeTrack: (id: string) => void;
  move: (fromId: string, toId: string) => void;
};

export const usePlaylistStore = create<State>((set, get)=> ({
  tracks: [],
  setTracks: (t)=> set({ tracks: t }),
  removeTrack: (id)=> set({ tracks: get().tracks.filter(x=> x.id !== id) }),
  move: (fromId, toId)=> {
    const arr = [...get().tracks];
    const fromIdx = arr.findIndex(x=> x.id===fromId);
    const toIdx = arr.findIndex(x=> x.id===toId);
    if (fromIdx<0 || toIdx<0) return;
    const [item] = arr.splice(fromIdx, 1);
    arr.splice(toIdx, 0, item);
    set({ tracks: arr });
  }
}));
