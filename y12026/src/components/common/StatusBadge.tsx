import { cn } from '@/lib/utils';

type StatusType = 'success' | 'warning' | 'error' | 'info' | 'default';

interface StatusBadgeProps {
  status?: string;
  type?: StatusType;
  label?: string;
  className?: string;
}

const variantStyles: Record<StatusType, string> = {
  success: 'bg-green-100 text-green-700 border-green-200',
  warning: 'bg-amber-100 text-amber-700 border-amber-200',
  error: 'bg-red-100 text-red-700 border-red-200',
  info: 'bg-blue-100 text-blue-700 border-blue-200',
  default: 'bg-slate-100 text-slate-700 border-slate-200',
};

const getStatusType = (status: string): StatusType => {
  if (['active', 'confirmed', 'reviewed', 'normal'].includes(status)) return 'success';
  if (['pending', 'warning', 'suspended'].includes(status)) return 'warning';
  if (['expired', 'cancelled', 'error', 'inactive', 'transferred'].includes(status)) return 'error';
  return 'default';
};

const getStatusLabel = (status: string): string => {
  const labels: Record<string, string> = {
    active: '正常',
    inactive: '停用',
    transferred: '已过户',
    pending: '待处理',
    reviewed: '已复核',
    confirmed: '已确认',
    cancelled: '已取消',
    normal: '正常',
    warning: '待关注',
    error: '异常',
    expired: '已过期',
    suspended: '已暂停',
  };
  return labels[status] || status;
};

export function StatusBadge({ status, type, label, className }: StatusBadgeProps) {
  const statusType = type || (status ? getStatusType(status) : 'default');
  const displayLabel = label || (status ? getStatusLabel(status) : '');

  return (
    <span
      className={cn(
        'inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium border',
        variantStyles[statusType],
        className
      )}
    >
      {displayLabel}
    </span>
  );
}
