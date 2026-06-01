import { useBatteryStore } from '../../store/useBatteryStore';
import { AlertTriangle, Zap, Thermometer } from 'lucide-react';

export const CycleList = () => {
  const { currentBatch, currentCycleIndex, setCycleIndex, selectedAnomaly, selectAnomaly } = useBatteryStore();

  if (!currentBatch) return null;

  const getAnomalyIcon = (type: string) => {
    switch (type) {
      case 'interruption':
        return <AlertTriangle className="w-3 h-3 text-red-400" />;
      case 'rate_change':
        return <Zap className="w-3 h-3 text-yellow-400" />;
      case 'temperature_drift':
        return <Thermometer className="w-3 h-3 text-orange-400" />;
      default:
        return null;
    }
  };

  return (
    <div className="h-full flex flex-col">
      <div className="p-3 border-b border-dark-lighter">
        <h3 className="font-semibold text-sm text-gray-300">循环记录</h3>
      </div>
      <div className="flex-1 overflow-y-auto">
        {currentBatch.cycles.slice(Math.max(0, currentCycleIndex - 5), currentCycleIndex + 10).map((cycle) => (
          <div
            key={cycle.id}
            onClick={() => setCycleIndex(cycle.cycleNumber - 1)}
            className={`p-3 border-b border-dark-lighter cursor-pointer transition-colors hover:bg-dark-lighter/50 ${
              cycle.cycleNumber === currentCycleIndex + 1 ? 'bg-primary/10 border-l-2 border-l-primary' : ''
            }`}
          >
            <div className="flex items-center justify-between mb-1">
              <span className="font-mono text-sm font-medium text-primary">
                #{cycle.cycleNumber}
              </span>
              {cycle.anomalies.length > 0 && (
                <div className="flex gap-1">
                  {cycle.anomalies.map((a) => (
                    <button
                      key={a.id}
                      onClick={(e) => {
                        e.stopPropagation();
                        selectAnomaly(selectedAnomaly?.id === a.id ? null : a);
                      }}
                      className={`p-1 rounded ${
                        selectedAnomaly?.id === a.id ? 'bg-primary/30' : 'hover:bg-dark-lighter'
                      }`}
                    >
                      {getAnomalyIcon(a.type)}
                    </button>
                  ))}
                </div>
              )}
            </div>
            <div className="grid grid-cols-2 gap-2 text-xs">
              <div>
                <span className="text-gray-500">容量: </span>
                <span className="font-mono text-gray-300">
                  {cycle.capacityRetention.toFixed(1)}%
                </span>
              </div>
              <div>
                <span className="text-gray-500">倍率: </span>
                <span className="font-mono text-gray-300">
                  {cycle.chargeRate}C/{cycle.dischargeRate}C
                </span>
              </div>
              <div>
                <span className="text-gray-500">温度: </span>
                <span className="font-mono text-gray-300">
                  {cycle.avgTemperature.toFixed(1)}°C
                </span>
              </div>
              <div>
                <span className="text-gray-500">效率: </span>
                <span className="font-mono text-gray-300">
                  {cycle.energyEfficiency.toFixed(1)}%
                </span>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};
