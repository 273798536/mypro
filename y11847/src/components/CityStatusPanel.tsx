import React from 'react';
import { CityState } from '../types/game';

interface CityStatusPanelProps {
  cityState: CityState;
}

const StatusBar: React.FC<{
  label: string;
  value: number;
  max: number;
  color: string;
  warning?: boolean;
  critical?: boolean;
}> = ({ label, value, max, color, warning, critical }) => {
  const percentage = Math.min(100, Math.max(0, (value / max) * 100));

  return (
    <div className="mb-3">
      <div className="flex justify-between items-center mb-1">
        <span className="text-xs font-medium text-gray-300">{label}</span>
        <span
          className={`font-mono text-sm font-bold ${
            critical ? 'text-red-400 animate-pulse' : warning ? 'text-yellow-400' : 'text-gray-100'
          }`}
        >
          {value} / {max}
        </span>
      </div>
      <div className="h-3 bg-gray-700 rounded-full overflow-hidden">
        <div
          className={`h-full ${color} transition-all duration-500 ${
            critical ? 'animate-pulse' : ''
          }`}
          style={{ width: `${percentage}%` }}
        />
      </div>
    </div>
  );
};

export const CityStatusPanel: React.FC<CityStatusPanelProps> = ({ cityState }) => {
  return (
    <div className="bg-gray-800 rounded-lg p-4 border border-gray-600">
      <h3 className="text-lg font-bold text-white mb-4 border-b border-gray-600 pb-2">
        🏙️ 城市状态
      </h3>

      <StatusBar
        label="💧 积水水位"
        value={cityState.waterLevel}
        max={100}
        color={
          cityState.waterLevel > 80
            ? 'bg-red-500'
            : cityState.waterLevel > 50
            ? 'bg-yellow-500'
            : 'bg-blue-500'
        }
        warning={cityState.waterLevel > 50}
        critical={cityState.waterLevel > 80}
      />

      <StatusBar
        label="⚡ 泵站负荷"
        value={cityState.pumpLoad}
        max={cityState.pumpCapacity}
        color={
          cityState.pumpLoad > 90
            ? 'bg-red-500'
            : cityState.pumpLoad > 70
            ? 'bg-yellow-500'
            : 'bg-amber-500'
        }
        warning={cityState.pumpLoad > 70}
        critical={cityState.pumpLoad > 90}
      />

      <StatusBar
        label="🌳 绿地容量"
        value={cityState.gardenCapacity}
        max={cityState.gardenMaxCapacity}
        color={
          cityState.gardenCapacity <= 0
            ? 'bg-red-500'
            : cityState.gardenCapacity < 30
            ? 'bg-yellow-500'
            : 'bg-emerald-500'
        }
        warning={cityState.gardenCapacity < 30}
        critical={cityState.gardenCapacity <= 0}
      />

      <StatusBar
        label="🌊 低洼积水"
        value={cityState.lowAreaWater}
        max={100}
        color={
          cityState.lowAreaWater > 50
            ? 'bg-red-500'
            : cityState.lowAreaWater > 30
            ? 'bg-yellow-500'
            : 'bg-cyan-500'
        }
        warning={cityState.lowAreaWater > 30}
        critical={cityState.lowAreaWater > 50}
      />
    </div>
  );
};
