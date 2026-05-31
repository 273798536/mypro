import { RISK_LEVEL_LABELS, RISK_LEVEL_COLORS } from '../../shared/types';
import type { RiskLevel } from '../../shared/types';
import { cn } from '../lib/utils';

interface RiskBadgeProps {
  level: RiskLevel;
  pulse?: boolean;
  className?: string;
}

export default function RiskBadge({ level, pulse = false, className }: RiskBadgeProps) {
  const label = RISK_LEVEL_LABELS[level];
  const color = RISK_LEVEL_COLORS[level];
  
  const bgColors: Record<RiskLevel, string> = {
    high: 'bg-red-100',
    medium: 'bg-amber-100',
    low: 'bg-yellow-100',
    none: 'bg-emerald-100',
  };
  
  const textColors: Record<RiskLevel, string> = {
    high: 'text-red-700',
    medium: 'text-amber-700',
    low: 'text-yellow-700',
    none: 'text-emerald-700',
  };

  return (
    <span
      className={cn(
        'inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold',
        bgColors[level],
        textColors[level],
        pulse && level === 'high' && 'animate-pulse',
        className
      )}
    >
      <span
        className="w-2 h-2 rounded-full"
        style={{ backgroundColor: color }}
      />
      {label}
    </span>
  );
}
