'use client';
export function UserCard({ name, avatar }: { name?: string; avatar?: string; }){
  return (
    <div className="relative flex items-center gap-3 px-3 py-2 rounded-full bg-white/7 ring-1 ring-white/10 backdrop-blur-md">
      <div className="pointer-events-none absolute inset-0 rounded-full bg-[radial-gradient(120px_60px_at_10%_-40%,rgba(168,85,247,.25),transparent)]" />
      {avatar ? <img src={avatar} alt="" className="h-8 w-8 rounded-full ring-1 ring-white/20" /> : <div className="h-8 w-8 rounded-full bg-white/20" />}
      <div className="text-sm text-white/90">{name || '—'}</div>
    </div>
  );
}
