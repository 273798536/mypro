import React from 'react';
import clsx from 'clsx';

type BadgeVariant = 'default' | 'success' | 'warning' | 'danger' | 'info' | 'boundary';

interface BadgeProps {
  children: React.ReactNode;
  variant?: BadgeVariant;
  className?: string;
}

const variantClasses: Record<BadgeVariant, string> = {
  default: 'bg-paper-100 text-paper-700 border-paper-200',
  success: 'bg-moss-green-100 text-moss-green-700 border-moss-green-200',
  warning: 'bg-warm-orange-100 text-warm-orange-700 border-warm-orange-200',
  danger: 'bg-rust-red-100 text-rust-red-700 border-rust-red-200',
  info: 'bg-deep-sea-100 text-deep-sea-700 border-deep-sea-200',
  boundary: 'bg-warm-orange-50 text-warm-orange-700 border-warm-orange-300 border-dashed',
};

export const Badge: React.FC<BadgeProps> = ({ children, variant = 'default', className }) => {
  return (
    <span
      className={clsx(
        'inline-flex items-center px-2.5 py-0.5 text-xs font-medium rounded border',
        variantClasses[variant],
        className
      )}
    >
      {children}
    </span>
  );
};
