import React, { useEffect } from 'react';
import { AlertTriangle, AlertCircle, X } from 'lucide-react';
import { useGameStore } from '@/store/gameStore';
import { cn } from '@/lib/utils';

export function AnomalyToast() {
  const { anomalies, dismissAnomaly } = useGameStore();

  useEffect(() => {
    const timers: NodeJS.Timeout[] = [];
    anomalies.forEach((anomaly) => {
      const timer = setTimeout(() => {
        dismissAnomaly(anomaly.id);
      }, 8000);
      timers.push(timer);
    });
    return () => timers.forEach(clearTimeout);
  }, [anomalies, dismissAnomaly]);

  if (anomalies.length === 0) return null;

  return (
    <div className="fixed top-4 right-4 z-50 space-y-2 max-w-md">
      {anomalies.map((anomaly) => (
        <div
          key={anomaly.id}
          className={cn(
            'p-4 rounded-lg shadow-lg border animate-in slide-in-from-right duration-300',
            anomaly.severity === 'danger'
              ? 'bg-red-900/90 border-red-500 text-white'
              : 'bg-yellow-900/90 border-yellow-500 text-white'
          )}
        >
          <div className="flex items-start gap-3">
            <div className="flex-shrink-0">
              {anomaly.severity === 'danger' ? (
                <AlertCircle className="w-5 h-5 text-red-300" />
              ) : (
                <AlertTriangle className="w-5 h-5 text-yellow-300" />
              )}
            </div>
            <div className="flex-1 min-w-0">
              <h4 className="font-semibold text-sm mb-1">{anomaly.message}</h4>
              <p className="text-xs opacity-80">{anomaly.suggestion}</p>
            </div>
            <button
              onClick={() => dismissAnomaly(anomaly.id)}
              className="flex-shrink-0 p-1 hover:bg-white/10 rounded transition-colors"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>
      ))}
    </div>
  );
}
