import { ScanStatus, AnomalyStatus, AnomalySeverity } from '../types';

interface StatusBadgeProps {
  type: 'scan' | 'anomaly' | 'severity';
  status: ScanStatus | AnomalyStatus | AnomalySeverity;
}

const scanStatusConfig: Record<ScanStatus, { label: string; className: string }> = {
  draft: { label: '草稿', className: 'bg-gray-100 text-gray-600 border-gray-200' },
  pending: { label: '待确认', className: 'bg-amber-50 text-amber-700 border-amber-200' },
  confirmed: { label: '已确认', className: 'bg-green-50 text-green-700 border-green-200' },
  anomaly: { label: '异常', className: 'bg-red-50 text-red-700 border-red-200' },
};

const anomalyStatusConfig: Record<AnomalyStatus, { label: string; className: string }> = {
  pending: { label: '待确认', className: 'bg-amber-50 text-amber-700 border-amber-200' },
  confirmed: { label: '已确认', className: 'bg-blue-50 text-blue-700 border-blue-200' },
  resolved: { label: '已解决', className: 'bg-green-50 text-green-700 border-green-200' },
};

const severityConfig: Record<AnomalySeverity, { label: string; className: string }> = {
  low: { label: '低', className: 'bg-gray-100 text-gray-600 border-gray-200' },
  medium: { label: '中', className: 'bg-amber-50 text-amber-700 border-amber-200' },
  high: { label: '高', className: 'bg-red-50 text-red-700 border-red-200' },
};

export const StatusBadge = ({ type, status }: StatusBadgeProps) => {
  let config;
  switch (type) {
    case 'scan':
      config = scanStatusConfig[status as ScanStatus];
      break;
    case 'anomaly':
      config = anomalyStatusConfig[status as AnomalyStatus];
      break;
    case 'severity':
      config = severityConfig[status as AnomalySeverity];
      break;
    default:
      return null;
  }

  return (
    <span
      className={`inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium border ${config.className}`}
    >
      {config.label}
    </span>
  );
};
