import { useFlightStore } from '../store/useFlightStore';
import { formatFlightTime, getFuelStatusColor } from '../engine/fuelCalculator';
import { Fuel, Gauge, Map, Clock, AlertTriangle, CheckCircle } from 'lucide-react';

const InfoPanel = () => {
  const {
    currentRoute,
    fuelResult,
    collisionResult,
    aircraftSpec,
  } = useFlightStore();

  if (!currentRoute || !fuelResult) return null;

  const hasDanger = collisionResult?.violations.some(v => v.severity === 'danger');
  const hasWarning = collisionResult?.violations.some(v => v.severity === 'warning');
  const hasAlternate = currentRoute.waypoints.some(w => w.isAlternate);

  const overallStatus = hasDanger ? 'danger' : hasWarning ? 'warning' : 'safe';
  const statusColors = {
    safe: 'bg-green-600',
    warning: 'bg-yellow-600',
    danger: 'bg-red-600',
  };
  const statusTexts = {
    safe: '航线安全',
    warning: '存在警告',
    danger: '存在危险',
  };

  const fuelColor = getFuelStatusColor(fuelResult.isOverLimit, fuelResult.totalFuel, fuelResult.fuelCapacity);
  const fuelUsagePercent = (fuelResult.totalFuel / fuelResult.fuelCapacity) * 100;

  return (
    <div className="absolute right-4 top-24 w-80 z-10">
      <div className="bg-slate-900/90 backdrop-blur-md rounded-xl border border-slate-700 overflow-hidden">
        <div className={`${statusColors[overallStatus]} px-4 py-3`}>
          <div className="flex items-center gap-2">
            {overallStatus === 'safe' ? (
              <CheckCircle className="w-5 h-5 text-white" />
            ) : (
              <AlertTriangle className="w-5 h-5 text-white" />
            )}
            <span className="text-white font-semibold">{statusTexts[overallStatus]}</span>
          </div>
          {!hasAlternate && (
            <p className="text-yellow-200 text-sm mt-1">⚠️ 未选择备降机场，建议添加</p>
          )}
        </div>

        <div className="p-4 space-y-4">
          <div className="bg-slate-800/50 rounded-lg p-3">
            <h3 className="text-slate-400 text-xs uppercase tracking-wider mb-3 flex items-center gap-2">
              <Map className="w-4 h-4" />
              航线信息
            </h3>
            <div className="space-y-2">
              <div className="flex justify-between">
                <span className="text-slate-400 text-sm">航点数</span>
                <span className="text-white font-medium">{currentRoute.waypoints.length}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-400 text-sm">总距离</span>
                <span className="text-white font-medium">{fuelResult.totalDistance.toFixed(0)} 公里</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-400 text-sm">巡航高度</span>
                <span className="text-white font-medium">{currentRoute.cruiseAlt} 米</span>
              </div>
            </div>
          </div>

          <div className="bg-slate-800/50 rounded-lg p-3">
            <h3 className="text-slate-400 text-xs uppercase tracking-wider mb-3 flex items-center gap-2">
              <Gauge className="w-4 h-4" />
              燃油信息
            </h3>
            <div className="space-y-3">
              <div>
                <div className="flex justify-between mb-1">
                  <span className="text-slate-400 text-sm">燃油需求</span>
                  <span className="font-medium" style={{ color: fuelColor }}>
                    {fuelResult.totalFuel.toFixed(2)} 吨
                  </span>
                </div>
                <div className="w-full bg-slate-700 rounded-full h-2">
                  <div
                    className="h-2 rounded-full transition-all"
                    style={{
                      width: `${Math.min(fuelUsagePercent, 100)}%`,
                      backgroundColor: fuelColor,
                    }}
                  />
                </div>
                <div className="text-xs text-slate-500 mt-1">
                  油箱容量: {fuelResult.fuelCapacity} 吨
                </div>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-400 text-sm">储备燃油</span>
                <span className="text-white font-medium">{fuelResult.reserveFuel.toFixed(2)} 吨</span>
              </div>
              {fuelResult.isOverLimit && (
                <p className="text-red-400 text-sm">⚠️ 燃油需求超过容量！</p>
              )}
            </div>
          </div>

          <div className="bg-slate-800/50 rounded-lg p-3">
            <h3 className="text-slate-400 text-xs uppercase tracking-wider mb-3 flex items-center gap-2">
              <Clock className="w-4 h-4" />
              飞行时间
            </h3>
            <div className="text-2xl font-bold text-white">
              {formatFlightTime(fuelResult.flightTime)}
            </div>
            <div className="text-sm text-slate-400 mt-1">
              巡航速度: {aircraftSpec.cruiseSpeed} km/h
            </div>
          </div>

          <div className="bg-slate-800/50 rounded-lg p-3">
            <h3 className="text-slate-400 text-xs uppercase tracking-wider mb-3 flex items-center gap-2">
              <Fuel className="w-4 h-4" />
              机型信息
            </h3>
            <div className="text-white font-medium">{aircraftSpec.name}</div>
            <div className="text-sm text-slate-400 mt-1">
              最大航程: {aircraftSpec.maxRange} km
            </div>
            <div className="text-xs text-slate-500 mt-1">
              数据来源: {aircraftSpec.dataSource}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default InfoPanel;
