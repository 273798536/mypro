import type {
  AnomalyType,
  AnomalySeverity,
  AnomalyStatus,
} from '@/types';
import {
  ANOMALY_TYPE_LABEL,
  ANOMALY_SEVERITY_LABEL,
  ANOMALY_STATUS_LABEL,
} from '@/types';
import { cn } from '@/lib/utils';

export function AnomalyTypeBadge({ type }: { type: AnomalyType }) {
  const colorMap: Record<AnomalyType, string> = {
    TIMESTAMP_MISMATCH: 'bg-red-500/15 text-red-300 border-red-500/30',
    WEIGHT_OVERLOAD: 'bg-orange-500/15 text-orange-300 border-orange-500/30',
    POSITION_OUTLIER: 'bg-amber-500/15 text-amber-300 border-amber-500/30',
    VOLUME_MISMATCH: 'bg-blue-500/15 text-blue-300 border-blue-500/30',
  };
  return (
    <span
      className={cn(
        'inline-flex items-center px-2 py-0.5 text-xs font-medium border rounded',
        colorMap[type]
      )}
    >
      {ANOMALY_TYPE_LABEL[type]}
    </span>
  );
}

export function SeverityBadge({ severity }: { severity: AnomalySeverity }) {
  const colorMap: Record<AnomalySeverity, string> = {
    CRITICAL: 'bg-red-600/20 text-red-300 border-red-500/40',
    WARNING: 'bg-amber-600/20 text-amber-300 border-amber-500/40',
    INFO: 'bg-blue-600/20 text-blue-300 border-blue-500/40',
  };
  return (
    <span
      className={cn(
        'inline-flex items-center px-2 py-0.5 text-xs font-medium border rounded',
        colorMap[severity]
      )}
    >
      {ANOMALY_SEVERITY_LABEL[severity]}
    </span>
  );
}

export function StatusBadge({ status }: { status: AnomalyStatus }) {
  const colorMap: Record<AnomalyStatus, string> = {
    PENDING: 'bg-amber-500/15 text-amber-300 border-amber-500/30',
    APPROVED: 'bg-green-500/15 text-green-300 border-green-500/30',
    REJECTED: 'bg-red-500/15 text-red-300 border-red-500/30',
  };
  return (
    <span
      className={cn(
        'inline-flex items-center px-2 py-0.5 text-xs font-medium border rounded',
        colorMap[status]
      )}
    >
      {ANOMALY_STATUS_LABEL[status]}
    </span>
  );
}
