import React from 'react';
import { cn } from '@/lib/utils';
import type { LucideIcon } from 'lucide-react';

interface StatCardProps {
  title: string;
  value: number;
  total: number;
  icon: LucideIcon;
  color: 'seaweed' | 'ocean' | 'coral' | 'coral-bright' | 'sand';
  screenshotMode?: boolean;
}

const colorClasses: Record<StatCardProps['color'], { bg: string; text: string; ring: string }> = {
  seaweed: {
    bg: 'bg-seaweed-500/20',
    text: 'text-seaweed-400',
    ring: 'ring-seaweed-500/40',
  },
  ocean: {
    bg: 'bg-ocean-500/20',
    text: 'text-ocean-300',
    ring: 'ring-ocean-500/40',
  },
  coral: {
    bg: 'bg-coral-500/20',
    text: 'text-coral-400',
    ring: 'ring-coral-500/40',
  },
  'coral-bright': {
    bg: 'bg-coral-500/25',
    text: 'text-coral-300',
    ring: 'ring-coral-400/50',
  },
  sand: {
    bg: 'bg-sand-500/20',
    text: 'text-sand-400',
    ring: 'ring-sand-500/40',
  },
};

const StatCard: React.FC<StatCardProps> = ({
  title,
  value,
  total,
  icon: Icon,
  color,
  screenshotMode = false,
}) => {
  const colors = colorClasses[color];
  const percentage = total > 0 ? ((value / total) * 100).toFixed(1) : '0.0';

  return (
    <div
      className={cn(
        'nautical-card p-5 flex items-center gap-4',
        !screenshotMode && 'transition-all duration-300 hover:shadow-lg hover:-translate-y-0.5'
      )}
    >
      <div
        className={cn(
          'w-16 h-16 rounded-full flex items-center justify-center flex-shrink-0 ring-2',
          colors.bg,
          colors.text,
          colors.ring
        )}
      >
        <Icon className="w-8 h-8" strokeWidth={1.8} />
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-ocean-400 text-sm mb-1 truncate">{title}</p>
        <div className="flex items-baseline gap-3">
          <span className={cn('font-display text-3xl font-bold', colors.text)}>{value}</span>
          <span className="text-ocean-400 text-sm">
            占比 <span className="data-value">{percentage}%</span>
          </span>
        </div>
      </div>
    </div>
  );
};

export default StatCard;
