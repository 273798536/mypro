import { forwardRef } from 'react';
import { cn } from '@/lib/utils';

interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'secondary' | 'success' | 'danger' | 'ghost';
  size?: 'sm' | 'md' | 'lg';
}

export const Button = forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant = 'primary', size = 'md', children, ...props }, ref) => {
    const baseStyles = 'font-medium rounded-lg transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed';

    const variants = {
      primary: 'bg-cyan-500 hover:bg-cyan-600 text-white focus:ring-cyan-500',
      secondary: 'bg-slate-700 hover:bg-slate-600 text-white focus:ring-slate-500',
      success: 'bg-green-500 hover:bg-green-600 text-white focus:ring-green-500',
      danger: 'bg-red-500 hover:bg-red-600 text-white focus:ring-red-500',
      ghost: 'bg-transparent hover:bg-slate-700/50 text-slate-300 focus:ring-slate-500'
    };

    const sizes = {
      sm: 'px-3 py-1.5 text-sm',
      md: 'px-4 py-2 text-base',
      lg: 'px-6 py-3 text-lg'
    };

    return (
      <button
        ref={ref}
        className={cn(baseStyles, variants[variant], sizes[size], className)}
        {...props}
      >
        {children}
      </button>
    );
  }
);

Button.displayName = 'Button';
