import { cn } from '@/lib/utils';
import { ButtonHTMLAttributes, ReactNode } from 'react';

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'secondary' | 'danger' | 'ghost';
  size?: 'sm' | 'md' | 'lg';
  icon?: ReactNode;
  loading?: boolean;
}

const variantStyles = {
  primary: 'bg-blue-600 hover:bg-blue-500 text-white border-blue-600 hover:border-blue-500',
  secondary: 'bg-slate-800 hover:bg-slate-700 text-slate-200 border-slate-700 hover:border-slate-600',
  danger: 'bg-red-600 hover:bg-red-500 text-white border-red-600 hover:border-red-500',
  ghost: 'bg-transparent hover:bg-slate-800 text-slate-300 border-transparent',
};

const sizeStyles = {
  sm: 'px-2.5 py-1.5 text-xs',
  md: 'px-4 py-2 text-sm',
  lg: 'px-6 py-2.5 text-base',
};

export default function Button({
  children,
  variant = 'primary',
  size = 'md',
  icon,
  loading,
  className,
  disabled,
  ...props
}: ButtonProps) {
  return (
    <button
      className={cn(
        'inline-flex items-center justify-center gap-2 border font-medium rounded transition-all duration-200',
        'focus:outline-none focus:ring-2 focus:ring-blue-500/50',
        'disabled:opacity-50 disabled:cursor-not-allowed',
        variantStyles[variant],
        sizeStyles[size],
        className
      )}
      disabled={disabled || loading}
      {...props}
    >
      {icon && <span className={cn(loading && 'animate-spin')}>{icon}</span>}
      {children}
    </button>
  );
}
