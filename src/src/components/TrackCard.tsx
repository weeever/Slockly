'use client';
import { Track, usePlaylistStore } from '@/store/playlistStore';
import { useAudioStore } from '@/store/useAudioStore';
import { Button } from '@/components/ui/button';
import { GripVertical, Play, Pause, Trash2, Music2 } from 'lucide-react';
import { CSS } from '@dnd-kit/utilities';
import { useSortable } from '@dnd-kit/sortable';
import { motion } from 'framer-motion';
const MDiv = motion.div;

export function TrackCard({ track }: { track: Track }){
  const { removeTrack } = usePlaylistStore();
  const { currentId, playing, play, toggle } = useAudioStore();
  const hasPreview = !!track.preview;

  const isCurrent = currentId === track.id;
  const isPlaying = isCurrent && playing;

  const { attributes, listeners, setNodeRef, transform, transition } = useSortable({ id: track.id });
  const style: React.CSSProperties = {
    transform: CSS.Transform.toString(transform),
    transition
  };

  const onPlayPause = () => {
    if (!hasPreview) return;
    if (isCurrent) toggle();
    else play(track.id, track.preview!, { name: track.name, artists: track.artists.join(', '), cover: track.albumCover });
  };

  return (
    <MDiv
      ref={setNodeRef}
      style={style}
      whileHover={{ scale: 1.01 }}
      whileTap={{ scale: 0.995 }}
      className="relative group grid grid-cols-[auto_1fr_auto_auto] items-center gap-3 p-3 rounded-xl bg-white/5 ring-1 ring-white/10 hover:ring-violet-500/40 hover:shadow-[0_0_40px_rgba(168,85,247,0.35)] transition-all select-none overflow-hidden"
    >
      <div className="pointer-events-none absolute inset-px rounded-[11px] opacity-0 group-hover:opacity-100 blur-2xl bg-[radial-gradient(90px_90px_at_80%_-10%,rgba(168,85,247,0.25),transparent)]" />
      <div className="h-12 w-12 rounded-md overflow-hidden bg-black/40 ring-1 ring-white/10 flex items-center justify-center">
        {track.albumCover ? <img src={track.albumCover} alt="" className="h-full w-full object-cover" /> : <Music2 className="h-5 w-5 text-white/50" />}
      </div>
      <div className="min-w-0">
        <div className="truncate font-medium text-white/90">{track.name}</div>
        <div className="truncate text-sm text-white/60">{track.artists.join(', ')}</div>
      </div>
      <div className="flex items-center gap-2">
        <Button onClick={onPlayPause} variant="ghost" className={!hasPreview ? 'opacity-40 cursor-not-allowed' : ''} aria-label={isPlaying ? 'Pause' : 'Play'}>
          {isPlaying ? <Pause className="h-4 w-4 text-violet-300" /> : <Play className="h-4 w-4 text-violet-300" />}
        </Button>
        <Button onClick={()=> removeTrack(track.id)} variant="ghost" aria-label="Supprimer">
          <Trash2 className="h-4 w-4 text-rose-300" />
        </Button>
      </div>
      <div className="opacity-0 group-hover:opacity-100 transition-opacity">
        <button aria-label="Drag" {...attributes} {...listeners} className="cursor-grab active:cursor-grabbing text-white/40 hover:text-white/80">
          <GripVertical className="h-4 w-4" />
        </button>
      </div>
    </MDiv>
  );
}
