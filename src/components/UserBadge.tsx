// src/components/UserBadge.tsx
'use client';
import { useEffect, useState } from 'react';

type UserInfo = { name: string, avatar: string | null };

export function UserBadge(){
  const [info, setInfo] = useState<UserInfo | null>(null);

  useEffect(()=>{
    let alive = true;
    (async ()=>{
      try {
        const res = await fetch('/api/auth/spotify/me', { cache: 'no-store' });
        if (!res.ok) return;
        const js = await res.json();
        if (alive) setInfo(js);
      } catch {}
    })();
    return ()=>{ alive = false; };
  }, []);

  const name = info?.name || '—';
  const avatar = info?.avatar || '';

  return (
    <div className="relative flex items-center gap-3 px-3 py-2 rounded-full bg-white/7 ring-1 ring-white/10 backdrop-blur-md">
      <div className="pointer-events-none absolute inset-0 rounded-full bg-[radial-gradient(120px_60px_at_10%_-40%,rgba(168,85,247,.25),transparent)]" />
      <div className="h-8 w-8 rounded-full bg-white/20 overflow-hidden">
        {avatar ? <img src={avatar} alt="" className="h-full w-full object-cover" /> : null}
      </div>
      <div className="text-sm text-white/90 truncate max-w-[160px]">{name}</div>
    </div>
  );
}