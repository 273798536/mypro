
import { AlertTriangle, XCircle, Info, X } from 'lucide-react';
import type { Alert } from '../../types';
import { useExperimentStore } from '../../store/useExperimentStore';

function AlertIcon({ type }: { type: Alert['type'] }) {
  switch (type) {
    case 'error':
      return <XCircle size={18} className="text-red-400" />;
    case 'warning':
      return <AlertTriangle size={18} className="text-yellow-400" />;
    case 'info':
      return <Info size={18} className="text-blue-400" />;
    default:
      return <Info size={18} />;
  }
}

function getAlertStyles(type: Alert['type']) {
  switch (type) {
    case 'error':
      return 'bg-red-900/80 border-red-600';
    case 'warning':
      return 'bg-yellow-900/80 border-yellow-600';
    case 'info':
      return 'bg-blue-900/80 border-blue-600';
    default:
      return 'bg-slate-900/80 border-slate-600';
  }
}

export function AlertBanner() {
  const { alerts, removeAlert } = useExperimentStore();

  if (alerts.length === 0) return null;

  return (
    <div className="fixed top-4 left-1/2 transform -translate-x-1/2 z-50 space-y-2 w-full max-w-2xl px-4">
      {alerts.map((alert) => (
        <div
          key={alert.id}
          className={`flex items-start gap-3 p-3 rounded-lg border backdrop-blur-sm ${getAlertStyles(
            alert.type
          )}`}
        >
          <AlertIcon type={alert.type} />
          <div className="flex-1 min-w-0">
            <div className="text-white font-medium text-sm">{alert.message}</div>
            {alert.details && (
              <div className="text-slate-300 text-xs mt-1">{alert.details}</div>
            )}
          </div>
          <button
            onClick={() => removeAlert(alert.id)}
            className="text-slate-400 hover:text-white transition-colors"
          >
            <X size={16} />
          </button>
        </div>
      ))}
    </div>
  );
}
