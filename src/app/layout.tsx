import type { Metadata } from 'next';
import './globals.css';

export const metadata: Metadata = {
  title: 'Slockly',
  description: 'AI-powered playlist maker'
};

export default function RootLayout({ children }: { children: React.ReactNode }){
  return (
    <html lang="fr" className="dark">
      <body className="min-h-dvh bg-gradient-to-b from-[#0a0615] to-[#0a1128] text-white">
        {children}
      </body>
    </html>
  );
}
