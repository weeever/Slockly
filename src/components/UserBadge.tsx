'use client';
import { useEffect, useState } from 'react';

type Me = { ok: boolean; name?: string; avatar?: string|null };

export function UserBadge(){
  const [me, setMe] = useState<Me|undefined>();
  useEffect(()=>{
    let aborted = false;
    (async ()=>{
      try{
        const r = await fetch('/api/auth/spotify/me', { cache:'no-store' });
        const js = await r.json();
        if (!aborted) setMe(js);
      }catch(e){
        if (!aborted) setMe({ ok:false });
      }
    })();
    return ()=>{ aborted = true; };
  }, []);

  const name = me?.ok ? (me?.name || '—') : '—';
  const avatar = (me?.ok && me?.avatar) ? me.avatar : null;

  return (
    <div className="relative flex items-center gap-3 px-3 py-2 rounded-full bg-white/7 ring-1 ring-white/10 backdrop-blur-md">
      <div className="pointer-events-none absolute inset-0 rounded-full bg-[radial-gradient(120px_60px_at_10%_-40%,rgba(168,85,247,.25),transparent)]"></div>
      <div className="h-8 w-8 rounded-full bg-white/20 overflow-hidden ring-1 ring-white/10">
        {avatar ? <img src={avatar} alt="" className="h-full w-full object-cover" /> : null}
      </div>
      <div className="text-sm text-white/90">{name}</div>
    </div>
  );
}
