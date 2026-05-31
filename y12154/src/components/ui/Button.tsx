import React from 'react';
import { cn } from '../../lib/utils';

type ButtonVariant = 'primary' | 'secondary' | 'outline' | 'ghost' | 'danger' | 'success';
type ButtonSize = 'sm' | 'md' | 'lg';

interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: ButtonVariant;
  size?: ButtonSize;
  isLoading?: boolean;
  leftIcon?: React.ReactNode;
  rightIcon?: React.ReactNode;
  asChild?: boolean;
}

export const Button: React.FC<ButtonProps> = ({
  variant = 'primary',
  size = 'md',
  isLoading = false,
  leftIcon,
  rightIcon,
  children,
  className,
  disabled,
  asChild = false,
  ...props
}) => {
  const variantClasses: Record<ButtonVariant, string> = {
    primary: 'bg-blue-900 text-white hover:bg-blue-800 focus:ring-blue-900/20',
    secondary: 'bg-slate-600 text-white hover:bg-slate-500 focus:ring-slate-600/20',
    outline: 'border border-slate-300 text-slate-700 hover:bg-slate-50 focus:ring-slate-600/20',
    ghost: 'text-slate-600 hover:bg-slate-100 focus:ring-slate-600/20',
    danger: 'bg-red-600 text-white hover:bg-red-500 focus:ring-red-600/20',
    success: 'bg-emerald-600 text-white hover:bg-emerald-500 focus:ring-emerald-600/20',
  };

  const sizeClasses: Record<ButtonSize, string> = {
    sm: 'px-3 py-1.5 text-sm',
    md: 'px-4 py-2 text-sm',
    lg: 'px-6 py-3 text-base',
  };

  const buttonClasses = cn(
    'inline-flex items-center justify-center font-medium rounded-md transition-all duration-200',
    'focus:outline-none focus:ring-2 focus:ring-offset-2',
    'disabled:opacity-50 disabled:cursor-not-allowed',
    variantClasses[variant],
    sizeClasses[size],
    isLoading && 'cursor-wait',
    className
  );

  if (asChild && React.isValidElement(children)) {
    return React.cloneElement(children as React.ReactElement<any>, {
      className: cn(buttonClasses, (children as React.ReactElement<any>).props.className),
      ...props,
    });
  }

  return (
    <button
      className={buttonClasses}
      disabled={disabled || isLoading}
      {...props}
    >
      {isLoading && (
        <svg
          className="animate-spin -ml-1 mr-2 h-4 w-4"
          fill="none"
          viewBox="0 0 24 24"
        >
          <circle
            className="opacity-25"
            cx="12"
            cy="12"
            r="10"
            stroke="currentColor"
            strokeWidth="4"
          />
          <path
            className="opacity-75"
            fill="currentColor"
            d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
          />
        </svg>
      )}
      {!isLoading && leftIcon && <span className="mr-2">{leftIcon}</span>}
      {children}
      {rightIcon && <span className="ml-2">{rightIcon}</span>}
    </button>
  );
};
