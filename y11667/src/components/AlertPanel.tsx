import { AlertTriangle, XCircle, Clock, Copy as CopyIcon } from 'lucide-react';
import { useWarehouseStore } from '@/store/useWarehouseStore';

const alertTypeConfig = {
  duplicate: {
    icon: CopyIcon,
    label: '重复仓单',
    color: 'red',
  },
  overload: {
    icon: XCircle,
    label: '库容超限',
    color: 'red',
  },
  quality_fail: {
    icon: AlertTriangle,
    label: '质检未过',
    color: 'yellow',
  },
  delivery_soon: {
    icon: Clock,
    label: '交割临近',
    color: 'purple',
  },
};

export function AlertPanel() {
  const { alerts, focusSlot } = useWarehouseStore();

  const alertCounts = alerts.reduce(
    (acc, alert) => {
      acc[alert.type] = (acc[alert.type] || 0) + 1;
      return acc;
    },
    {} as Record<string, number>
  );

  const handleAlertClick = (alert: { id: string; type: string; message: string; slotId?: string }) => {
    if (alert.slotId) {
      focusSlot(alert.slotId);
    }
  };

  return (
    <div className="w-72 bg-slate-900/90 backdrop-blur-md border-l border-slate-700 h-full flex flex-col">
      <div className="p-4 border-b border-slate-700">
        <div className="flex items-center gap-2">
          <AlertTriangle className="w-5 h-5 text-amber-400" />
          <h2 className="text-white font-semibold">预警信息</h2>
        </div>
        <div className="flex gap-2 mt-2">
          {Object.entries(alertTypeConfig).map(([type, config]) => {
            const count = alertCounts[type] || 0;
            const Icon = config.icon;
            return (
              <div
                key={type}
                className={`flex items-center gap-1 px-2 py-1 rounded text-xs ${
                  config.color === 'red'
                    ? 'bg-red-500/20 text-red-400'
                    : config.color === 'yellow'
                    ? 'bg-yellow-500/20 text-yellow-400'
                    : 'bg-purple-500/20 text-purple-400'
                }`}
              >
                <Icon className="w-3 h-3" />
                <span>{count}</span>
              </div>
            );
          })}
        </div>
      </div>

      <div className="flex-1 overflow-y-auto p-3 space-y-2">
        {alerts.length === 0 ? (
          <div className="text-center text-slate-500 text-sm py-8">
          暂无预警
        </div>
      ) : (
          alerts.map((alert) => {
            const config = alertTypeConfig[alert.type as keyof typeof alertTypeConfig];
            const Icon = config.icon;
            return (
              <button
                key={alert.id}
                onClick={() => handleAlertClick(alert)}
                className={`w-full text-left p-3 rounded-lg border transition-all ${
                  alert.severity === 'error'
                    ? 'bg-red-500/10 border-red-500/30 hover:bg-red-500/20'
                    : 'bg-yellow-500/10 border-yellow-500/30 hover:bg-yellow-500/20'
                }`}
              >
                <div className="flex items-start gap-2">
                  <Icon
                    className={`w-4 h-4 mt-0.5 flex-shrink-0 ${
                      alert.severity === 'error' ? 'text-red-400' : 'text-yellow-400'
                    }`}
                  />
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <span
                        className={`text-xs font-medium ${
                          alert.severity === 'error' ? 'text-red-400' : 'text-yellow-400'
                        }`}
                      >
                        {config.label}
                      </span>
                    </div>
                    <p className="text-xs text-slate-300 leading-relaxed">
                      {alert.message}
                    </p>
                  </div>
                </div>
              </button>
            );
          })
        )}
      </div>
    </div>
  );
}
