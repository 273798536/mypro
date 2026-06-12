import { BuoyStatus, BUOY_STATUS_LABEL } from '@/types';
import { cn } from '@/lib/utils';

interface BuoyStatusBadgeProps {
  status: BuoyStatus;
  showLabel?: boolean;
  size?: 'sm' | 'md';
}

export default function BuoyStatusBadge({
  status,
  showLabel = true,
  size = 'md',
}: BuoyStatusBadgeProps) {
  const statusClass = `status-${status}`;
  const label = BUOY_STATUS_LABEL[status];

  return (
    <div
      className={cn(
        'inline-flex items-center gap-2',
        size === 'sm' ? 'text-xs' : 'text-sm'
      )}
    >
      <span
        className={cn(
          'status-dot shrink-0',
          size === 'sm' ? 'w-2 h-2' : 'w-2.5 h-2.5',
          statusClass
        )}
      />
      {showLabel && (
        <span
          className={cn(
            'font-medium',
            status === 'normal' && 'text-seaweed-300',
            status === 'offline' && 'text-ocean-300',
            status === 'anomaly' && 'text-coral-300',
            status === 'out_of_range' && 'text-coral-300',
            status === 'pending' && 'text-sand-300'
          )}
        >
          {label}
        </span>
      )}
    </div>
  );
}
