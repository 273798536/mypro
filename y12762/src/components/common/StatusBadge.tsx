import { FileEdit, Loader2, CheckCircle2, AlertTriangle } from 'lucide-react';
import { cn } from '@/lib/utils';
import type { BatchStatus } from '@/types';

interface StatusBadgeProps {
  status: BatchStatus;
}

const statusConfig = {
  draft: {
    bg: 'bg-gray-100',
    border: 'border-gray-300',
    text: 'text-gray-700',
    label: '草稿',
    Icon: FileEdit,
  },
  calculating: {
    bg: 'bg-blue-100',
    border: 'border-blue-400',
    text: 'text-blue-700',
    label: '计算中',
    Icon: Loader2,
  },
  completed: {
    bg: 'bg-green-100',
    border: 'border-green-400',
    text: 'text-green-700',
    label: '已完成',
    Icon: CheckCircle2,
  },
  has_anomaly: {
    bg: 'bg-orange-100',
    border: 'border-orange-400',
    text: 'text-orange-700',
    label: '存在异常',
    Icon: AlertTriangle,
  },
};

export default function StatusBadge({ status }: StatusBadgeProps) {
  const config = statusConfig[status];
  const Icon = config.Icon;

  return (
    <span
      className={cn(
        'inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium border',
        config.bg,
        config.border,
        config.text
      )}
    >
      <Icon className={cn('w-3.5 h-3.5', status === 'calculating' && 'animate-spin')} />
      {config.label}
    </span>
  );
}
