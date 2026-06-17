import { cn } from '@/lib/utils';
import { STATUS_LABELS, STATUS_COLORS } from '@/types';
import type { PointStatus } from '@/types';

interface StatusTagProps {
  status: PointStatus;
  className?: string;
}

export function StatusTag({ status, className }: StatusTagProps) {
  return (
    <span
      className={cn(
        'inline-flex items-center px-2.5 py-0.5 text-xs font-medium border rounded-sm',
        STATUS_COLORS[status],
        className,
      )}
    >
      {STATUS_LABELS[status]}
    </span>
  );
}
