import { cn } from '@/lib/utils';
import type { ArchiveStatus, AnomalyType } from '@/types';
import { statusLabelMap, anomalyTypeLabelMap } from '@/types';

interface StatusBadgeProps {
  status: ArchiveStatus;
  className?: string;
}

export function StatusBadge({ status, className }: StatusBadgeProps) {
  const baseStyles = 'inline-flex items-center px-2.5 py-1 text-xs font-medium border';
  const statusStyles: Record<ArchiveStatus, string> = {
    success: 'bg-emerald-50 text-emerald-700 border-emerald-200',
    pending: 'bg-amber-50 text-amber-700 border-amber-200',
    error: 'bg-red-50 text-red-700 border-red-200',
  };

  return (
    <span className={cn(baseStyles, statusStyles[status], className)}>
      <span
        className={cn(
          'w-1.5 h-1.5 rounded-full mr-1.5',
          status === 'success' && 'bg-emerald-500',
          status === 'pending' && 'bg-amber-500',
          status === 'error' && 'bg-red-500'
        )}
      />
      {statusLabelMap[status]}
    </span>
  );
}

interface AnomalyBadgeProps {
  type: AnomalyType;
  className?: string;
}

export function AnomalyBadge({ type, className }: AnomalyBadgeProps) {
  if (type === 'none') {
    return (
      <span className={cn('text-xs text-slate-500', className)}>
        无异常
      </span>
    );
  }

  const baseStyles = 'inline-flex items-center px-2 py-1 text-xs font-medium';
  const typeStyles: Record<AnomalyType, string> = {
    none: '',
    backup_gap: 'bg-red-100 text-red-700',
    page_sequence: 'bg-amber-100 text-amber-700',
    slow_query: 'bg-orange-100 text-orange-700',
  };

  return (
    <span className={cn(baseStyles, typeStyles[type], className)}>
      {anomalyTypeLabelMap[type]}
    </span>
  );
}
