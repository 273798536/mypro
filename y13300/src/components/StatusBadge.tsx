import { Lock } from 'lucide-react';
import { TicketStatus, STATUS_LABELS, STATUS_COLORS } from '../../shared/types.js';
import { cn } from '@/lib/utils';

interface StatusBadgeProps {
  status: TicketStatus;
  size?: 'sm' | 'md';
}

export default function StatusBadge({ status, size = 'md' }: StatusBadgeProps) {
  const isLocked = status === 'locked';
  const sizeClasses = size === 'sm' ? 'px-1.5 py-0.5 text-[10px]' : 'px-2 py-0.5 text-xs';

  return (
    <span
      className={cn(
        'inline-flex items-center gap-1 rounded font-medium text-white',
        STATUS_COLORS[status],
        sizeClasses
      )}
    >
      {isLocked && <Lock className="w-3 h-3" />}
      {STATUS_LABELS[status]}
    </span>
  );
}
