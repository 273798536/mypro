import { cn } from '@/lib/utils';
import type { AnomalyStatus, AnomalyLevel, TaskStatus } from '@/types';
import { anomalyStatusLabel, anomalyLevelLabel, taskStatusLabel } from '@/store/taskStore';

interface StatusBadgeProps {
  type: 'anomaly-status' | 'anomaly-level' | 'task-status';
  value: AnomalyStatus | AnomalyLevel | TaskStatus;
  size?: 'sm' | 'md';
  className?: string;
}

export default function StatusBadge({ type, value, size = 'sm', className }: StatusBadgeProps) {
  const sizeCls = size === 'sm' ? 'px-2 py-0.5 text-[11px]' : 'px-2.5 py-1 text-xs';

  const getStyles = () => {
    if (type === 'anomaly-status') {
      switch (value) {
        case 'unconfirmed':
          return 'bg-warning/15 text-warning border-warning/40';
        case 'confirmed_abnormal':
          return 'bg-danger/15 text-danger border-danger/40';
        case 'confirmed_normal':
          return 'bg-success/15 text-success border-success/40';
        default:
          return 'bg-gray-500/15 text-gray-300 border-gray-500/40';
      }
    }
    if (type === 'anomaly-level') {
      switch (value) {
        case 'high':
          return 'bg-danger/20 text-danger border-danger/50';
        case 'medium':
          return 'bg-warning/20 text-warning border-warning/50';
        case 'low':
          return 'bg-primary-300/20 text-primary-200 border-primary-400/50';
        default:
          return '';
      }
    }
    if (type === 'task-status') {
      switch (value) {
        case 'pending':
          return 'bg-gray-500/20 text-gray-300 border-gray-500/40';
        case 'running':
          return 'bg-primary-400/20 text-primary-200 border-primary-400/40 animate-pulse';
        case 'completed':
          return 'bg-success/20 text-success border-success/40';
        case 'archived':
          return 'bg-gray-600/20 text-gray-400 border-gray-600/40';
        default:
          return '';
      }
    }
    return '';
  };

  const getLabel = () => {
    if (type === 'anomaly-status') return anomalyStatusLabel[value as AnomalyStatus];
    if (type === 'anomaly-level') return anomalyLevelLabel[value as AnomalyLevel];
    if (type === 'task-status') return taskStatusLabel[value as TaskStatus];
    return value;
  };

  return (
    <span
      className={cn(
        'inline-flex items-center border rounded-md font-medium',
        sizeCls,
        getStyles(),
        className,
      )}
    >
      <span className="w-1.5 h-1.5 rounded-full bg-current mr-1.5 opacity-80" />
      {getLabel()}
    </span>
  );
}
