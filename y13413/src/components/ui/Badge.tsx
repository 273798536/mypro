import React from 'react';
import { cn } from '../../lib/utils';

export interface BadgeProps extends React.HTMLAttributes<HTMLSpanElement> {
  variant?: 'new' | 'skipped' | 'normal' | 'anomaly' | 'info';
  children?: React.ReactNode;
  className?: string;
}

const variantStyles = {
  new: 'bg-ink-50 text-ink-700 border-ink-200',
  skipped: 'bg-parchment-100 text-parchment-800 border-parchment-300',
  normal: 'bg-green-50 text-green-700 border-green-200',
  anomaly: 'bg-vermilion-50 text-vermilion-700 border-vermilion-200',
  info: 'bg-ink-50 text-ink-700 border-ink-200',
};

const Badge: React.FC<BadgeProps> = ({
  variant = 'normal',
  children,
  className,
  ...props
}) => {
  return (
    <span
      className={cn(
        'inline-flex items-center px-2.5 py-0.5 text-xs font-medium rounded-sm border',
        variantStyles[variant],
        className
      )}
      {...props}
    >
      {children}
    </span>
  );
};

export default Badge;
