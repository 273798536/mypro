import { cn } from '@/lib/utils';

interface StatusBadgeProps {
  status: 'normal' | 'warning' | 'error' | 'pending' | 'applied' | 'rejected' | 'high' | 'medium' | 'low';
  size?: 'sm' | 'md';
  children: React.ReactNode;
}

const statusStyles = {
  normal: 'bg-emerald-500/15 text-emerald-400 border-emerald-500/30',
  warning: 'bg-amber-500/15 text-amber-400 border-amber-500/30',
  error: 'bg-red-500/15 text-red-400 border-red-500/30',
  pending: 'bg-navy-500/15 text-navy-300 border-navy-500/30',
  applied: 'bg-emerald-500/15 text-emerald-400 border-emerald-500/30',
  rejected: 'bg-gray-500/15 text-gray-400 border-gray-500/30',
  high: 'bg-red-500/15 text-red-400 border-red-500/30',
  medium: 'bg-amber-500/15 text-amber-400 border-amber-500/30',
  low: 'bg-emerald-500/15 text-emerald-400 border-emerald-500/30',
};

export default function StatusBadge({ status, size = 'md', children }: StatusBadgeProps) {
  return (
    <span
      className={cn(
        'inline-flex items-center gap-1.5 border rounded-full font-medium',
        size === 'sm' ? 'px-2 py-0.5 text-xs' : 'px-3 py-1 text-sm',
        statusStyles[status]
      )}
    >
      <span
        className={cn(
          'w-1.5 h-1.5 rounded-full',
          status === 'normal' || status === 'applied' || status === 'low'
            ? 'bg-emerald-400'
            : status === 'warning' || status === 'pending' || status === 'medium'
            ? 'bg-amber-400'
            : 'bg-red-400',
          status !== 'rejected' && 'animate-pulse-slow'
        )}
      />
      {children}
    </span>
  );
}
