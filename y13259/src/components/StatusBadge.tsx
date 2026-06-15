import { cn } from '@/lib/utils';
import { getStatusLabel, getStatusColor } from '@/services/detectionService';

interface StatusBadgeProps {
  status: string;
  className?: string;
}

export default function StatusBadge({ status, className }: StatusBadgeProps) {
  const label = getStatusLabel(status);
  const colorClass = getStatusColor(status);

  return (
    <span
      className={cn(
        'inline-flex items-center px-2 py-0.5 text-xs font-medium rounded-md text-white',
        colorClass,
        className
      )}
    >
      {label}
    </span>
  );
}
