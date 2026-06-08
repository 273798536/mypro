import { cn } from '@/lib/utils';
import { statusText } from '@/lib/format';
import type { InspectionStatus, MeasurePointStatus } from '@shared/types';

type BadgeStatus = InspectionStatus | MeasurePointStatus;

interface StatusBadgeProps {
  status: BadgeStatus;
  className?: string;
}

const INSPECTION_STYLES: Record<InspectionStatus, string> = {
  pending: 'bg-slate-100 text-slate-700 border-slate-200',
  checking: 'bg-brand-50 text-brand-600 border-brand-100',
  reviewing: 'bg-alert-50 text-alert-600 border-alert-100',
  completed: 'bg-success-50 text-success-600 border-success-500',
};

const POINT_STYLES: Record<MeasurePointStatus, string> = {
  normal: 'bg-success-50 text-success-600 border-success-200',
  abnormal: 'bg-red-50 text-red-600 border-red-200',
  revised: 'bg-alert-50 text-alert-600 border-alert-200',
  confirmed: 'bg-brand-50 text-brand-600 border-brand-200',
};

const INSPECTION_DOT: Record<InspectionStatus, string> = {
  pending: 'bg-slate-400',
  checking: 'bg-brand-500',
  reviewing: 'bg-alert-500',
  completed: 'bg-success-500',
};

const POINT_DOT: Record<MeasurePointStatus, string> = {
  normal: 'bg-success-500',
  abnormal: 'bg-red-500',
  revised: 'bg-alert-500',
  confirmed: 'bg-brand-500',
};

function isInspectionStatus(status: BadgeStatus): status is InspectionStatus {
  return ['pending', 'checking', 'reviewing', 'completed'].includes(status);
}

export default function StatusBadge({ status, className }: StatusBadgeProps) {
  const styles = isInspectionStatus(status)
    ? INSPECTION_STYLES[status]
    : POINT_STYLES[status as MeasurePointStatus];
  const dotColor = isInspectionStatus(status)
    ? INSPECTION_DOT[status]
    : POINT_DOT[status as MeasurePointStatus];

  return (
    <span
      className={cn(
        'inline-flex items-center px-2 py-0.5 text-xs font-medium rounded border',
        styles,
        className
      )}
    >
      <span className={cn('w-1.5 h-1.5 rounded-full mr-1.5', dotColor)} />
      {statusText(status)}
    </span>
  );
}
