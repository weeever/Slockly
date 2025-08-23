'use client';
import { usePathname } from 'next/navigation';
import { NavPill } from '@/components/NavPill';

export function NavMount(){
  const p = usePathname();
  if (p === '/') return null;
  return <NavPill />;
}
