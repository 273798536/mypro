import type { PointStatus } from '@/types';

interface Props {
  status: PointStatus;
}

const STATUS_META: Record<
  PointStatus,
  { label: string; bg: string; color: string; border: string }
> = {
  processed: {
    label: '已处理',
    bg: 'bg-green-50',
    color: 'text-processed-green',
    border: 'border-green-200',
  },
  pending_material: {
    label: '待补材料',
    bg: 'bg-orange-50',
    color: 'text-alert-orange',
    border: 'border-orange-200',
  },
  manual_overruled: {
    label: '人工改判',
    bg: 'bg-purple-50',
    color: 'text-manual-purple',
    border: 'border-purple-200',
  },
  withdrawn: {
    label: '已撤回',
    bg: 'bg-gray-100',
    color: 'text-withdrawn-gray',
    border: 'border-gray-300',
  },
  suspended: {
    label: '挂起',
    bg: 'bg-red-50',
    color: 'text-suspended-red',
    border: 'border-red-200',
  },
};

export default function StatusBadge({ status }: Props) {
  const meta = STATUS_META[status];
  return (
    <span
      className={`status-badge ${meta.bg} ${meta.color} ${meta.border} border`}
    >
      {meta.label}
    </span>
  );
}
