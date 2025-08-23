
'use client';
import { motion } from 'framer-motion';
import * as React from 'react';

export function GlassCard({ children, className='' }: { children: React.ReactNode; className?: string; }){
  return (
    <motion.div initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: .35 }} className={`relative rounded-2xl p-4 bg-white/6 ring-1 ring-white/10 overflow-hidden ${className}`}>
      <div className="pointer-events-none absolute -inset-1 blur-2xl rounded-[20px] bg-[conic-gradient(from_30deg,rgba(167,139,250,0.14),rgba(236,72,153,0.12),transparent_60%)]" />
      <div className="pointer-events-none absolute inset-px rounded-[15px] bg-[radial-gradient(300px_200px_at_10%_-10%,rgba(168,85,247,0.18),transparent)] opacity-70" />
      {children}
    </motion.div>
  );
}
