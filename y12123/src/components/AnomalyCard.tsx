import { AlertTriangle, Lightbulb } from 'lucide-react';
import type { DataAnomaly } from '../types';
import { ANOMALY_TYPE_LABELS, ANOMALY_TYPE_COLORS } from '../types';

interface AnomalyCardProps {
  anomaly: DataAnomaly;
  showSuggestion?: boolean;
}

export function AnomalyCard({ anomaly, showSuggestion = true }: AnomalyCardProps) {
  const severityColors = {
    low: 'bg-blue-50 border-blue-200 text-blue-800',
    medium: 'bg-amber-50 border-amber-200 text-amber-800',
    high: 'bg-red-50 border-red-200 text-red-800',
  };

  const severityLabels = {
    low: '低',
    medium: '中',
    high: '高',
  };

  return (
    <div className={`p-3 rounded-lg border ${severityColors[anomaly.severity]} animate-pulse-slow`}>
      <div className="flex items-start gap-2">
        <AlertTriangle className="w-4 h-4 mt-0.5 flex-shrink-0" />
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <span
              className="text-xs font-medium px-2 py-0.5 rounded-full"
              style={{
                backgroundColor: `${ANOMALY_TYPE_COLORS[anomaly.type]}20`,
                color: ANOMALY_TYPE_COLORS[anomaly.type],
              }}
            >
              {ANOMALY_TYPE_LABELS[anomaly.type]}
            </span>
            <span className="text-xs opacity-70">
              严重度: {severityLabels[anomaly.severity]}
            </span>
            <span className="text-xs opacity-60 ml-auto">
              会员: {anomaly.memberId}
            </span>
          </div>
          <p className="text-sm mt-1">{anomaly.description}</p>
          {showSuggestion && (
            <div className="mt-2 flex items-start gap-1.5">
              <Lightbulb className="w-3.5 h-3.5 mt-0.5 flex-shrink-0 text-amber-600" />
              <p className="text-xs opacity-80">{anomaly.suggestion}</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
