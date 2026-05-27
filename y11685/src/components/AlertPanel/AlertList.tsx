import { useMineStore } from '@/store/useMineStore';
import { AlertTriangle, XCircle, Lightbulb, Target } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Alert } from '@/types';

const alertTypeConfig: Record<Alert['type'], { label: string; icon: typeof AlertTriangle }> = {
  door_error: { label: '风门错误', icon: XCircle },
  smoke_reverse: { label: '烟雾倒流', icon: AlertTriangle },
  route_cross_wall: { label: '路线穿墙', icon: Target },
};

export function AlertList() {
  const selectedRecord = useMineStore((state) => state.getSelectedRecord());
  const setSelectedObject = useMineStore((state) => state.setSelectedObject);

  if (!selectedRecord || selectedRecord.alerts.length === 0) {
    return (
      <div className="bg-green-500/10 border border-green-500/30 rounded-lg p-4">
        <div className="flex items-center gap-2">
          <Lightbulb className="w-5 h-5 text-green-400" />
          <span className="text-green-400 text-sm font-medium">无告警，状态正常</span>
        </div>
      </div>
    );
  }

  const handleAlertClick = (alert: Alert) => {
    if (alert.position && alert.objectId) {
      const typeMap: Record<string, 'door' | 'smoke' | 'person' | 'route'> = {
        door_error: 'door',
        smoke_reverse: 'smoke',
        route_cross_wall: 'route',
      };
      setSelectedObject({
        type: typeMap[alert.type] || 'door',
        id: alert.objectId,
        position: alert.position,
      });
    }
  };

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <AlertTriangle className="w-4 h-4 text-red-400" />
          <h3 className="text-sm font-semibold text-gray-200">告警列表</h3>
        </div>
        <span className="text-xs bg-red-500/20 text-red-400 px-2 py-1 rounded-full">
          {selectedRecord.alerts.length} 项
        </span>
      </div>

      <div className="space-y-2 max-h-[250px] overflow-y-auto pr-1">
        {selectedRecord.alerts.map((alert) => {
          const config = alertTypeConfig[alert.type];
          const Icon = config.icon;
          const severityColor = alert.severity === 'error' ? 'red' : 'orange';

          return (
            <button
              key={alert.id}
              onClick={() => handleAlertClick(alert)}
              className={cn(
                'w-full text-left p-3 rounded-lg transition-all duration-200',
                'border',
                severityColor === 'red'
                  ? 'bg-red-500/10 border-red-500/30 hover:bg-red-500/20'
                  : 'bg-orange-500/10 border-orange-500/30 hover:bg-orange-500/20'
              )}
            >
              <div className="flex items-start gap-2">
                <Icon
                  className={cn(
                    'w-4 h-4 mt-0.5 flex-shrink-0',
                    severityColor === 'red' ? 'text-red-400' : 'text-orange-400'
                  )}
                />
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1">
                    <span
                      className={cn(
                        'text-xs px-2 py-0.5 rounded-full',
                        severityColor === 'red'
                          ? 'bg-red-500/30 text-red-300'
                          : 'bg-orange-500/30 text-orange-300'
                      )}
                    >
                      {config.label}
                    </span>
                    <span
                      className={cn(
                        'text-xs',
                        severityColor === 'red' ? 'text-red-400' : 'text-orange-400'
                      )}
                    >
                      {alert.severity === 'error' ? '严重' : '警告'}
                    </span>
                  </div>
                  <p className="text-sm text-gray-200 mb-1">{alert.message}</p>
                  <p className="text-xs text-gray-400">
                    <span className="text-blue-400">建议：</span>
                    {alert.suggestion}
                  </p>
                </div>
              </div>
            </button>
          );
        })}
      </div>
    </div>
  );
}
