import { STATUS_LABELS, STATUS_COLORS } from '@/types';
import type { ConflictStatus } from '@/types';

interface StatusBadgeProps {
  status: ConflictStatus;
}

export function StatusBadge({ status }: StatusBadgeProps) {
  return (
    <span className={`badge ${STATUS_COLORS[status]}`}>
      {STATUS_LABELS[status]}
    </span>
  );
}
