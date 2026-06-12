import { cn } from '../lib/utils';
import { riskLevelLabel, riskLevelColor } from './Layout';
import { Check, Clock, X } from 'lucide-react';

interface RiskBadgeProps {
  level: 'normal' | 'pending' | 'anomaly';
  size?: 'sm' | 'md';
}

export default function RiskBadge({ level, size = 'md' }: RiskBadgeProps) {
  const sizeClasses = size === 'sm'
    ? 'px-2 py-0.5 text-xs gap-1'
    : 'px-3 py-1 text-sm gap-1.5';

  const Icon = level === 'normal' ? Check : level === 'pending' ? Clock : X;

  return (
    <span
      className={cn(
        'inline-flex items-center border rounded-full font-medium',
        riskLevelColor(level),
        sizeClasses
      )}
    >
      <Icon className={size === 'sm' ? 'w-3 h-3' : 'w-4 h-4'} />
      {riskLevelLabel(level)}
    </span>
  );
}
