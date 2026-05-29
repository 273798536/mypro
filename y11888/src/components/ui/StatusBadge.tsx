import { cn } from '@/lib/utils';
import { CheckCircle2, XCircle, AlertTriangle, Clock } from 'lucide-react';

type StatusType = 'pass' | 'fail' | 'review' | 'pending';

interface StatusBadgeProps {
  status: StatusType;
  text?: string;
  size?: 'sm' | 'md';
}

const statusConfig = {
  pass: {
    label: '通过',
    icon: CheckCircle2,
    bgColor: 'bg-green-50',
    textColor: 'text-success-green',
    borderColor: 'border-green-200',
  },
  fail: {
    label: '不通过',
    icon: XCircle,
    bgColor: 'bg-red-50',
    textColor: 'text-error-red',
    borderColor: 'border-red-200',
  },
  review: {
    label: '待复核',
    icon: AlertTriangle,
    bgColor: 'bg-orange-50',
    textColor: 'text-warning-orange',
    borderColor: 'border-orange-200',
  },
  pending: {
    label: '待检查',
    icon: Clock,
    bgColor: 'bg-gray-50',
    textColor: 'text-gray-500',
    borderColor: 'border-gray-200',
  },
};

export default function StatusBadge({ status, text, size = 'md' }: StatusBadgeProps) {
  const config = statusConfig[status];
  const Icon = config.icon;
  const iconSize = size === 'sm' ? 'w-3.5 h-3.5' : 'w-4 h-4';
  const padding = size === 'sm' ? 'px-2 py-0.5' : 'px-2.5 py-1';
  
  return (
    <span className={cn(
      'inline-flex items-center gap-1.5 rounded-md border',
      config.bgColor,
      config.textColor,
      config.borderColor,
      padding
    )}>
      <Icon className={iconSize} />
      <span className={size === 'sm' ? 'text-xs' : 'text-sm font-medium'}>
        {text || config.label}
      </span>
    </span>
  );
}
