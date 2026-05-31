import { useGameStore } from '@/store/useGameStore';
import { DeviceCard } from './DeviceCard';
import { DeviceType } from '@/types';
import { Package } from 'lucide-react';

export const Toolbox = () => {
  const { level, placedDevices } = useGameStore();

  const getPlacedCount = (deviceType: DeviceType): number => {
    return placedDevices.filter(d => d.deviceType === deviceType).length;
  };

  return (
    <div className="h-full flex flex-col bg-slate-900/80 backdrop-blur-sm border-r border-slate-700">
      <div className="p-4 border-b border-slate-700">
        <div className="flex items-center gap-2">
          <Package className="text-purple-400" size={20} />
          <h2 className="text-lg font-bold text-slate-100">设备工具箱</h2>
        </div>
        <p className="text-xs text-slate-400 mt-1">点击选择设备，再点击舞台放置</p>
      </div>
      
      <div className="flex-1 overflow-y-auto p-3 space-y-2">
        {level.requiredDevices.map((req) => (
          <DeviceCard
            key={req.type}
            deviceType={req.type}
            placedCount={getPlacedCount(req.type)}
            requiredCount={req.count}
          />
        ))}
      </div>

      <div className="p-4 border-t border-slate-700 bg-slate-800/50">
        <div className="text-xs text-slate-400 space-y-1">
          <div className="flex justify-between">
            <span>关卡版本:</span>
            <span className="text-slate-300 font-mono">{level.version}</span>
          </div>
          <div className="flex justify-between">
            <span>来源:</span>
            <span className="text-slate-300 truncate ml-2" title={level.source}>
              {level.source}
            </span>
          </div>
        </div>
      </div>
    </div>
  );
};
