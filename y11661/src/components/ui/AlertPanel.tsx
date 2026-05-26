import { AlertTriangle, CheckCircle, XCircle, FileText, Clock, ChevronRight } from 'lucide-react';
import { useDataStore } from '../../stores/useDataStore';
import { useFilterStore } from '../../stores/useFilterStore';
import type { Alert } from '../../types';

const SEVERITY_CONFIG = {
  warning: { bg: 'bg-yellow-900/50', border: 'border-yellow-600', icon: <AlertTriangle className="w-4 h-4 text-yellow-400" /> },
  error: { bg: 'bg-red-900/50', border: 'border-red-600', icon: <XCircle className="w-4 h-4 text-red-400" /> },
  critical: { bg: 'bg-red-900/70', border: 'border-red-500', icon: <XCircle className="w-4 h-4 text-red-300" /> },
};

const TYPE_LABELS: Record<string, string> = {
  coordinate_flip: '坐标翻转',
  heat_overflow: '热度异常',
  trajectory_collision: '轨迹穿墙',
  data_invalid: '数据无效',
  out_of_bounds: '越界警告',
};

interface AlertItemProps {
  alert: Alert;
  onResolve: (id: string) => void;
  onClick: (alert: Alert) => void;
}

function AlertItem({ alert, onResolve, onClick }: AlertItemProps) {
  const severityConfig = SEVERITY_CONFIG[alert.severity] || SEVERITY_CONFIG.error;

  return (
    <div
      className={`p-3 rounded-lg border ${severityConfig.bg} ${severityConfig.border} ${
        alert.resolved ? 'opacity-60' : ''
      } cursor-pointer hover:brightness-110 transition-all`}
      onClick={() => onClick(alert)}
    >
      <div className="flex items-start gap-2">
        {severityConfig.icon}
        <div className="flex-1 min-w-0">
          <div className="flex items-center justify-between">
            <span className="text-sm font-medium text-white truncate">
              {TYPE_LABELS[alert.type] || alert.type}
            </span>
            {alert.resolved && <CheckCircle className="w-4 h-4 text-green-400" />}
          </div>
          <p className="text-xs text-gray-300 mt-1 line-clamp-2">{alert.message}</p>
          <div className="mt-2 flex items-center gap-3 text-xs text-gray-400">
            <span className="flex items-center gap-1">
              <FileText className="w-3 h-3" />
              {alert.source.fileName}:{alert.source.lineNumber}
            </span>
            <span className="flex items-center gap-1">
              <Clock className="w-3 h-3" />
              {new Date(alert.timestamp).toLocaleTimeString()}
            </span>
          </div>
          {alert.correction && (
            <div className="mt-2 p-2 bg-gray-800 rounded text-xs">
              <div className="text-gray-400">已修正: {alert.correction.before} → {alert.correction.after}</div>
              <div className="text-gray-500 mt-1">操作人: {alert.correction.operator}</div>
            </div>
          )}
        </div>
        <ChevronRight className="w-4 h-4 text-gray-500" />
      </div>
      {!alert.resolved && (
        <button
          onClick={(e) => {
            e.stopPropagation();
            onResolve(alert.id);
          }}
          className="mt-2 w-full py-1 text-xs text-center bg-gray-700 hover:bg-gray-600 rounded text-gray-300 transition-colors"
        >
          标记为已解决
        </button>
      )}
    </div>
  );
}

export function AlertPanel() {
  const { alerts, resolveAlert } = useDataStore();
  const { alertTypes, showOnlyUnresolved } = useFilterStore();

  const filteredAlerts = alerts
    .filter((alert) => {
      if (showOnlyUnresolved && alert.resolved) return false;
      if (alertTypes.length > 0 && !alertTypes.includes(alert.type)) return false;
      return true;
    })
    .sort((a, b) => {
      if (a.resolved !== b.resolved) return a.resolved ? 1 : -1;
      return b.timestamp - a.timestamp;
    });

  const unresolvedCount = alerts.filter((a) => !a.resolved).length;
  const criticalCount = alerts.filter((a) => a.severity === 'critical' && !a.resolved).length;

  const handleAlertClick = (alert: Alert) => {
    if (alert.position) {
      console.log('定位到异常位置:', alert.position);
    }
  };

  return (
    <div className="w-80 bg-gray-800 border-l border-gray-700 flex flex-col h-full">
      <div className="p-4 border-b border-gray-700">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <AlertTriangle className="w-5 h-5 text-red-400" />
            <h2 className="font-semibold text-white">异常告警</h2>
          </div>
          <div className="flex items-center gap-2">
            {criticalCount > 0 && (
              <span className="px-2 py-0.5 bg-red-600 text-white text-xs rounded-full">
                严重 {criticalCount}
              </span>
            )}
            <span className="px-2 py-0.5 bg-yellow-600 text-white text-xs rounded-full">
              待处理 {unresolvedCount}
            </span>
          </div>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto p-3 space-y-3">
        {filteredAlerts.length === 0 ? (
          <div className="text-center py-8 text-gray-500">
            <CheckCircle className="w-12 h-12 mx-auto mb-2 opacity-50" />
            <p>暂无异常告警</p>
          </div>
        ) : (
          filteredAlerts.map((alert) => (
            <AlertItem
              key={alert.id}
              alert={alert}
              onResolve={resolveAlert}
              onClick={handleAlertClick}
            />
          ))
        )}
      </div>

      <div className="p-3 border-t border-gray-700 bg-gray-900">
        <div className="text-xs text-gray-500">
          <div>数据来源: shelf_coordinates_2024.csv 等 4 个文件</div>
          <div className="mt-1">最后检查: {new Date().toLocaleString()}</div>
        </div>
      </div>
    </div>
  );
}
