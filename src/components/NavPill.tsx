'use client';
import Link from 'next/link';
import { motion } from 'framer-motion';
import { usePathname } from 'next/navigation';

export function NavPill(){
  const pathname = usePathname();
  const items = [
    { label: 'Slockly', href: '/app' },
    { label: 'Changelog', href: '/changelog' }
  ];
  return (
    <motion.nav
      id="slockly-nav"
      initial={{ opacity: 0, y: -6 }}
      animate={{ opacity: 1, y: 0 }}
      className="flex items-center gap-0 rounded-full bg-white/5 ring-1 ring-white/10 px-2 py-1 backdrop-blur-md shadow-[0_0_18px_rgba(167,139,250,.35)]"
    >
      {items.map((it)=> {
        const active = pathname === it.href;
        if (active){
          return (
            <span key={it.href} aria-current="page"
              className="px-3 py-1.5 rounded-full text-sm text-white/90 bg-white/10 cursor-default select-none">
              {it.label}
            </span>
          );
        }
        return (
          <Link key={it.href} href={it.href}
            className="px-3 py-1.5 rounded-full text-sm text-white/80 hover:text-white hover:bg-white/10 transition">
            {it.label}
          </Link>
        );
      })}
    </motion.nav>
  );
}
