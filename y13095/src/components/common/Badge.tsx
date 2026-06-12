import { cn } from '@/lib/utils';
import type { PointStatus } from '@/types';
import { STATUS_LABELS } from '@/types';

interface BadgeProps {
  status: PointStatus;
  className?: string;
}

const statusStyles: Record<PointStatus, string> = {
  normal: 'bg-aviation-green/20 text-aviation-green border-aviation-green/30',
  abnormal: 'bg-aviation-red/20 text-aviation-red border-aviation-red/30',
  pending: 'bg-aviation-orange/20 text-aviation-orange border-aviation-orange/30',
  unchecked: 'bg-gray-500/20 text-gray-400 border-gray-500/30',
};

export function Badge({ status, className }: BadgeProps) {
  return (
    <span
      className={cn(
        'inline-flex items-center px-2 py-0.5 text-xs font-medium rounded border',
        statusStyles[status],
        className
      )}
    >
      {STATUS_LABELS[status]}
    </span>
  );
}
