'use client';
import { useEffect } from 'react';
import { useAudioStore } from '@/store/useAudioStore';
import { motion, AnimatePresence } from 'framer-motion';
import { Play, Pause, Volume2 } from 'lucide-react';

export function AudioPlayer(){
  const { ensure, visible, playing, toggle, setVolume, volume, currentName, currentArtists, currentCover, progress, duration, seekTo } = useAudioStore();
  useEffect(() => { ensure(); }, [ensure]);
  const pct = duration ? (progress / duration) * 100 : 0;

  return (
    <AnimatePresence>
      {visible && (
        <motion.div
          initial={{ y: 80, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          exit={{ y: 80, opacity: 0 }}
          transition={{ type: 'spring', stiffness: 300, damping: 26 }}
          className="fixed bottom-4 inset-x-0 z-50 mx-auto max-w-[720px] w-[92vw] rounded-2xl bg-black/50 backdrop-blur-md ring-1 ring-white/10 shadow-[0_0_60px_rgba(167,139,250,.35)]"
        >
          <div className="p-3 flex items-center gap-3">
            <div className="h-12 w-12 rounded-md overflow-hidden ring-1 ring-white/10 bg-black/30 flex items-center justify-center">
              {currentCover ? <img src={currentCover} className="h-full w-full object-cover" alt="" /> : <div className="text-xs text-white/60">—</div>}
            </div>

            <div className="min-w-0 flex-1">
              <div className="truncate text-sm font-medium">{currentName || '—'}</div>
              <div className="truncate text-xs text-white/60">{Array.isArray(currentArtists) ? currentArtists.join(', ') : ''}</div>
              <div className="mt-1 h-1.5 rounded bg-white/10 overflow-hidden cursor-pointer" onClick={(e)=>{
                const rect = (e.currentTarget as HTMLDivElement).getBoundingClientRect();
                const x = (e as any).clientX - rect.left;
                const ratio = Math.max(0, Math.min(1, x / rect.width));
                seekTo(ratio * (duration || 0));
              }}>
                <div className="h-full bg-violet-400" style={{ width: `${pct}%` }}></div>
              </div>
            </div>

            <button
              className="p-2 rounded-md bg-white/5 ring-1 ring-white/10"
              onClick={toggle}
              aria-label={playing ? 'Pause' : 'Lecture'}
            >
              {playing ? <Pause className="w-5 h-5" /> : <Play className="w-5 h-5" />}
            </button>

            <div className="hidden md:flex items-center gap-2 px-2 py-1 rounded-full bg-white/5 ring-1 ring-white/10">
              <Volume2 className="w-4 h-4" />
              <input
                type="range"
                min={0}
                max={1}
                step={0.01}
                value={volume}
                onChange={(e)=> setVolume(parseFloat(e.target.value))}
                className="w-24 accent-violet-400 bg-transparent"
              />
            </div>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
