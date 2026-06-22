import React from 'react';
import { cn } from '../../lib/utils';

export interface StatusDotProps {
  status: 'success' | 'warning' | 'error' | 'info' | 'pending';
  label?: string;
  className?: string;
}

const statusColors = {
  success: 'bg-green-500',
  warning: 'bg-yellow-500',
  error: 'bg-vermilion-500',
  info: 'bg-ink-500',
  pending: 'bg-charcoal-400',
};

const StatusDot: React.FC<StatusDotProps> = ({ status, label, className }) => {
  return (
    <div className={cn('flex items-center gap-2', className)}>
      <span className="relative flex h-2.5 w-2.5">
        <span
          className={cn(
            'absolute inline-flex h-full w-full rounded-full opacity-60 animate-pulse-soft',
            statusColors[status]
          )}
        />
        <span
          className={cn(
            'relative inline-flex rounded-full h-2.5 w-2.5',
            statusColors[status]
          )}
        />
      </span>
      {label && (
        <span className="text-sm text-charcoal-600 font-mono">{label}</span>
      )}
    </div>
  );
};

export default StatusDot;
