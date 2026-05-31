import { cn } from '@/lib/utils';
import { CheckCircle, XCircle, Clock, FileText, CheckCheck } from 'lucide-react';
import type { LucideIcon } from 'lucide-react';

export type StatusType = 'draft' | 'pending' | 'approved' | 'rejected' | 'settled';

interface StatusBadgeProps {
  status: StatusType;
  size?: 'sm' | 'md';
  showIcon?: boolean;
  className?: string;
}

const statusConfig: Record<
  StatusType,
  {
    label: string;
    bgColor: string;
    textColor: string;
    borderColor: string;
    icon: LucideIcon;
  }
> = {
  draft: {
    label: '草稿',
    bgColor: 'bg-slate-100 dark:bg-slate-700',
    textColor: 'text-slate-700 dark:text-slate-300',
    borderColor: 'border-slate-200 dark:border-slate-600',
    icon: FileText,
  },
  pending: {
    label: '待复核',
    bgColor: 'bg-amber-50 dark:bg-amber-900/30',
    textColor: 'text-amber-700 dark:text-amber-400',
    borderColor: 'border-amber-200 dark:border-amber-800',
    icon: Clock,
  },
  approved: {
    label: '已通过',
    bgColor: 'bg-green-50 dark:bg-green-900/30',
    textColor: 'text-green-700 dark:text-green-400',
    borderColor: 'border-green-200 dark:border-green-800',
    icon: CheckCircle,
  },
  rejected: {
    label: '已驳回',
    bgColor: 'bg-red-50 dark:bg-red-900/30',
    textColor: 'text-red-700 dark:text-red-400',
    borderColor: 'border-red-200 dark:border-red-800',
    icon: XCircle,
  },
  settled: {
    label: '已结算',
    bgColor: 'bg-primary-50 dark:bg-primary-900/30',
    textColor: 'text-primary-700 dark:text-primary-400',
    borderColor: 'border-primary-200 dark:border-primary-800',
    icon: CheckCheck,
  },
};

const sizeClasses = {
  sm: 'text-xs px-2 py-0.5 gap-1',
  md: 'text-sm px-3 py-1 gap-1.5',
};

const iconSizeClasses = {
  sm: 'w-3 h-3',
  md: 'w-4 h-4',
};

export default function StatusBadge({
  status,
  size = 'md',
  showIcon = true,
  className,
}: StatusBadgeProps) {
  const config = statusConfig[status];
  const Icon = config.icon;

  return (
    <span
      className={cn(
        'inline-flex items-center font-medium rounded-md border',
        config.bgColor,
        config.textColor,
        config.borderColor,
        sizeClasses[size],
        className
      )}
    >
      {showIcon && <Icon className={iconSizeClasses[size]} />}
      {config.label}
    </span>
  );
}
