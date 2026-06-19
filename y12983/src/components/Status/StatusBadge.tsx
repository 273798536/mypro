import { cn } from '@/lib/utils';
import { statusLabel } from '@/utils/format';
import type { GapStatus } from '@/types';

interface StatusBadgeProps {
  status: GapStatus;
  size?: 'sm' | 'md';
}

const statusStyles: Record<GapStatus, string> = {
  pending: 'bg-amber-500/15 text-amber-400 border-amber-500/30',
  processing: 'bg-blue-500/15 text-blue-400 border-blue-500/30',
  fixed: 'bg-emerald-500/15 text-emerald-400 border-emerald-500/30',
  ignored: 'bg-slate-500/15 text-slate-400 border-slate-500/30',
};

export default function StatusBadge({ status, size = 'md' }: StatusBadgeProps) {
  return (
    <span
      className={cn(
        'inline-flex items-center border rounded font-medium',
        statusStyles[status],
        size === 'sm' ? 'px-1.5 py-0.5 text-xs' : 'px-2 py-1 text-sm'
      )}
    >
      <span
        className={cn(
          'w-1.5 h-1.5 rounded-full mr-1.5',
          status === 'pending' && 'bg-amber-500',
          status === 'processing' && 'bg-blue-500',
          status === 'fixed' && 'bg-emerald-500',
          status === 'ignored' && 'bg-slate-500'
        )}
      />
      {statusLabel(status)}
    </span>
  );
}
