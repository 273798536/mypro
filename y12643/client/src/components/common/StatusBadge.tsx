import { RecordStatus } from '@/types';
import { getStatusColor, getStatusLabel } from '@/utils/colorRules';

interface StatusBadgeProps {
  status: RecordStatus;
  size?: 'sm' | 'md' | 'lg';
  showDot?: boolean;
}

export function StatusBadge({ status, size = 'md', showDot = true }: StatusBadgeProps) {
  const color = getStatusColor(status);
  const label = getStatusLabel(status);

  const sizeClasses = {
    sm: 'px-2 py-0.5 text-xs',
    md: 'px-2.5 py-1 text-xs',
    lg: 'px-3 py-1.5 text-sm'
  };

  return (
    <span
      className={`inline-flex items-center gap-1.5 rounded-md font-medium ${color.bg} ${color.text} ${sizeClasses[size]}`}
    >
      {showDot && <span className={`w-1.5 h-1.5 rounded-full ${color.dot}`}></span>}
      {label}
    </span>
  );
}
