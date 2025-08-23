'use client';
import * as React from 'react';

export type ButtonProps = React.ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: 'default' | 'ghost' | 'outline';
  size?: 'sm' | 'md' | 'lg';
};

const variants = {
  default: 'bg-violet-600/80 hover:bg-violet-500 text-white ring-1 ring-violet-500/40',
  ghost: 'bg-transparent hover:bg-white/10 text-white ring-1 ring-white/10',
  outline: 'bg-transparent hover:bg-white/10 text-white ring-1 ring-violet-500/40'
};

const sizes = {
  sm: 'h-9 px-3 text-sm rounded-xl',
  md: 'h-10 px-4 text-sm rounded-xl',
  lg: 'h-11 px-5 text-base rounded-2xl'
};

export const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className = '', variant = 'default', size = 'md', ...props }, ref) => {
    const cls = `inline-flex items-center justify-center transition-colors relative overflow-hidden focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-violet-500/50 disabled:opacity-50 disabled:pointer-events-none ${variants[variant]} ${sizes[size]} ${className}`;
    return (
  <button ref={ref} className={cls} {...props}>
    <span className="pointer-events-none absolute inset-0 opacity-0 hover:opacity-100 transition-opacity bg-[radial-gradient(200px_120px_at_50%_120%,rgba(167,139,250,.25),transparent)]" />
    {props.children}
  </button>
);
  }
);
Button.displayName = 'Button';
