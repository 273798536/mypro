import React from 'react';

interface ButtonProps {
  children: React.ReactNode;
  onClick?: (e: React.MouseEvent) => void;
  variant?: 'primary' | 'secondary' | 'danger' | 'success' | 'warning';
  size?: 'sm' | 'md' | 'lg';
  disabled?: boolean;
  className?: string;
}

export const Button: React.FC<ButtonProps> = ({
  children,
  onClick,
  variant = 'primary',
  size = 'md',
  disabled = false,
  className = '',
}) => {
  const baseStyles = 'font-mono font-medium transition-all duration-200 rounded border-2 focus:outline-none focus:ring-2 focus:ring-opacity-50 disabled:opacity-50 disabled:cursor-not-allowed';

  const variants = {
    primary: 'bg-dispatch-primary border-dispatch-primary text-white hover:bg-blue-600 focus:ring-blue-400',
    secondary: 'bg-transparent border-dispatch-border text-dispatch-text hover:bg-dispatch-panel focus:ring-dispatch-border',
    danger: 'bg-dispatch-danger border-dispatch-danger text-white hover:bg-red-600 focus:ring-red-400',
    success: 'bg-dispatch-success border-dispatch-success text-white hover:bg-emerald-600 focus:ring-emerald-400',
    warning: 'bg-dispatch-warning border-dispatch-warning text-white hover:bg-amber-600 focus:ring-amber-400',
  };

  const sizes = {
    sm: 'px-2 py-1 text-xs',
    md: 'px-4 py-2 text-sm',
    lg: 'px-6 py-3 text-base',
  };

  return (
    <button
      onClick={onClick}
      disabled={disabled}
      className={`${baseStyles} ${variants[variant]} ${sizes[size]} ${className}`}
    >
      {children}
    </button>
  );
};
