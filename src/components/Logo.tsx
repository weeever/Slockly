'use client';
export function Logo({ className='' }: { className?: string }){
  return (
    <div className={`relative ${className}`}>
      <img src="/logo.svg" alt="Slockly" className="h-8 w-8" />
    </div>
  );
}
