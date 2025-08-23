'use client';
import { Track } from '@/store/playlistStore';
import { motion } from 'framer-motion';
import { Music2 } from 'lucide-react';

export function DragGhost({ track }: { track: Track }){
  return (
    <motion.div
      initial={{ scale: .96, opacity: .85 }}
      animate={{ scale: 1, opacity: .95 }}
      className="relative grid grid-cols-[auto_1fr] items-center gap-3 p-3 rounded-xl bg-white/8 ring-1 ring-violet-400/30 shadow-[0_0_40px_rgba(168,85,247,.35)] backdrop-blur-md"
    >
      <div className="absolute inset-0 overflow-hidden rounded-xl pointer-events-none">
        <div className="w-full h-full opacity-30 [background-image:repeating-linear-gradient(90deg,rgba(167,139,250,.25)_0_4px,transparent_4px_10px)] animate-[wave_1.8s_linear_infinite]"></div>
      </div>
      <style jsx>{`
        @keyframes wave { from { transform: translateX(0) } to { transform: translateX(-14px) } }
      `}</style>
      <div className="h-10 w-10 rounded-md overflow-hidden bg-black/40 ring-1 ring-white/10 flex items-center justify-center">
        {track.albumCover ? <img src={track.albumCover} alt="" className="h-full w-full object-cover" /> : <Music2 className="h-5 w-5 text-white/50" />}
      </div>
      <div className="min-w-0">
        <div className="truncate font-medium text-white/90">{track.name}</div>
        <div className="truncate text-xs text-white/60">{track.artists.join(', ')}</div>
      </div>
    </motion.div>
  );
}
