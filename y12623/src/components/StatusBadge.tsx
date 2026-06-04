import { AlertTriangle, CheckCircle, Clock, XCircle } from 'lucide-react';
import type { RecordStatus, AnomalyType } from '../../shared/types';
import { STATUS_LABELS, ANOMALY_TYPE_LABELS } from '../../shared/types';

interface StatusBadgeProps {
  status: RecordStatus;
  anomalyType?: AnomalyType;
  showIcon?: boolean;
}

export function StatusBadge({ status, anomalyType, showIcon = true }: StatusBadgeProps) {
  const iconMap = {
    pending: Clock,
    approved: CheckCircle,
    rejected: XCircle,
    anomaly: AlertTriangle,
  };

  const Icon = iconMap[status];
  const label = anomalyType ? ANOMALY_TYPE_LABELS[anomalyType] : STATUS_LABELS[status];

  return (
    <span className={`badge badge-${status}`}>
      {showIcon && <Icon className="w-3 h-3" />}
      {label}
    </span>
  );
}
