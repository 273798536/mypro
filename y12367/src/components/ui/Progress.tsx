import * as React from 'react';
import { cn } from '@/lib/utils';

interface ProgressProps extends React.HTMLAttributes<HTMLDivElement> {
  value: number;
  max?: number;
  showLabel?: boolean;
  variant?: 'default' | 'success' | 'warning' | 'danger';
  size?: 'sm' | 'md' | 'lg';
}

export const Progress = React.forwardRef<HTMLDivElement, ProgressProps>(
  ({ className, value, max = 100, showLabel, variant = 'default', size = 'md', ...props }, ref) => {
    const percentage = Math.min(Math.max((value / max) * 100, 0), 100);

    const variants = {
      default: 'bg-blue-500',
      success: 'bg-green-500',
      warning: 'bg-yellow-500',
      danger: 'bg-red-500',
    };

    const sizes = {
      sm: 'h-1',
      md: 'h-2',
      lg: 'h-3',
    };

    return (
      <div ref={ref} className={cn('w-full', className)} {...props}>
        <div className={cn('w-full bg-industrial-bg-dark rounded-full overflow-hidden', sizes[size])}>
          <div
            className={cn('h-full transition-all duration-300 rounded-full', variants[variant])}
            style={{ width: `${percentage}%` }}
          />
        </div>
        {showLabel && (
          <div className="flex justify-between mt-1 text-xs text-industrial-text-muted">
            <span>{value.toFixed(1)}</span>
            <span>{max}</span>
          </div>
        )}
      </div>
    );
  }
);

Progress.displayName = 'Progress';
