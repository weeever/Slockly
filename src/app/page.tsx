import Link from 'next/link';

export default function HomePage(){
  return (
    <main className="min-h-screen relative overflow-hidden">
      <div className="pointer-events-none absolute inset-0">
        <div className="absolute -top-40 left-1/2 -translate-x-1/2 h-[540px] w-[540px] rounded-full blur-3xl opacity-40"
             style={{ background: 'radial-gradient(50% 50% at 50% 50%, rgba(168,85,247,.35) 0%, rgba(0,0,0,0) 70%)' }} />
        <div className="absolute -bottom-40 right-1/2 translate-x-1/2 h-[460px] w-[460px] rounded-full blur-3xl opacity-30"
             style={{ background: 'radial-gradient(50% 50% at 50% 50%, rgba(236,72,153,.35) 0%, rgba(0,0,0,0) 70%)' }} />
      </div>

      <section className="relative max-w-5xl mx-auto px-6 pt-36 text-center">
        <h1 className="text-4xl md:text-6xl font-semibold tracking-tight">
          Slockly <span className="text-transparent bg-clip-text bg-gradient-to-r from-pink-400 to-violet-400">Playlist AI</span>
        </h1>
        <p className="mt-4 text-white/70 max-w-2xl mx-auto">
          Décris un mood. Obtiens une playlist. Envoie-la sur Spotify.
        </p>

        <div className="mt-10 flex flex-wrap items-center justify-center gap-3">
          <a className="btn-primary" href="/api/auth/spotify/login">Se connecter à Spotify</a>
          <Link className="btn-ghost" href="/changelog">Découvrir</Link>
        </div>
      </section>
    </main>
  );
}
