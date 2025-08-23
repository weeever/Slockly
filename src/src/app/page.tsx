'use client';

import Image from 'next/image';
import Link from 'next/link';
import { motion } from 'framer-motion';

export default function Home() {
  return (
    <main className="min-h-screen">
      <header className="flex items-center justify-between px-6 py-4">
        <div className="flex items-center gap-3">
          <Image src="/logo.svg" alt="Slockly" width={36} height={36} />
          <span className="text-lg font-semibold tracking-wide">Slockly</span>
        </div>
        <a href="/api/auth/spotify/login" className="btn-primary">Se connecter avec Spotify</a>
      </header>

      <section className="mx-auto max-w-6xl px-6 py-16 grid md:grid-cols-2 gap-10 items-center">
        <div>
          <motion.h1 initial={{opacity:0, y:20}} animate={{opacity:1, y:0}} transition={{duration:.6}}
            className="text-4xl md:text-6xl font-extrabold leading-tight">
            More Than <span className="text-brand-400">Just</span> a Playlist
          </motion.h1>
          <p className="mt-6 text-white/70 max-w-prose">
            Décrivez un mood, définissez des exclusions, et laissez l’IA composer une playlist sans doublons.
            Pré-écoutez les extraits, ajustez, puis envoyez-la sur votre compte Spotify.
          </p>
          <div className="mt-8 flex gap-3">
            <a href="/api/auth/spotify/login" className="btn-primary">Se connecter</a>
            <Link className="btn-secondary" href="#features">Découvrir</Link>
          </div>
        </div>
        <motion.div initial={{opacity:0, scale:.97}} animate={{opacity:1, scale:1}} transition={{duration:.6, delay:.1}}
          className="neon-card p-6">
          <div className="h-72 rounded-xl bg-gradient-to-br from-brand-600/20 to-cyan-500/10 flex items-center justify-center">
            <span className="text-white/70">UI sombre néon / glassmorphism</span>
          </div>
          <div className="grid grid-cols-2 gap-4 mt-4">
            {[
              'Timely Execution','Proven Results','Expertise Impact','Custom Approach'
            ].map((t, i)=>(<div key={i} className="neon-card p-4">
              <div className="text-white/90 font-medium">{t}</div>
              <div className="text-white/50 text-sm mt-1">Micro-animations, toasts & confetti</div>
            </div>))}
          </div>
        </motion.div>
      </section>

      <footer className="px-6 py-6 text-white/60 text-sm">
        Fait avec Next.js 14, Tailwind, Zustand, Framer Motion et shadcn/ui.
      </footer>
    </main>
  );
}
