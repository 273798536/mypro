import React from 'react';
import { Loader2 } from 'lucide-react';

type Variant = 'primary' | 'secondary' | 'ghost' | 'danger' | 'success' | 'warn';
type Size = 'sm' | 'md' | 'lg';

interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: Variant;
  size?: Size;
  loading?: boolean;
  icon?: React.ReactNode;
}

const variantClass: Record<Variant, string> = {
  primary: 'bg-primary-600 text-white border-primary-600 hover:bg-primary-700 hover:border-primary-700 focus:ring-primary-500',
  secondary: 'bg-white text-primary-600 border-primary-600 hover:bg-primary-50 focus:ring-primary-400',
  ghost: 'bg-transparent text-gray-700 border-transparent hover:bg-gray-100 focus:ring-gray-300',
  danger: 'bg-red-600 text-white border-red-600 hover:bg-red-700 focus:ring-red-400',
  success: 'bg-emerald-600 text-white border-emerald-600 hover:bg-emerald-700 focus:ring-emerald-400',
  warn: 'bg-amber-600 text-white border-amber-600 hover:bg-amber-700 focus:ring-amber-400',
};

const sizeClass: Record<Size, string> = {
  sm: 'px-3 py-1.5 text-xs gap-1.5',
  md: 'px-4 py-2 text-sm gap-2',
  lg: 'px-6 py-3 text-base gap-2',
};

export const Button: React.FC<ButtonProps> = ({
  children,
  variant = 'primary',
  size = 'md',
  loading = false,
  icon,
  className = '',
  disabled,
  ...rest
}) => {
  return (
    <button
      {...rest}
      disabled={disabled || loading}
      className={[
        'btn-interactive inline-flex items-center justify-center border-2 font-medium rounded-none',
        'focus:outline-none focus:ring-2 focus:ring-offset-1 transition-all duration-150',
        'disabled:opacity-50 disabled:cursor-not-allowed disabled:transform-none disabled:shadow-none',
        variantClass[variant],
        sizeClass[size],
        className,
      ].join(' ')}
    >
      {loading ? (
        <Loader2 className={`w-${size === 'sm' ? 3.5 : size === 'lg' ? 5 : 4} h-${size === 'sm' ? 3.5 : size === 'lg' ? 5 : 4} animate-spin`} />
      ) : (
        icon
      )}
      {children}
    </button>
  );
};
