'use client';
import type { Track } from '@/store/playlistStore';

export function DragGhost({ track }: { track?: Track }){
  if (!track) return null;
  return (
    <div className="pointer-events-none select-none rounded-xl px-4 py-3 bg-violet-500/20 ring-1 ring-violet-400/40 backdrop-blur-md shadow-[0_0_48px_rgba(167,139,250,.55)]">
      <div className="flex items-center gap-3">
        <div className="h-10 w-10 rounded-md overflow-hidden bg-black/40 ring-1 ring-white/10 flex items-center justify-center">
          {track.albumCover ? <img src={track.albumCover} alt="" className="h-full w-full object-cover" /> : <div className="text-xs text-white/60">—</div>}
        </div>
        <div className="min-w-0">
          <div className="text-sm font-semibold truncate">{track.name}</div>
          <div className="text-xs text-white/70 truncate">{(track.artists||[]).join(', ')}</div>
        </div>
      </div>
    </div>
  );
}
