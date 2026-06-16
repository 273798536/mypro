import { forwardRef } from 'react';
import { cn } from '@/lib/utils';
import type { ButtonHTMLAttributes, ReactNode } from 'react';

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'secondary' | 'danger' | 'ghost' | 'outline';
  size?: 'sm' | 'md' | 'lg';
  leftIcon?: ReactNode;
  rightIcon?: ReactNode;
}

const Button = forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant = 'primary', size = 'md', leftIcon, rightIcon, children, disabled, ...props }, ref) => {
    const variants = {
      primary: 'bg-primary-800 text-white hover:bg-primary-700 active:bg-primary-900 shadow-card hover:shadow-card-hover',
      secondary: 'bg-surface-secondary text-text-primary hover:bg-primary-50 border border-primary-200',
      danger: 'bg-accent-500 text-white hover:bg-accent-600 active:bg-accent-700',
      ghost: 'text-text-secondary hover:bg-surface-secondary hover:text-text-primary',
      outline: 'border-2 border-primary-800 text-primary-800 hover:bg-primary-50',
    };

    const sizes = {
      sm: 'px-3 py-1.5 text-sm gap-1.5',
      md: 'px-4 py-2 text-sm gap-2',
      lg: 'px-6 py-3 text-base gap-2',
    };

    return (
      <button
        ref={ref}
        disabled={disabled}
        className={cn(
          'inline-flex items-center justify-center rounded-lg font-medium transition-all duration-200',
          'focus:outline-none focus:ring-2 focus:ring-primary-400 focus:ring-offset-2',
          'disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:shadow-none',
          variants[variant],
          sizes[size],
          className
        )}
        {...props}
      >
        {leftIcon}
        {children}
        {rightIcon}
      </button>
    );
  }
);

Button.displayName = 'Button';

export default Button;
