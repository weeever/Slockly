
'use client';
export function UserBadge({ name, avatar }: { name?: string; avatar?: string; }){
  return (
    <div className="relative flex items-center gap-3 px-3 py-2 rounded-2xl bg-white/5 ring-1 ring-white/10 overflow-hidden">
      <div className="pointer-events-none absolute -inset-1 blur-xl rounded-[18px] bg-[radial-gradient(140px_80px_at_0%_0%,rgba(167,139,250,0.25),transparent)]" />
      {avatar ? <img src={avatar} alt="" className="h-8 w-8 rounded-full ring-1 ring-white/20" /> : <div className="h-8 w-8 rounded-full bg-violet-500/30 ring-1 ring-violet-400/40" />}
      <div className="flex flex-col">
        <span className="text-sm font-medium text-white/90">{name || 'User'}</span>
        <span className="text-xs text-white/60">Spotify</span>
      </div>
    </div>
  );
}
