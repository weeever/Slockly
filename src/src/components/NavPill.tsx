'use client';
import { motion } from 'framer-motion';

export function NavPill(){
  const items = ['About', 'Services', 'Slockly', 'Work', 'Contact'];
  return (
    <motion.nav initial={{ opacity: 0, y: -6 }} animate={{ opacity: 1, y: 0 }} className="hidden md:flex items-center gap-0 rounded-full bg-white/5 ring-1 ring-white/10 px-2 py-1 backdrop-blur-md">
      {items.map((x,i)=> (
        <button key={x} className={`px-3 py-1.5 rounded-full text-sm text-white/70 hover:text-white hover:bg-white/10 transition ${i===2 ? 'bg-white/10 text-white shadow-[0_0_18px_rgba(167,139,250,.35)]' : ''}`}>
          {x}
        </button>
      ))}
    </motion.nav>
  );
}
