
'use client';
import { motion } from 'framer-motion';

export function NeonBackground(){
  return (
    <div className="pointer-events-none fixed inset-0 -z-10">
      <div className="absolute inset-0 bg-[#0a0713]" />
      <div className="absolute inset-0 bg-[radial-gradient(800px_400px_at_70%_0%,rgba(139,92,246,0.25),transparent)]" />
      <div className="absolute inset-0 bg-[radial-gradient(700px_380px_at_20%_15%,rgba(236,72,153,0.2),transparent)]" />
      <div className="absolute inset-0 bg-[radial-gradient(900px_600px_at_50%_120%,rgba(99,102,241,0.22),transparent)]" />
      <div className="absolute inset-0 opacity-[0.06]" style={{backgroundImage:'radial-gradient(circle at 1px 1px, #fff 1px, transparent 0)',backgroundSize:'28px 28px'}}/>
      <motion.div className="absolute left-1/2 top-1/3 -translate-x-1/2 -translate-y-1/2 size-[520px] rounded-full border border-violet-500/20" initial={{ rotate: 0 }} animate={{ rotate: 360 }} transition={{ duration: 60, repeat: Infinity, ease: 'linear' }} />
      <motion.div className="absolute left-1/2 top-1/3 -translate-x-1/2 -translate-y-1/2 size-[700px] rounded-full border border-fuchsia-500/10" initial={{ rotate: 0 }} animate={{ rotate: -360 }} transition={{ duration: 120, repeat: Infinity, ease: 'linear' }} />
      <motion.div className="absolute size-[280px] rounded-full bg-violet-500/12 blur-3xl" initial={{ x: -240, y: 160 }} animate={{ x: 40, y: -40 }} transition={{ duration: 16, repeat: Infinity, repeatType: 'reverse', ease: 'easeInOut' }}/>
      <motion.div className="absolute right-8 top-20 size-[220px] rounded-full bg-fuchsia-500/12 blur-3xl" initial={{ x: 0, y: 0 }} animate={{ x: -100, y: 60 }} transition={{ duration: 22, repeat: Infinity, repeatType: 'reverse', ease: 'easeInOut' }}/>
      <div className="absolute inset-0 opacity-[0.05] mix-blend-overlay" style={{backgroundImage:'url(data:image/svg+xml;utf8,<svg xmlns=%22http://www.w3.org/2000/svg%22 width=%22200%22 height=%22200%22><filter id=%22n%22><feTurbulence type=%22fractalNoise%22 baseFrequency=%220.9%22 numOctaves=%222%22/></filter><rect width=%22200%22 height=%22200%22 filter=%22url(%23n)%22/></svg>)'}} />
    </div>
  );
}
