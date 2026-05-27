import React from 'react';
import { cn } from '@/lib/utils';

interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'secondary' | 'ghost' | 'danger';
  size?: 'sm' | 'md' | 'lg';
  children: React.ReactNode;
}

const variants = {
  primary:
    'bg-blue-600 hover:bg-blue-500 text-white shadow-lg shadow-blue-500/25',
  secondary:
    'bg-white/10 hover:bg-white/20 text-white border border-white/20 backdrop-blur-sm',
  ghost: 'hover:bg-white/10 text-white/70 hover:text-white',
  danger:
    'bg-red-600 hover:bg-red-500 text-white shadow-lg shadow-red-500/25',
};

const sizes = {
  sm: 'px-3 py-1.5 text-sm',
  md: 'px-4 py-2 text-sm',
  lg: 'px-6 py-3 text-base',
};

export const Button: React.FC<ButtonProps> = ({
  variant = 'primary',
  size = 'md',
  className,
  children,
  ...props
}) => {
  return (
    <button
      className={cn(
        'inline-flex items-center justify-center rounded-lg font-medium transition-all duration-200 hover:scale-[1.02] active:scale-[0.98] disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:scale-100',
        variants[variant],
        sizes[size],
        className
      )}
      {...props}
    >
      {children}
    </button>
  );
};

export const IconButton: React.FC<
  Omit<ButtonProps, 'children'> & { icon: React.ReactNode; children?: React.ReactNode }
> = ({ icon, children, className, ...props }) => {
  return (
    <button
      className={cn(
        'p-2 rounded-lg transition-all duration-200 hover:bg-white/10 text-white/70 hover:text-white',
        className
      )}
      {...props}
    >
      {icon}
      {children}
    </button>
  );
};
