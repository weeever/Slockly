'use client';
import { useAudioStore } from '@/store/useAudioStore';
import { Button } from '@/components/ui/button';
import { Volume2, Pause, Play } from 'lucide-react';
import { motion } from 'framer-motion';
import { useEffect } from 'react';

const MDiv = motion.div;

function fmt(n?: number){
  if (n === undefined || n === null) return '--';
  const m = Math.floor(n / 60);
  const s = Math.floor(n % 60);
  return `${m}:${s.toString().padStart(2,'0')}`;
}

export function AudioPlayer(){
  const { ensure, visible, playing, toggle, setVolume, volume, currentName, currentArtists, currentCover, progress, duration } = useAudioStore();

  // create audio element on mount (client only)
  useEffect(() => { ensure(); }, [ensure]);

  if (!visible) return null;

  const pct = duration ? Math.min(100, Math.max(0, (progress||0) * 100 / (duration||1))) : 0;

  return (
    <MDiv
      initial={{ y: 80, opacity: 0 }}
      animate={{ y: 0, opacity: 1 }}
      className="fixed bottom-4 left-1/2 -translate-x-1/2 w-[min(1080px,94vw)] rounded-2xl bg-black/40 backdrop-blur-xl ring-1 ring-white/10 p-3 shadow-[0_20px_80px_rgba(168,85,247,.25)]"
    >
      <div className="flex items-center gap-3">
        <div className="h-12 w-12 rounded-lg overflow-hidden bg-white/5 ring-1 ring-white/10 flex items-center justify-center shrink-0">
          {currentCover ? <img src={currentCover} alt="" className="h-full w-full object-cover" /> : <div className="h-6 w-6 rounded-full bg-white/20" />}
        </div>
        <div className="min-w-0 flex-1">
          <div className="truncate text-sm font-medium">{currentName || '—'}</div>
          <div className="truncate text-xs text-white/60">{(() => {
              const toArray = (val:any): string[] => {
                if (!val) return [];
                if (Array.isArray(val)) return val.map((v:any)=> typeof v === 'string' ? v : v?.name).filter(Boolean);
                if (typeof val === 'string') return [val];
                return [];
              };
              return toArray(currentArtists).join(', ');
            })()}</div>
        </div>

        <div className="flex items-center gap-2">
          <Button onClick={toggle} className="h-10 w-10 rounded-full p-0">
            {playing ? <Pause className="h-5 w-5" /> : <Play className="h-5 w-5" />}
          </Button>
          <div className="flex items-center gap-2 ml-2">
            <Volume2 className="h-4 w-4 text-white/60" />
            <input
              aria-label="Volume"
              type="range"
              min={0} max={1} step={0.01}
              value={volume}
              onChange={(e)=> setVolume(parseFloat(e.target.value))}
              className="w-28 accent-violet-500"
            />
          </div>
        </div>
      </div>

      <div className="mt-2">
        <div className="h-1.5 w-full bg-white/10 rounded-full overflow-hidden">
          <div className="h-full bg-gradient-to-r from-fuchsia-400 to-violet-400" style={{ width: pct + '%' }} />
        </div>
        <div className="mt-1 text-[10px] text-white/50 flex justify-between">
          <span>{fmt(progress)}</span><span>{fmt(duration)}</span>
        </div>
      </div>
    </MDiv>
  );
}
