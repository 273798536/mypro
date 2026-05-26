import React, { useState, useEffect } from 'react';
import { useGameStore } from '../../store/useGameStore';
import { formatTime } from '../../utils/export';
import { X, AlertCircle, AlertTriangle, Clock, Users } from 'lucide-react';

const anomalyIcons: Record<string, { icon: React.ReactNode; color: string }> = {
  skip_station: { icon: <AlertCircle size={18} />, color: 'text-dispatch-danger' },
  interval_imbalance: { icon: <AlertTriangle size={18} />, color: 'text-dispatch-warning' },
  detour_timeout: { icon: <Clock size={18} />, color: 'text-dispatch-warning' },
  overcrowding: { icon: <Users size={18} />, color: 'text-dispatch-warning' },
};

const anomalyLabels: Record<string, string> = {
  skip_station: '跳站投诉',
  interval_imbalance: '间隔失衡',
  detour_timeout: '绕行超时',
  overcrowding: '车辆满载',
};

interface AnomalyAlertProps {
  onClose?: () => void;
}

export const AnomalyAlert: React.FC<AnomalyAlertProps> = () => {
  const { anomalies, resolveAnomaly } = useGameStore();
  const [dismissedIds, setDismissedIds] = useState<Set<string>>(new Set());

  const unresolvedAnomalies = anomalies.filter(
    (a) => !a.resolved && !dismissedIds.has(a.id)
  ).slice(-3);

  useEffect(() => {
    const interval = setInterval(() => {
      anomalies.forEach((a) => {
        if (a.resolved && dismissedIds.has(a.id)) {
          setDismissedIds((prev) => {
            const next = new Set(prev);
            next.delete(a.id);
            return next;
          });
        }
      });
    }, 1000);
    return () => clearInterval(interval);
  }, [anomalies, dismissedIds]);

  if (unresolvedAnomalies.length === 0) return null;

  return (
    <div className="fixed top-20 left-1/2 transform -translate-x-1/2 z-50 space-y-2 pointer-events-none">
      {unresolvedAnomalies.map((anomaly) => {
        const config = anomalyIcons[anomaly.type] || anomalyIcons.skip_station;
        return (
          <div
            key={anomaly.id}
            className={`animate-slide-in bg-dispatch-danger/95 backdrop-blur text-white px-6 py-4 rounded-lg shadow-2xl border border-dispatch-danger/50 pointer-events-auto max-w-lg`}
          >
            <div className="flex items-start gap-3">
              <div className="p-2 bg-white/20 rounded-lg">{config.icon}</div>
              <div className="flex-1 min-w-0">
                <div className="font-mono font-semibold flex items-center gap-2">
                  <span>{anomalyLabels[anomaly.type] || '异常'}</span>
                  <span className="text-sm opacity-80">
                    [{formatTime(anomaly.timestamp)}]</span>
                  </div>
                <div className="text-sm opacity-90 mt-1">{anomaly.description}</div>
                <div className="text-xs opacity-70 mt-1">
                  扣 {anomaly.scoreImpact} 分
                </div>
              </div>
              <button
                onClick={() => {
                  setDismissedIds((prev) => new Set(prev).add(anomaly.id));
                  resolveAnomaly(anomaly.id);
                }}
                className="p-1 hover:bg-white/20 rounded transition-colors"
              >
                <X size={16} />
              </button>
            </div>
          </div>
        );
      })}
    </div>
  );
};
