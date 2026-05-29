import { AlertTriangle, X } from 'lucide-react';
import type { Anomaly } from '../../types';

interface AnomalyPanelProps {
  anomalies: Anomaly[];
  onClose: () => void;
}

const anomalyTypeConfig = {
  collision: { label: '碰撞', color: 'border-red-500 bg-red-900/20', icon: '💥' },
  low_battery: { label: '低电量', color: 'border-orange-500 bg-orange-900/20', icon: '🔋' },
  timeout: { label: '超时', color: 'border-yellow-500 bg-yellow-900/20', icon: '⏰' },
};

export function AnomalyPanel({ anomalies, onClose }: AnomalyPanelProps) {
  if (anomalies.length === 0) return null;

  return (
    <div className="fixed top-4 right-4 w-80 max-h-96 overflow-y-auto bg-slate-800 rounded-xl shadow-2xl border border-slate-700 z-50">
      <div className="p-4 border-b border-slate-700 flex items-center justify-between">
        <h3 className="font-bold text-white flex items-center gap-2">
          <AlertTriangle className="w-5 h-5 text-red-400" />
          异常记录 ({anomalies.length})
        </h3>
        <button
          onClick={onClose}
          className="p-1 hover:bg-slate-700 rounded transition-colors"
        >
          <X className="w-4 h-4 text-slate-400" />
        </button>
      </div>
      <div className="p-2 space-y-2">
        {anomalies.slice(-10).reverse().map(anomaly => {
          const config = anomalyTypeConfig[anomaly.type];
          return (
            <div
              key={anomaly.id}
              className={`p-3 rounded-lg border-l-4 ${config.color}`}
            >
              <div className="flex items-start justify-between gap-2">
                <div className="flex items-center gap-2">
                  <span>{config.icon}</span>
                  <span className="text-white text-sm">{anomaly.message}</span>
                </div>
              </div>
              <div className="mt-2 flex items-center justify-between text-xs">
                <span className="text-slate-400">
                  {new Date(anomaly.timestamp).toLocaleTimeString()}
                </span>
                <span className="text-red-400 font-medium">-{anomaly.penalty}分</span>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
