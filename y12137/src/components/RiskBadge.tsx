import { cn } from '@/lib/utils';
import type { Risk } from '@/types';

interface RiskBadgeProps {
  level: Risk['level'];
  size?: 'sm' | 'md';
}

const levelStyles = {
  low: 'bg-success/20 text-success border-success/30',
  medium: 'bg-warningYellow/20 text-warningYellow border-warningYellow/30',
  high: 'bg-warning/20 text-warning border-warning/30',
  critical: 'bg-red-600/20 text-red-400 border-red-600/30',
};

const sizeStyles = {
  sm: 'px-2 py-0.5 text-xs',
  md: 'px-3 py-1 text-sm',
};

const levelLabels = {
  low: '低风险',
  medium: '中风险',
  high: '高风险',
  critical: '严重风险',
};

export default function RiskBadge({ level, size = 'md' }: RiskBadgeProps) {
  return (
    <span
      className={cn(
        'inline-flex items-center font-medium rounded border',
        levelStyles[level],
        sizeStyles[size]
      )}
    >
      {levelLabels[level]}
    </span>
  );
}
