import { CheckCircle, AlertCircle, XCircle } from 'lucide-react';
import { SampleStatus } from '@/types';
import { cn } from '@/lib/utils';

interface StatusBadgeProps {
  status: SampleStatus;
}

const statusConfig = {
  [SampleStatus.AVAILABLE]: {
    label: '可用',
    icon: CheckCircle,
    color: 'text-quality-green',
    bgColor: 'bg-quality-green/10',
    borderColor: 'border-quality-green/30',
  },
  [SampleStatus.REVIEWING]: {
    label: '审核中',
    icon: AlertCircle,
    color: 'text-quality-yellow',
    bgColor: 'bg-quality-yellow/10',
    borderColor: 'border-quality-yellow/30',
  },
  [SampleStatus.INVALID]: {
    label: '无效',
    icon: XCircle,
    color: 'text-quality-red',
    bgColor: 'bg-quality-red/10',
    borderColor: 'border-quality-red/30',
  },
};

export default function StatusBadge({ status }: StatusBadgeProps) {
  const config = statusConfig[status];
  const Icon = config.icon;

  return (
    <span
      className={cn(
        'inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-xs font-medium',
        config.bgColor,
        config.borderColor,
        config.color
      )}
    >
      <Icon className="h-3.5 w-3.5" />
      {config.label}
    </span>
  );
}
