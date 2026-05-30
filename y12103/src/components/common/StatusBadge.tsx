import { twMerge } from 'tailwind-merge';

type StatusType = 'healthy' | 'warning' | 'shortage' | 'overstock' | 'low' | 'medium' | 'high' | 'critical';

const statusStyles: Record<StatusType, string> = {
  healthy: 'bg-success-100 text-success-700 border-success-200',
  warning: 'bg-warning-100 text-warning-700 border-warning-200',
  shortage: 'bg-danger-100 text-danger-700 border-danger-200',
  overstock: 'bg-primary-100 text-primary-700 border-primary-200',
  low: 'bg-success-100 text-success-700 border-success-200',
  medium: 'bg-warning-100 text-warning-700 border-warning-200',
  high: 'bg-orange-100 text-orange-700 border-orange-200',
  critical: 'bg-danger-100 text-danger-700 border-danger-200',
};

const statusLabels: Record<StatusType, string> = {
  healthy: '健康',
  warning: '预警',
  shortage: '缺货',
  overstock: '积压',
  low: '低风险',
  medium: '中风险',
  high: '高风险',
  critical: '严重',
};

interface StatusBadgeProps {
  status: StatusType;
  className?: string;
}

export default function StatusBadge({ status, className }: StatusBadgeProps) {
  return (
    <span
      className={twMerge(
        'inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium border',
        statusStyles[status],
        className
      )}
    >
      {statusLabels[status]}
    </span>
  );
}
