import React from 'react';
import { cn } from '@/lib/utils';

interface GaugeMeterProps {
  value: number;
  min: number;
  max: number;
  label: string;
  unit: string;
  warningThreshold?: number;
  dangerThreshold?: number;
  className?: string;
}

export const GaugeMeter: React.FC<GaugeMeterProps> = ({
  value,
  min,
  max,
  label,
  unit,
  warningThreshold,
  dangerThreshold,
  className,
}) => {
  const percentage = ((value - min) / (max - min)) * 100;
  const clampedPercentage = Math.max(0, Math.min(100, percentage));

  let status: 'normal' | 'warning' | 'danger' = 'normal';
  if (dangerThreshold !== undefined && Math.abs(value) >= dangerThreshold) {
    status = 'danger';
  } else if (warningThreshold !== undefined && Math.abs(value) >= warningThreshold) {
    status = 'warning';
  }

  const statusColors = {
    normal: {
      bar: 'bg-emerald-500',
      text: 'text-emerald-400',
      glow: 'shadow-emerald-500/50',
    },
    warning: {
      bar: 'bg-amber-500',
      text: 'text-amber-400',
      glow: 'shadow-amber-500/50',
    },
    danger: {
      bar: 'bg-red-500',
      text: 'text-red-400',
      glow: 'shadow-red-500/50',
    },
  };

  const colors = statusColors[status];

  return (
    <div className={cn('flex flex-col items-center', className)}>
      <span className="text-xs text-slate-400 mb-1 font-medium">{label}</span>
      <div className="relative w-full h-16">
        <svg viewBox="0 0 100 50" className="w-full h-full">
          <path
            d="M 10 45 A 40 40 0 0 1 90 45"
            fill="none"
            stroke="#334155"
            strokeWidth="8"
            strokeLinecap="round"
          />
          <path
            d="M 10 45 A 40 40 0 0 1 90 45"
            fill="none"
            stroke="url(#gaugeGradient)"
            strokeWidth="8"
            strokeLinecap="round"
            strokeDasharray={`${(clampedPercentage * 125.7) / 100} 125.7`}
          />
          <defs>
            <linearGradient id="gaugeGradient" x1="0%" y1="0%" x2="100%" y2="0%">
              <stop offset="0%" stopColor={status === 'normal' ? '#10B981' : status === 'warning' ? '#F59E0B' : '#EF4444'} />
              <stop offset="100%" stopColor={status === 'normal' ? '#34D399' : status === 'warning' ? '#FBBF24' : '#F87171'} />
            </linearGradient>
          </defs>
        </svg>
        <div className="absolute bottom-0 left-0 right-0 text-center">
          <span className={cn('text-2xl font-bold font-mono', colors.text)}>
            {value.toFixed(1)}
          </span>
          <span className="text-xs text-slate-500 ml-1">{unit}</span>
        </div>
      </div>
    </div>
  );
};
