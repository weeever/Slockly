'use client';
import { motion } from 'framer-motion';
import Link from 'next/link';

export default function Changelog(){
  return (
    <main className="max-w-3xl mx-auto px-4 py-10 space-y-10">
      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-bold">Changelog</h1>
        <Link href="/app" className="text-violet-300 hover:text-violet-200 underline">← Retour à Slockly</Link>
      </div>

      <motion.section
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        className="rounded-2xl bg-white/5 ring-1 ring-white/10 p-6 backdrop-blur-md"
      >
        <div className="flex items-center justify-between mb-2">
          <h2 className="text-xl font-semibold">v0.0.1</h2>
          <span className="text-xs text-white/60">Initial public alpha</span>
        </div>
        <ul className="list-disc pl-5 space-y-2 text-white/90">
          <li>Login Spotify OAuth PKCE + refresh token (cookies httpOnly).</li>
          <li>Génération de playlists pilotée par IA uniquement (OpenAI → Gemini → OpenRouter → Ollama) — pas d’heuristiques.</li>
          <li>Exclusions strictes (artistes/genres), anti-parodie si demandé.</li>
          <li>Dé-doublonnage des titres et respect de N ± 2.</li>
          <li>Préviews audio avec fallback Spotify → iTunes → Deezer (~30s), player flottant, volume et seek.</li>
          <li>Drag & drop des titres + suppression inline.</li>
          <li>UI dark neon/glass, micro-animations, responsive.</li>
          <li>Changelog dédié, bouton « Retour à Slockly ».</li>
        </ul>
      </motion.section>
    </main>
  );
}
