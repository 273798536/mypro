import { AlertTriangle, AlertCircle, Info, X, CheckCircle } from 'lucide-react';
import { useExperimentStore } from '../store/useExperimentStore';
import { Anomaly, AnomalySeverity } from '../types';

const severityConfig: Record<AnomalySeverity, {
  bgColor: string;
  borderColor: string;
  textColor: string;
  icon: typeof AlertTriangle;
}> = {
  error: {
    bgColor: 'bg-red-900/30',
    borderColor: 'border-red-500',
    textColor: 'text-red-400',
    icon: AlertCircle,
  },
  warning: {
    bgColor: 'bg-amber-900/30',
    borderColor: 'border-amber-500',
    textColor: 'text-amber-400',
    icon: AlertTriangle,
  },
  info: {
    bgColor: 'bg-blue-900/30',
    borderColor: 'border-blue-500',
    textColor: 'text-blue-400',
    icon: Info,
  },
};

export function AnomalyBanner() {
  const { anomalies, resolveAnomaly } = useExperimentStore();
  const unresolvedAnomalies = anomalies.filter((a) => !a.resolved);

  if (unresolvedAnomalies.length === 0) {
    return null;
  }

  return (
    <div className="space-y-2">
      {unresolvedAnomalies.map((anomaly) => (
        <AnomalyItem
          key={anomaly.id}
          anomaly={anomaly}
          onResolve={() => resolveAnomaly(anomaly.id)}
        />
      ))}
    </div>
  );
}

interface AnomalyItemProps {
  anomaly: Anomaly;
  onResolve: () => void;
}

function AnomalyItem({ anomaly, onResolve }: AnomalyItemProps) {
  const config = severityConfig[anomaly.severity];
  const Icon = config.icon;

  return (
    <div
      className={`flex items-start gap-3 p-3 rounded-lg border ${config.bgColor} ${config.borderColor} animate-slideIn`}
    >
      <Icon className={`w-5 h-5 flex-shrink-0 mt-0.5 ${config.textColor}`} />
      <div className="flex-1 min-w-0">
        <p className={`font-medium ${config.textColor}`}>{anomaly.message}</p>
        <p className="text-sm text-slate-400 mt-1">{anomaly.suggestion}</p>
      </div>
      <button
        onClick={onResolve}
        className="flex-shrink-0 p-1 hover:bg-slate-700 rounded transition-colors"
        title="标记为已解决"
      >
        <CheckCircle className="w-5 h-5 text-slate-400 hover:text-green-400" />
      </button>
    </div>
  );
}
