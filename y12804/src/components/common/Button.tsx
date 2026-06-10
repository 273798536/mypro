import type { ButtonHTMLAttributes, ReactNode } from 'react';
import { cn } from '@/lib/utils';

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'secondary' | 'outline' | 'ghost' | 'danger';
  size?: 'sm' | 'md' | 'lg';
  leftIcon?: ReactNode;
  rightIcon?: ReactNode;
}

export default function Button({
  variant = 'primary',
  size = 'md',
  leftIcon,
  rightIcon,
  children,
  className = '',
  disabled,
  ...props
}: ButtonProps) {
  const baseStyles =
    'inline-flex items-center justify-center gap-2 font-medium transition-all duration-200 rounded-md focus:outline-none focus:ring-2 focus:ring-offset-1 disabled:opacity-50 disabled:cursor-not-allowed';

  const variantStyles = {
    primary:
      'bg-medical-600 text-white hover:bg-medical-700 focus:ring-medical-500 active:bg-medical-800',
    secondary:
      'bg-primary-100 text-primary-700 hover:bg-primary-200 focus:ring-primary-400 active:bg-primary-300',
    outline:
      'border border-neutral-300 bg-white text-neutral-700 hover:bg-neutral-50 focus:ring-neutral-400',
    ghost:
      'text-neutral-600 hover:bg-neutral-100 focus:ring-neutral-400',
    danger:
      'bg-red-500 text-white hover:bg-red-600 focus:ring-red-400 active:bg-red-700',
  };

  const sizeStyles = {
    sm: 'px-3 py-1.5 text-xs',
    md: 'px-4 py-2 text-sm',
    lg: 'px-6 py-2.5 text-base',
  };

  return (
    <button
      className={cn(
        baseStyles,
        variantStyles[variant],
        sizeStyles[size],
        className
      )}
      disabled={disabled}
      {...props}
    >
      {leftIcon && <span className="w-4 h-4">{leftIcon}</span>}
      {children}
      {rightIcon && <span className="w-4 h-4">{rightIcon}</span>}
    </button>
  );
}
