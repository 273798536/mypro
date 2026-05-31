import type { ButtonHTMLAttributes, ReactNode } from 'react';
import { forwardRef } from 'react';
import { cn } from '@/lib/utils';

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'secondary' | 'danger' | 'success' | 'ghost';
  size?: 'sm' | 'md' | 'lg';
  children: ReactNode;
}

export const Button = forwardRef<HTMLButtonElement, ButtonProps>(
  ({ variant = 'primary', size = 'md', className, children, ...props }, ref) => {
    const baseStyles = 'inline-flex items-center justify-center font-medium rounded-lg transition-all duration-200 active:scale-95 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-offset-primary-900';
    
    const variantStyles = {
      primary: 'bg-accent-500 text-white hover:bg-accent-600 focus:ring-accent-400 shadow-lg hover:shadow-xl',
      secondary: 'bg-white/10 text-white border border-white/20 hover:bg-white/20 focus:ring-white/30',
      danger: 'bg-danger-500 text-white hover:bg-danger-600 focus:ring-danger-400 shadow-lg hover:shadow-xl',
      success: 'bg-success-500 text-white hover:bg-success-600 focus:ring-success-400 shadow-lg hover:shadow-xl',
      ghost: 'bg-transparent text-white hover:bg-white/10 focus:ring-white/20',
    };

    const sizeStyles = {
      sm: 'px-3 py-1.5 text-sm',
      md: 'px-5 py-2.5 text-base',
      lg: 'px-8 py-4 text-lg',
    };

    return (
      <button
        ref={ref}
        className={cn(baseStyles, variantStyles[variant], sizeStyles[size], className)}
        {...props}
      >
        {children}
      </button>
    );
  }
);

Button.displayName = 'Button';
