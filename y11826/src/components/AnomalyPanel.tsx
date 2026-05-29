import { useGameStore } from '../store/gameStore';
import { Anomaly } from '../types';

const getAnomalyIcon = (type: Anomaly['type']) => {
  switch (type) {
    case 'clustering': return '🚗🚗🚗';
    case 'overtime': return '⏰';
    case 'transfer_gap': return '🔄';
    case 'overload': return '👥';
    default: return '⚠️';
  }
};

const getAnomalyTitle = (type: Anomaly['type']) => {
  switch (type) {
    case 'clustering': return '车辆扎堆';
    case 'overtime': return '司机超时';
    case 'transfer_gap': return '换乘断档';
    case 'overload': return '站点超载';
    default: return '未知异常';
  }
};

export default function AnomalyPanel() {
  const anomalies = useGameStore(state => state.anomalies);
  const resolveAnomaly = useGameStore(state => state.resolveAnomaly);
  const buses = useGameStore(state => state.buses);

  const unresolvedAnomalies = anomalies.filter(a => !a.resolved);
  const resolvedAnomalies = anomalies.filter(a => a.resolved);

  const getBusPlateNumbers = (busIds: string[]) => {
    return busIds
      .map(id => buses.find(b => b.id === id)?.plateNumber)
      .filter(Boolean)
      .join('、');
  };

  return (
    <div className="flex flex-col h-full">
      <div className="p-4 border-b bg-gray-50">
        <h2 className="text-xl font-bold text-gray-800">🚨 异常预警</h2>
        <p className="text-sm text-gray-500 mt-1">
          {unresolvedAnomalies.length} 个待处理
        </p>
      </div>

      <div className="flex-1 overflow-y-auto p-4 space-y-3 scrollbar-thin">
        {unresolvedAnomalies.length === 0 ? (
          <div className="text-center py-12 text-gray-400">
            <div className="text-5xl mb-4">✅</div>
            <p>暂无异常，调度良好</p>
          </div>
        ) : (
          unresolvedAnomalies.map(anomaly => (
            <div
              key={anomaly.id}
              className={`p-4 rounded-xl border-2 transition-all hover:shadow-md cursor-pointer ${
                anomaly.severity === 'critical'
                  ? 'border-passenger-red bg-red-50 animate-pulse-critical'
                  : 'border-warning-orange bg-orange-50 animate-pulse-warning'
              }`}
              onClick={() => resolveAnomaly(anomaly.id)}
            >
              <div className="flex items-start justify-between mb-2">
                <div className="flex items-center gap-2">
                  <span className="text-2xl">{getAnomalyIcon(anomaly.type)}</span>
                  <div>
                    <h3 className="font-bold text-gray-800">
                      {getAnomalyTitle(anomaly.type)}
                    </h3>
                    <span className={`text-xs px-2 py-0.5 rounded ${
                      anomaly.severity === 'critical'
                        ? 'bg-passenger-red text-white'
                        : 'bg-warning-orange text-white'
                    }`}>
                      {anomaly.severity === 'critical' ? '严重' : '警告'}
                    </span>
                  </div>
                </div>
                <span className="text-xs text-gray-500">
                  第 {anomaly.roundDetected} 回合
                </span>
              </div>

              <p className="text-sm text-gray-700 mb-2">
                {anomaly.description}
              </p>

              {anomaly.busIds.length > 0 && (
                <p className="text-xs text-gray-600 mb-2">
                  涉及车辆: {getBusPlateNumbers(anomaly.busIds)}
                </p>
              )}

              <div className="flex items-center gap-2 text-sm">
                <span className="text-info-gray">👤 责任人:</span>
                <span className="font-medium text-traffic-blue">
                  {anomaly.responsibleRole}
                </span>
              </div>

              <div className="mt-3 p-2 bg-white rounded-lg">
                <p className="text-xs text-gray-600">
                  <span className="font-semibold">💡 建议:</span> {anomaly.suggestion}
                </p>
              </div>

              <p className="text-xs text-center text-gray-400 mt-2">
                点击标记为已处理
              </p>
            </div>
          ))
        )}

        {resolvedAnomalies.length > 0 && (
          <div className="mt-6">
            <h4 className="text-sm font-semibold text-gray-500 mb-3">
              ✅ 已处理 ({resolvedAnomalies.length})
            </h4>
            <div className="space-y-2">
              {resolvedAnomalies.slice(0, 5).map(anomaly => (
                <div
                  key={anomaly.id}
                  className="p-3 rounded-lg bg-gray-100 opacity-60"
                >
                  <div className="flex items-center gap-2">
                    <span>{getAnomalyIcon(anomaly.type)}</span>
                    <span className="text-sm text-gray-600 line-through">
                      {getAnomalyTitle(anomaly.type)}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
