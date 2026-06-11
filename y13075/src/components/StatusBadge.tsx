import type { PointStatus } from 'shared/types';
import { POINT_STATUS_LABEL } from 'shared/types';
import { CheckCircle2, AlertTriangle, XCircle, CircleDot } from 'lucide-react';

const STYLES: Record<PointStatus, string> = {
  normal: 'bg-green-50 text-status-normal border-green-200',
  pending: 'bg-amber-50 text-status-pending border-amber-200',
  confirmed_anomaly: 'bg-red-50 text-status-anomaly border-red-200',
  dismissed: 'bg-gray-50 text-gray-600 border-gray-200',
};

const ICONS: Record<PointStatus, any> = {
  normal: CheckCircle2,
  pending: AlertTriangle,
  confirmed_anomaly: XCircle,
  dismissed: CircleDot,
};

export default function StatusBadge({ status }: { status: PointStatus }) {
  const Icon = ICONS[status];
  return (
    <span className={`chip border ${STYLES[status]}`}>
      <Icon className="w-3.5 h-3.5" />
      {POINT_STATUS_LABEL[status]}
    </span>
  );
}
