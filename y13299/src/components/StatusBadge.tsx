import { clsx } from 'clsx';
import type { RecordStatus } from '../shared/types';

interface StatusBadgeProps {
  status: RecordStatus;
  size?: 'sm' | 'md';
}

const statusConfig: Record<RecordStatus, { label: string; className: string }> = {
  pending: {
    label: '待处理',
    className: 'bg-gray-200 text-gray-700 border-gray-300',
  },
  approved: {
    label: '已通过',
    className: 'bg-primary/10 text-primary border-primary/30',
  },
  exception: {
    label: '异常',
    className: 'bg-accent/10 text-accent border-accent/30',
  },
  need_evidence: {
    label: '待补证',
    className: 'bg-warning/20 text-yellow-800 border-warning/40',
  },
  suspected_duplicate: {
    label: '疑似重复',
    className: 'bg-indigo-100 text-indigo-700 border-indigo-300',
  },
};

export default function StatusBadge({ status, size = 'md' }: StatusBadgeProps) {
  const config = statusConfig[status];
  return (
    <span
      className={clsx(
        'inline-flex items-center font-medium rounded border',
        size === 'sm' ? 'px-2 py-0.5 text-xs' : 'px-3 py-1 text-sm',
        config.className,
      )}
    >
      {config.label}
    </span>
  );
}
