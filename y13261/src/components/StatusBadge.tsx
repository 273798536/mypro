import type { ReviewStatus } from '@/types';

interface StatusBadgeProps {
  status: ReviewStatus;
  hasAnomaly?: boolean;
}

const statusConfig: Record<ReviewStatus, { label: string; className: string }> = {
  pending: {
    label: '待开始',
    className: 'bg-steel-100 text-steel-500',
  },
  processing: {
    label: '进行中',
    className: 'bg-primary-50 text-primary-600',
  },
  completed: {
    label: '已完成',
    className: 'bg-success-50 text-success-600',
  },
  anomaly: {
    label: '异常待处理',
    className: 'bg-warning-50 text-warning-600',
  },
};

export default function StatusBadge({ status, hasAnomaly }: StatusBadgeProps) {
  const displayStatus = hasAnomaly && status !== 'completed' ? 'anomaly' : status;
  const config = statusConfig[displayStatus];

  return (
    <span
      className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${config.className}`}
    >
      <span className="w-1.5 h-1.5 rounded-full bg-current mr-1.5" />
      {config.label}
    </span>
  );
}
