import { Device, DeviceType } from '@/types';
import { DEVICES } from '@/data/devices';
import { useGameStore } from '@/store/useGameStore';
import { cn } from '@/lib/utils';
import { Speaker, Mic2, SlidersHorizontal, Gauge, Box, MonitorSmartphone } from 'lucide-react';

const iconMap: Record<string, React.ElementType> = {
  Speaker,
  Mic2,
  SlidersHorizontal,
  Gauge,
  Box,
  MonitorSmartphone
};

interface DeviceCardProps {
  deviceType: DeviceType;
  placedCount: number;
  requiredCount: number;
}

export const DeviceCard = ({ deviceType, placedCount, requiredCount }: DeviceCardProps) => {
  const device = DEVICES[deviceType];
  const { selectedDevice, selectDevice, placedDevices, level } = useGameStore();
  const isSelected = selectedDevice === deviceType;
  const isComplete = placedCount >= requiredCount;

  const Icon = iconMap[device.icon] || Box;

  const handleClick = () => {
    if (placedCount >= requiredCount) {
      return;
    }
    selectDevice(isSelected ? null : deviceType);
  };

  return (
    <div
      onClick={handleClick}
      className={cn(
        'relative p-3 rounded-lg border-2 cursor-pointer transition-all duration-200',
        'hover:scale-[1.02] active:scale-[0.98]',
        isSelected
          ? 'border-purple-500 bg-purple-500/20 shadow-lg shadow-purple-500/30'
          : isComplete
          ? 'border-green-500/50 bg-green-500/10 opacity-70 cursor-not-allowed'
          : 'border-slate-600 bg-slate-800/50 hover:border-slate-500'
      )}
    >
      <div className="flex items-center gap-3">
        <div
          className="w-10 h-10 rounded-lg flex items-center justify-center"
          style={{ backgroundColor: device.color + '30' }}
        >
          <Icon size={20} style={{ color: device.color }} />
        </div>
        <div className="flex-1 min-w-0">
          <div className="font-medium text-sm text-slate-100 truncate">{device.name}</div>
          <div className="text-xs text-slate-400">
            {placedCount} / {requiredCount}
          </div>
        </div>
        <div
          className="px-2 py-0.5 rounded text-xs font-medium"
          style={{ backgroundColor: device.color + '30', color: device.color }}
        >
          +{device.score}
        </div>
      </div>
      
      <div className="mt-2 h-1 bg-slate-700 rounded-full overflow-hidden">
        <div
          className="h-full transition-all duration-300"
          style={{
            width: `${Math.min(100, (placedCount / requiredCount) * 100)}%`,
            backgroundColor: isComplete ? '#10B981' : device.color
          }}
        />
      </div>

      {device.priority === 1 && (
        <div className="absolute -top-1 -right-1 px-1.5 py-0.5 bg-red-500 text-white text-[10px] rounded font-bold">
          高优
        </div>
      )}
    </div>
  );
};
