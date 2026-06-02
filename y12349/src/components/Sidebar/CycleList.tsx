import { useBatteryStore } from '../../store/useBatteryStore';
import { AlertTriangle, Zap, Thermometer } from 'lucide-react';

export const CycleList = () => {
  const { 
    currentBatch, 
    currentCycleIndex, 
    setCycleIndex, 
    selectedAnomaly, 
    selectAnomaly,
    filteredCycles,
    filters
  } = useBatteryStore();

  if (!currentBatch) return null;

  const isFiltered = 
    filters.chargeRateRange[0] !== 0 ||
    filters.chargeRateRange[1] !== 5 ||
    filters.temperatureRange[0] !== 20 ||
    filters.temperatureRange[1] !== 50 ||
    filters.anomalyTypes.length > 0;

  const displayCycles = isFiltered ? filteredCycles : currentBatch.cycles;

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

  const getCurrentIndexInDisplay = () => {
    const currentCycle = currentBatch.cycles[currentCycleIndex];
    if (!currentCycle) return -1;
    return displayCycles.findIndex(c => c.cycleNumber === currentCycle.cycleNumber);
  };

  const currentDisplayIndex = getCurrentIndexInDisplay();
  const startIndex = Math.max(0, currentDisplayIndex >= 0 ? currentDisplayIndex - 5 : 0);
  const visibleCycles = displayCycles.slice(startIndex, startIndex + 20);

  return (
    <div className="h-full flex flex-col">
      <div className="p-3 border-b border-dark-lighter">
        <div className="flex items-center justify-between">
          <h3 className="font-semibold text-sm text-gray-300">循环记录</h3>
          {isFiltered && (
            <span className="text-xs text-yellow-400 font-mono">
              {filteredCycles.length} 条
            </span>
          )}
        </div>
        {isFiltered && (
          <p className="text-xs text-yellow-500/70 mt-1">
            显示筛选后的数据，点击记录会跳转到全量时间轴对应位置
          </p>
        )}
      </div>
      <div className="flex-1 overflow-y-auto">
        {visibleCycles.length === 0 ? (
          <div className="p-4 text-center text-gray-500 text-sm">
            筛选条件下无数据
          </div>
        ) : (
          visibleCycles.map((cycle) => (
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
          ))
        )}
      </div>
    </div>
  );
};
