import type { ComplaintStatus } from '../../shared/types';

const statusConfig: Record<ComplaintStatus, { label: string; bg: string; dot: string }> = {
  pending: { label: '待归并', bg: 'bg-amber-100 text-amber-800', dot: 'bg-amber-500' },
  merged: { label: '已归并', bg: 'bg-blue-100 text-blue-800', dot: 'bg-blue-500' },
  confirmed: { label: '已确认', bg: 'bg-green-100 text-green-800', dot: 'bg-green-500' },
};

interface StatusBadgeProps {
  status: ComplaintStatus;
}

export default function StatusBadge({ status }: StatusBadgeProps) {
  const config = statusConfig[status];

  return (
    <span
      className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-xs font-medium ${config.bg}`}
    >
      <span className={`h-1.5 w-1.5 rounded-full ${config.dot}`} />
      {config.label}
    </span>
  );
}
