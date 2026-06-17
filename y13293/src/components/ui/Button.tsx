import { cn } from '@/lib/utils';
import type { ReactNode, ButtonHTMLAttributes } from 'react';

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'secondary' | 'danger' | 'ghost';
  size?: 'sm' | 'md' | 'lg';
  children: ReactNode;
}

export function Button({
  variant = 'primary',
  size = 'md',
  className,
  children,
  ...props
}: ButtonProps) {
  const variants = {
    primary:
      'bg-slate-800 text-white border-2 border-slate-800 hover:bg-slate-700 hover:border-slate-700',
    secondary:
      'bg-white text-slate-700 border-2 border-slate-300 hover:bg-slate-50 hover:border-slate-400',
    danger:
      'bg-red-600 text-white border-2 border-red-600 hover:bg-red-700 hover:border-red-700',
    ghost: 'bg-transparent text-slate-600 border-2 border-transparent hover:bg-slate-100',
  };
  const sizes = {
    sm: 'px-3 py-1.5 text-xs',
    md: 'px-4 py-2 text-sm',
    lg: 'px-6 py-3 text-base',
  };
  return (
    <button
      className={cn(
        'font-medium rounded transition-all disabled:opacity-50 disabled:cursor-not-allowed',
        variants[variant],
        sizes[size],
        className,
      )}
      {...props}
    >
      {children}
    </button>
  );
}
