import { STATUS_LABELS } from '../../types';
import { statusColorClass } from '../../utils/formatters';
import type { BatchStatus } from '../../types';

interface StatusBadgeProps {
  status: BatchStatus;
  size?: 'sm' | 'md';
}

export function StatusBadge({ status, size = 'sm' }: StatusBadgeProps) {
  const sizeCls = size === 'sm' ? 'px-2 py-0.5 text-[11px]' : 'px-3 py-1 text-xs';
  return (
    <span
      className={`inline-flex items-center border-2 rounded-none font-semibold tracking-wide ${sizeCls} ${statusColorClass(status)}`}
    >
      <span
        className={`w-1.5 h-1.5 rounded-full mr-1.5 ${
          status === 'exception'
            ? 'bg-amber-400'
            : status === 'done'
              ? 'bg-mint-400'
              : status === 'reviewing'
                ? 'bg-amber-300'
                : 'bg-ink-400'
        }`}
      />
      {STATUS_LABELS[status]}
    </span>
  );
}
