import { cn } from '@/lib/utils';
import type { Task } from '@/types';

interface StatusBadgeProps {
  status: Task['status'];
  size?: 'sm' | 'md';
}

const statusStyles = {
  pending: 'bg-gray-500/20 text-gray-300 border-gray-500/30',
  calculating: 'bg-accent/20 text-accent border-accent/30',
  completed: 'bg-success/20 text-success border-success/30',
  error: 'bg-warning/20 text-warning border-warning/30',
};

const sizeStyles = {
  sm: 'px-2 py-0.5 text-xs',
  md: 'px-3 py-1 text-sm',
};

const statusLabels = {
  pending: '待处理',
  calculating: '计算中',
  completed: '已完成',
  error: '错误',
};

export default function StatusBadge({ status, size = 'md' }: StatusBadgeProps) {
  return (
    <span
      className={cn(
        'inline-flex items-center font-medium rounded border',
        statusStyles[status],
        sizeStyles[size]
      )}
    >
      {statusLabels[status]}
    </span>
  );
}
