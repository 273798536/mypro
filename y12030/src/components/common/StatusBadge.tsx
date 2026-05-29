import { getStatusBadgeClass } from '../../utils/format';

interface StatusBadgeProps {
  status: string;
  text: string;
  className?: string;
}

export function StatusBadge({ status, text, className = '' }: StatusBadgeProps) {
  return (
    <span className={`status-badge ${getStatusBadgeClass(status)} ${className}`}>
      {text}
    </span>
  );
}
