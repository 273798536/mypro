import type { BillStatus } from '../../shared/types';
import { BILL_STATUS_LABELS } from '../../shared/types';
import { cn } from '@/lib/utils';

const statusStyles: Record<BillStatus, string> = {
  pending: 'bg-gray-100 text-gray-700',
  reviewing: 'bg-blue-100 text-blue-700',
  approved: 'bg-green-100 text-green-700',
  rejected: 'bg-red-100 text-red-700',
  exception: 'bg-orange-100 text-orange-700',
};

interface StatusBadgeProps {
  status: BillStatus;
}

export default function StatusBadge({ status }: StatusBadgeProps) {
  return (
    <span
      className={cn(
        'inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium',
        statusStyles[status]
      )}
    >
      {BILL_STATUS_LABELS[status]}
    </span>
  );
}
