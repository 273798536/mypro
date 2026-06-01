import { useBatteryStore } from '../../store/useBatteryStore';
import { AlertTriangle, Zap, Thermometer, X } from 'lucide-react';

export const AnomalyList = () => {
  const { currentBatch, selectedAnomaly, selectAnomaly, setCycleIndex } = useBatteryStore();

  if (!currentBatch) return null;

  const allAnomalies = currentBatch.cycles.flatMap((cycle) =>
    cycle.anomalies.map((anomaly) => ({
      ...anomaly,
      cycleData: cycle
    }))
  );

  const getAnomalyInfo = (type: string) => {
    switch (type) {
      case 'interruption':
        return {
          icon: <AlertTriangle className="w-4 h-4" />,
          label: '中断重启',
          color: 'text-red-400',
          bgColor: 'bg-red-400/10'
        };
      case 'rate_change':
        return {
          icon: <Zap className="w-4 h-4" />,
          label: '倍率切换',
          color: 'text-yellow-400',
          bgColor: 'bg-yellow-400/10'
        };
      case 'temperature_drift':
        return {
          icon: <Thermometer className="w-4 h-4" />,
          label: '温度漂移',
          color: 'text-orange-400',
          bgColor: 'bg-orange-400/10'
        };
      default:
        return { icon: null, label: type, color: 'text-gray-400', bgColor: 'bg-gray-400/10' };
    }
  };

  const getSeverityColor = (severity: string) => {
    switch (severity) {
      case 'high': return 'bg-red-500';
      case 'medium': return 'bg-yellow-500';
      case 'low': return 'bg-green-500';
      default: return 'bg-gray-500';
    }
  };

  return (
    <div className="h-full flex flex-col">
      <div className="p-3 border-b border-dark-lighter flex items-center justify-between">
        <h3 className="font-semibold text-sm text-gray-300">异常事件</h3>
        <span className="text-xs bg-dark-lighter px-2 py-1 rounded-full">
          {allAnomalies.length} 条
        </span>
      </div>
      <div className="flex-1 overflow-y-auto">
        {allAnomalies.map((anomaly) => {
          const info = getAnomalyInfo(anomaly.type);
          const isSelected = selectedAnomaly?.id === anomaly.id;

          return (
            <div
              key={anomaly.id}
              onClick={() => {
                selectAnomaly(isSelected ? null : anomaly);
                setCycleIndex(anomaly.cycleNumber - 1);
              }}
              className={`p-3 border-b border-dark-lighter cursor-pointer transition-all ${
                isSelected ? 'bg-primary/10 border-l-2 border-l-primary' : 'hover:bg-dark-lighter/50'
              }`}
            >
              <div className="flex items-start gap-3">
                <div className={`p-2 rounded-lg ${info.bgColor} ${info.color}`}>
                  {info.icon}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1">
                    <span className={`text-xs font-medium ${info.color}`}>
                      {info.label}
                    </span>
                    <span className={`w-2 h-2 rounded-full ${getSeverityColor(anomaly.severity)}`} />
                    <span className="font-mono text-xs text-gray-400">
                      #{anomaly.cycleNumber}
                    </span>
                  </div>
                  <p className="text-sm text-gray-300 truncate">
                    {anomaly.description}
                  </p>
                  <p className="text-xs text-gray-500 mt-1">
                    {new Date(anomaly.timestamp).toLocaleString('zh-CN')}
                  </p>
                </div>
                {isSelected && (
                  <X className="w-4 h-4 text-gray-400" />
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};
