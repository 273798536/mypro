import { forwardRef, ButtonHTMLAttributes, ReactNode } from 'react';
import { cn } from '@/lib/utils';
import { Loader2 } from 'lucide-react';

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'secondary' | 'danger' | 'ghost' | 'outline';
  size?: 'sm' | 'md' | 'lg';
  loading?: boolean;
  isLoading?: boolean;
  icon?: ReactNode;
}

export const Button = forwardRef<HTMLButtonElement, ButtonProps>(({
  className,
  variant = 'primary',
  size = 'md',
  loading = false,
  isLoading = false,
  icon,
  children,
  disabled,
  ...props
}, ref) => {
  const isActuallyLoading = loading || isLoading;
  const variants = {
    primary: 'bg-[#0F3460] text-white hover:bg-[#1a4a7a] active:bg-[#0a2442]',
    secondary: 'bg-[#533483] text-white hover:bg-[#6a46a0] active:bg-[#3d2560]',
    danger: 'bg-[#E94560] text-white hover:bg-[#ee6a7f] active:bg-[#c73650]',
    ghost: 'bg-transparent text-[#0F3460] hover:bg-[#0F3460]/10 active:bg-[#0F3460]/20',
    outline: 'bg-transparent border-2 border-[#0F3460] text-[#0F3460] hover:bg-[#0F3460]/10',
  };
  
  const sizes = {
    sm: 'px-3 py-1.5 text-sm',
    md: 'px-4 py-2 text-base',
    lg: 'px-6 py-3 text-lg',
  };
  
  return (
    <button
      ref={ref}
      className={cn(
        'inline-flex items-center justify-center gap-2 font-medium rounded-md',
        'transition-all duration-200 ease-in-out',
        'disabled:opacity-50 disabled:cursor-not-allowed',
        'focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-[#0F3460]/50',
        variants[variant],
        sizes[size],
        className
      )}
      disabled={disabled || isActuallyLoading}
      {...props}
    >
      {isActuallyLoading && <Loader2 className="w-4 h-4 animate-spin" />}
      {!isActuallyLoading && icon}
      {children}
    </button>
  );
});

Button.displayName = 'Button';
