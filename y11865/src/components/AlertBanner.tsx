import { AlertTriangle, X } from 'lucide-react';
import { useAppStore } from '../store';

export default function AlertBanner() {
  const { alerts, clearAlerts } = useAppStore();

  const criticalAlerts = alerts.filter((a) => a.severity === 'error');

  if (criticalAlerts.length === 0) return null;

  return (
    <div className="absolute top-0 left-0 right-0 z-10">
      <div className="bg-red-900/90 backdrop-blur-sm border-b border-red-500/50 px-6 py-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="relative">
              <AlertTriangle className="w-6 h-6 text-red-400" />
              <span className="absolute -top-1 -right-1 w-4 h-4 bg-red-500 rounded-full text-[10px] flex items-center justify-center text-white font-bold">
                {criticalAlerts.length}
              </span>
            </div>
            <div>
              <div className="text-sm font-semibold text-white">
                检测到 {criticalAlerts.length} 个关键问题
              </div>
              <div className="text-xs text-red-300">
                这些问题可能影响模拟结果的准确性
              </div>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <div className="max-w-md overflow-hidden">
              <p className="text-sm text-red-200 truncate">
                {criticalAlerts[0]?.message}
              </p>
            </div>
            <button
              onClick={clearAlerts}
              className="p-1 rounded hover:bg-red-800 text-red-300 hover:text-white transition-colors"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
