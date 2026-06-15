import { PointStatus, STATUS_LABELS, STATUS_COLORS } from '../types';

interface StatusBadgeProps {
  status: PointStatus;
  className?: string;
}

export function StatusBadge({ status, className = '' }: StatusBadgeProps) {
  return (
    <span className={`status-badge ${STATUS_COLORS[status]} ${className}`}>
      {STATUS_LABELS[status]}
    </span>
  );
}
