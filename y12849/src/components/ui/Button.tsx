import { ButtonHTMLAttributes, forwardRef } from 'react';
import { cn } from '../../lib/utils';

type ButtonVariant = 'primary' | 'secondary' | 'danger' | 'warning' | 'success' | 'ghost';
type ButtonSize = 'sm' | 'md' | 'lg';

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: ButtonVariant;
  size?: ButtonSize;
  loading?: boolean;
}

const variantClasses: Record<ButtonVariant, string> = {
  primary: 'bg-blue-600 text-white hover:bg-blue-700 focus:ring-blue-500/30',
  secondary: 'bg-gray-100 text-gray-700 hover:bg-gray-200 focus:ring-gray-400/30',
  danger: 'bg-red-600 text-white hover:bg-red-700 focus:ring-red-500/30',
  warning: 'bg-[#FF8C42] text-white hover:bg-orange-600 focus:ring-orange-500/30',
  success: 'bg-emerald-600 text-white hover:bg-emerald-700 focus:ring-emerald-500/30',
  ghost: 'bg-transparent text-gray-600 hover:bg-gray-100 focus:ring-gray-400/30',
};

const sizeClasses: Record<ButtonSize, string> = {
  sm: 'px-3 py-1.5 text-xs',
  md: 'px-4 py-2 text-sm',
  lg: 'px-6 py-3 text-base',
};

export const Button = forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant = 'primary', size = 'md', loading, disabled, children, style, ...props }, ref) => {
    const handleMouseEnter = (e: React.MouseEvent<HTMLButtonElement>) => {
      if (!disabled && !loading) {
        (e.currentTarget as HTMLButtonElement).style.transform = 'scale(1.01)';
      }
      props.onMouseEnter?.(e);
    };

    const handleMouseLeave = (e: React.MouseEvent<HTMLButtonElement>) => {
      (e.currentTarget as HTMLButtonElement).style.transform = '';
      props.onMouseLeave?.(e);
    };

    const handleMouseDown = (e: React.MouseEvent<HTMLButtonElement>) => {
      if (!disabled && !loading) {
        (e.currentTarget as HTMLButtonElement).style.transform = 'scale(0.99)';
      }
      props.onMouseDown?.(e);
    };

    const handleMouseUp = (e: React.MouseEvent<HTMLButtonElement>) => {
      (e.currentTarget as HTMLButtonElement).style.transform = 'scale(1.01)';
      props.onMouseUp?.(e);
    };

    return (
      <button
        ref={ref}
        className={cn(
          'inline-flex items-center justify-center gap-2 font-medium rounded-[2px]',
          'focus:outline-none focus:ring-2 focus:ring-offset-2',
          'disabled:opacity-50 disabled:cursor-not-allowed',
          'transition-all duration-200',
          variantClasses[variant],
          sizeClasses[size],
          className
        )}
        disabled={disabled || loading}
        onMouseEnter={handleMouseEnter}
        onMouseLeave={handleMouseLeave}
        onMouseDown={handleMouseDown}
        onMouseUp={handleMouseUp}
        style={{ transition: 'all 0.2s ease', ...style }}
        {...props}
      >
        {loading && (
          <svg className="animate-spin h-4 w-4" viewBox="0 0 24 24">
            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
          </svg>
        )}
        {children}
      </button>
    );
  }
);

Button.displayName = 'Button';
