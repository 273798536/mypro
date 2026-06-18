import type { RecordStatus } from '../../shared/types';
import { getStatusBadge } from '../utils/formatters';

interface StatusBadgeProps {
  status: RecordStatus;
  size?: 'sm' | 'md';
}

export function StatusBadge({ status, size = 'md' }: StatusBadgeProps) {
  const config = getStatusBadge(status);
  const sizeClasses = size === 'sm' ? 'px-2 py-0.5 text-xs' : 'px-2.5 py-1 text-sm';

  return (
    <span
      className={`inline-flex items-center gap-1.5 rounded border font-medium ${config.className} ${sizeClasses}`}
    >
      <span
        className={`inline-block rounded-full ${size === 'sm' ? 'w-1.5 h-1.5' : 'w-2 h-2'}`}
        style={{ backgroundColor: config.bgColor }}
      />
      {config.label}
    </span>
  );
}
