'use client';
import { useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { Play, Pause, Trash2 } from 'lucide-react';
import { usePlaylistStore, type Track } from '@/store/playlistStore';
import { useAudioStore } from '@/store/useAudioStore';

export function TrackCard({ track }: { track: Track }){
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id: String(track.id) });
  const style: React.CSSProperties = { transform: CSS.Transform.toString(transform), transition };
  const remove = usePlaylistStore(s => s.remove);
  const { currentId, playing, playPreview, toggle } = useAudioStore(s => ({
    currentId: s.currentId, playing: s.playing, playPreview: s.playPreview, toggle: s.toggle
  }));
  const isCurrent = currentId === track.id;
  const showPause = isCurrent && playing;

  return (
    <div
      ref={setNodeRef}
      style={style}
      {...attributes}
      {...listeners}
      className={`group relative grid grid-cols-[auto_1fr_auto] items-center gap-3 p-3 rounded-xl bg-white/5 ring-1 ring-white/10 overflow-hidden cursor-grab active:cursor-grabbing
        ${isDragging ? 'ring-violet-500/50 shadow-[0_0_40px_rgba(168,85,247,0.35)]' : 'hover:ring-violet-500/30'}`}>

      <div className="relative h-12 w-12 rounded-md overflow-hidden ring-1 ring-white/10">
        {track.albumCover ? <img src={track.albumCover} alt="" className="h-full w-full object-cover" /> : <div className="h-full w-full bg-black/40" />}
        <div className="absolute inset-0 bg-black/25 backdrop-blur-[2px] opacity-0 group-hover:opacity-100 transition"></div>
        <button
          className="absolute inset-0 m-auto h-7 w-7 flex items-center justify-center rounded-full bg-white/15 ring-1 ring-white/20 opacity-0 group-hover:opacity-100 transition"
          onClick={(e)=>{ e.stopPropagation(); remove(track.id); }}
          aria-label="Supprimer"
          title="Supprimer"
        >
          <Trash2 className="w-4 h-4" />
        </button>
      </div>

      <div className="min-w-0">
        <div className="text-sm font-medium truncate">{track.name}</div>
        <div className="text-xs text-white/60 truncate">{(track.artists||[]).join(', ')}</div>
      </div>

      <button
        className="p-2 rounded-md bg-white/5 ring-1 ring-white/10 opacity-80 hover:opacity-100"
        onPointerDown={(e)=> e.stopPropagation()}
        onClick={(e)=>{
          e.stopPropagation();
          if (isCurrent){ toggle(); }
          else if (track.previewUrl){ playPreview(track); }
        }}
        aria-label={showPause ? 'Pause' : 'Lecture'}
      >
        {showPause ? <Pause className="w-4 h-4" /> : <Play className="w-4 h-4" />}
      </button>
    </div>
  );
}
