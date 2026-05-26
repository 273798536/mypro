import type { Anomaly } from '../../types';
import { AlertTriangle, XCircle, Clock, FileX } from 'lucide-react';
import { getSeverityColor, getSeverityLabel } from '../../utils/anomalyDetector';

interface AnomalyBadgeProps {
  anomaly: Anomaly;
}

const anomalyIcons = {
  guarantee_expired: XCircle,
  missing_repayment: AlertTriangle,
  approval_withdrawn: FileX,
  expiring_soon: Clock
};

export default function AnomalyBadge({ anomaly }: AnomalyBadgeProps) {
  const Icon = anomalyIcons[anomaly.type] || AlertTriangle;
  
  return (
    <div className={`flex items-center gap-2 px-3 py-2 rounded-lg ${getSeverityColor(anomaly.severity)}`}>
      <Icon size={16} />
      <div className="flex-1">
        <div className="text-sm font-medium">{anomaly.message}</div>
        <div className="text-xs opacity-75">{getSeverityLabel(anomaly.severity)}</div>
      </div>
    </div>
  );
}
