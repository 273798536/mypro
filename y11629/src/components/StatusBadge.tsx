import { TxStatus, AnomalyType } from '../types';
import { getStatusLabel, getAnomalyLabel } from '../utils/export';

interface StatusBadgeProps {
  status: TxStatus;
  anomalies?: AnomalyType[];
  showAnomaly?: boolean;
}

const statusConfig: Record<TxStatus, { bg: string; text: string; dot: string }> = {
  normal: { bg: 'bg-emerald-900/30', text: 'text-emerald-400', dot: 'bg-emerald-400' },
  anomaly: { bg: 'bg-red-900/30', text: 'text-red-400', dot: 'bg-red-400 animate-pulse-slow' },
  revised: { bg: 'bg-blue-900/30', text: 'text-blue-400', dot: 'bg-blue-400' },
  pending_review: { bg: 'bg-amber-900/30', text: 'text-amber-400', dot: 'bg-amber-400 animate-pulse-slow' },
};

export default function StatusBadge({ status, anomalies = [], showAnomaly = true }: StatusBadgeProps) {
  const config = statusConfig[status];
  
  return (
    <div className="flex flex-col gap-1">
      <span className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium ${config.bg} ${config.text}`}>
        <span className={`status-dot ${config.dot}`}></span>
        {getStatusLabel(status)}
      </span>
      {showAnomaly && anomalies.length > 0 && (
        <div className="flex flex-wrap gap-1">
          {anomalies.map(a => (
            <span
              key={a}
              className="inline-block px-1.5 py-0.5 text-[10px] bg-red-900/50 text-red-300 rounded"
              title={getAnomalyLabel(a)}
            >
              {getAnomalyLabel(a)}
            </span>
          ))}
        </div>
      )}
    </div>
  );
}
