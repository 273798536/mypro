import { Zap, Droplets, Flame, Calendar, Layers } from 'lucide-react';
import { useAppStore } from '../../store/useAppStore';
import type { EnergyType } from '../../types';
import { formatEnergyValue } from '../../utils/heatmapColors';

const energyTypes: { type: EnergyType; label: string; icon: typeof Zap; unit: string }[] = [
  { type: 'electricity', label: '电力', icon: Zap, unit: 'kWh' },
  { type: 'water', label: '用水', icon: Droplets, unit: 'm³' },
  { type: 'gas', label: '燃气', icon: Flame, unit: 'm³' },
];

export const SidebarLeft = () => {
  const {
    buildingModel,
    meterData,
    energyType,
    timeRange,
    selectedFloor,
    setEnergyType,
    setTimeRange,
    setSelectedFloor,
  } = useAppStore();

  const totalEnergy = meterData.floorMeters.reduce(
    (sum, fm) => sum + (fm.energyConsumption[energyType] || 0),
    0
  );

  const abnormalCount = meterData.floorMeters.reduce(
    (sum, fm) => sum + fm.devices.filter((d) => d.isAbnormal).length,
    0
  );

  return (
    <aside className="w-72 bg-slate-900 border-r border-slate-700 flex flex-col shrink-0 overflow-hidden">
      <div className="p-4 border-b border-slate-700">
        <h2 className="text-white font-semibold mb-4 flex items-center gap-2">
          <Layers size={18} />
          参数控制
        </h2>

        <div className="mb-4">
          <label className="block text-slate-400 text-xs mb-2">能耗类型</label>
          <div className="grid grid-cols-3 gap-2">
            {energyTypes.map(({ type, label, icon: Icon }) => (
              <button
                key={type}
                onClick={() => setEnergyType(type)}
                className={`flex flex-col items-center gap-1 p-2 rounded-lg transition-all ${
                  energyType === type
                    ? 'bg-blue-600 text-white shadow-lg shadow-blue-600/30'
                    : 'bg-slate-800 text-slate-400 hover:bg-slate-700 hover:text-white'
                }`}
              >
                <Icon size={16} />
                <span className="text-xs">{label}</span>
              </button>
            ))}
          </div>
        </div>

        <div className="mb-4">
          <label className="block text-slate-400 text-xs mb-2 flex items-center gap-1">
            <Calendar size={12} />
            统计周期
          </label>
          <div className="bg-slate-800 rounded-lg p-2 text-sm">
            <div className="text-slate-300">
              {new Date(timeRange.start).toLocaleDateString('zh-CN')}
            </div>
            <div className="text-slate-500 text-xs">至</div>
            <div className="text-slate-300">
              {new Date(timeRange.end).toLocaleDateString('zh-CN')}
            </div>
          </div>
        </div>
      </div>

      <div className="p-4 border-b border-slate-700">
        <h3 className="text-slate-400 text-xs mb-3">能耗概览</h3>
        <div className="space-y-3">
          <div className="bg-slate-800 rounded-lg p-3">
            <div className="text-slate-400 text-xs">总能耗</div>
            <div className="text-white text-xl font-bold">
              {formatEnergyValue(totalEnergy, energyType)}
            </div>
          </div>
          <div className="bg-red-900/30 border border-red-700/50 rounded-lg p-3">
            <div className="text-red-400 text-xs">异常设备</div>
            <div className="text-red-400 text-xl font-bold">{abnormalCount} 台</div>
          </div>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto p-4">
        <h3 className="text-slate-400 text-xs mb-3">楼层筛选</h3>
        <div className="space-y-2">
          {buildingModel.floors.map((floor) => {
            const floorMeter = meterData.floorMeters.find(
              (fm) => fm.floorId === floor.id
            );
            const energyValue = floorMeter?.energyConsumption[energyType] || 0;
            const hasAbnormal = floorMeter?.devices.some((d) => d.isAbnormal);

            return (
              <button
                key={floor.id}
                onClick={() =>
                  setSelectedFloor(selectedFloor === floor.id ? null : floor.id)
                }
                className={`w-full text-left p-3 rounded-lg transition-all ${
                  selectedFloor === floor.id
                    ? 'bg-blue-600/20 border border-blue-500'
                    : 'bg-slate-800 hover:bg-slate-700 border border-transparent'
                }`}
              >
                <div className="flex items-center justify-between">
                  <span className="text-white text-sm font-medium">
                    {floor.name}
                  </span>
                  {hasAbnormal && (
                    <span className="bg-red-500 text-white text-xs px-1.5 py-0.5 rounded">
                      !
                    </span>
                  )}
                </div>
                <div className="text-slate-400 text-xs mt-1">
                  {formatEnergyValue(energyValue, energyType)}
                </div>
                <div className="mt-2 h-1.5 bg-slate-700 rounded-full overflow-hidden">
                  <div
                    className="h-full bg-gradient-to-r from-green-500 via-yellow-500 to-red-500 rounded-full transition-all"
                    style={{
                      width: `${Math.min(
                        (energyValue / totalEnergy) * 100 * buildingModel.floors.length,
                        100
                      )}%`,
                    }}
                  />
                </div>
              </button>
            );
          })}
        </div>
      </div>

      <div className="p-4 border-t border-slate-700">
        <h3 className="text-slate-400 text-xs mb-2">热图颜色说明</h3>
        <div className="flex items-center gap-1">
          <div className="flex-1 h-3 rounded bg-gradient-to-r from-green-500 via-yellow-500 via-orange-500 to-red-500" />
        </div>
        <div className="flex justify-between text-xs text-slate-500 mt-1">
          <span>低</span>
          <span>高</span>
        </div>
      </div>
    </aside>
  );
};
