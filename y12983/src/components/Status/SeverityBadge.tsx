import { cn } from '@/lib/utils';
import { severityLabel } from '@/utils/format';
import type { Severity } from '@/types';

interface SeverityBadgeProps {
  severity: Severity;
  size?: 'sm' | 'md';
}

const severityStyles: Record<Severity, string> = {
  low: 'bg-slate-500/15 text-slate-400 border-slate-500/30',
  medium: 'bg-blue-500/15 text-blue-400 border-blue-500/30',
  high: 'bg-orange-500/15 text-orange-400 border-orange-500/30',
  critical: 'bg-red-500/15 text-red-400 border-red-500/30',
};

export default function SeverityBadge({ severity, size = 'md' }: SeverityBadgeProps) {
  return (
    <span
      className={cn(
        'inline-flex items-center border rounded font-medium',
        severityStyles[severity],
        size === 'sm' ? 'px-1.5 py-0.5 text-xs' : 'px-2 py-1 text-sm'
      )}
    >
      <span
        className={cn(
          'w-1.5 h-1.5 rounded-full mr-1.5',
          severity === 'low' && 'bg-slate-500',
          severity === 'medium' && 'bg-blue-500',
          severity === 'high' && 'bg-orange-500',
          severity === 'critical' && 'bg-red-500 animate-pulse'
        )}
      />
      {severityLabel(severity)}
    </span>
  );
}
