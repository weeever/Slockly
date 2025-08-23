'use client';

import { create } from 'zustand';

export type Track = {
  id: string;
  uri: string;
  name: string;
  artists: string[];
  albumCover: string;
  preview?: string | null;
  explicit?: boolean;
  duration_ms?: number;
};

type User = { name?: string; avatar?: string | null };

type AppState = {
  user: User | null;
  setUser: (u: User)=>void;
  playlist: Track[];
  setPlaylist: (t: Track[])=>void;
  generating: boolean;
  setGenerating: (v: boolean)=>void;
  approxN: number;
  setApproxN: (n: number)=>void;
  exclusions: string;
  setExclusions: (s: string)=>void;
};

export const useAppStore = create<AppState>((set)=> ({
  user: null,
  setUser: (u)=>set({user:u}),
  playlist: [],
  setPlaylist: (t)=>set({playlist: t}),
  generating: false,
  setGenerating: (v)=>set({generating: v}),
  approxN: 20,
  setApproxN: (n)=>set({approxN: n}),
  exclusions: '',
  setExclusions: (s)=>set({exclusions: s}),
}));
