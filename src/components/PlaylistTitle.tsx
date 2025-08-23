'use client';
import { useState, useEffect, useRef } from 'react';
import { usePlaylistStore } from '@/store/playlistStore';
import { Pencil, Check } from 'lucide-react';

export function PlaylistTitle(){
  const { playlistName, setPlaylistName } = usePlaylistStore(s => ({
    playlistName: s.playlistName,
    setPlaylistName: s.setPlaylistName
  }));
  const [editing, setEditing] = useState(false);
  const [val, setVal] = useState(playlistName || 'Playlist');
  const ref = useRef<HTMLInputElement>(null);

  useEffect(()=> setVal(playlistName || 'Playlist'), [playlistName]);
  useEffect(()=> { if (editing) ref.current?.focus(); }, [editing]);

  return (
    <div className="flex items-center gap-2 ml-2">
      {!editing ? (
        <button
          className="text-xs px-3 py-1 rounded-full bg-white/5 ring-1 ring-white/10 hover:bg-white/10 transition inline-flex items-center gap-1"
          onClick={()=> setEditing(true)}
          aria-label="Renommer la playlist"
          title="Renommer">
          <Pencil className="w-3 h-3" /> Renommer
        </button>
      ) : (
        <form className="flex items-center gap-2" onSubmit={(e)=>{ e.preventDefault(); setPlaylistName(val.trim() || 'Playlist'); setEditing(false); }}>
          <input
            ref={ref}
            className="text-xs px-2 py-1 rounded-md bg-black/40 ring-1 ring-violet-500/40 outline-none focus:ring-violet-400/60"
            value={val}
            onChange={(e)=> setVal(e.target.value)}
            placeholder="Nom de la playlist"
            maxLength={80}
          />
          <button type="submit" className="text-xs px-2 py-1 rounded-md bg-violet-500/20 ring-1 ring-violet-400/40 hover:bg-violet-500/30 transition inline-flex items-center gap-1">
            <Check className="h-3 w-3" /> OK
          </button>
        </form>
      )}
    </div>
  );
}
