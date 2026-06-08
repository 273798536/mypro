import { ButtonHTMLAttributes, forwardRef } from 'react';
import { cn } from '@/lib/utils';

type ButtonVariant = 'primary' | 'secondary' | 'ghost' | 'danger' | 'outline';
type ButtonSize = 'sm' | 'md' | 'lg';

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: ButtonVariant;
  size?: ButtonSize;
}

const variantStyles: Record<ButtonVariant, string> = {
  primary: 'bg-cyan-600 hover:bg-cyan-500 text-white border-cyan-600 hover:border-cyan-500',
  secondary: 'bg-slate-700 hover:bg-slate-600 text-slate-100 border-slate-700 hover:border-slate-600',
  ghost: 'bg-transparent hover:bg-slate-800 text-slate-300 border-transparent hover:border-slate-700',
  danger: 'bg-rose-600 hover:bg-rose-500 text-white border-rose-600 hover:border-rose-500',
  outline: 'bg-transparent text-slate-200 border-slate-600 hover:border-slate-500 hover:bg-slate-800',
};

const sizeStyles: Record<ButtonSize, string> = {
  sm: 'px-2.5 py-1.5 text-xs',
  md: 'px-3.5 py-2 text-sm',
  lg: 'px-5 py-2.5 text-base',
};

const Button = forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant = 'primary', size = 'md', ...props }, ref) => {
    return (
      <button
        ref={ref}
        className={cn(
          'inline-flex items-center justify-center gap-1.5 font-medium rounded-md border transition-colors disabled:opacity-50 disabled:cursor-not-allowed focus:outline-none focus:ring-2 focus:ring-cyan-500/30',
          variantStyles[variant],
          sizeStyles[size],
          className
        )}
        {...props}
      />
    );
  }
);

Button.displayName = 'Button';

export default Button;
