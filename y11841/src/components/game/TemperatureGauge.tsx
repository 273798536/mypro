import React from 'react';
import { Thermometer } from 'lucide-react';
import { useGameStore } from '../../store/gameStore';
import { getTemperatureStatus } from '../../utils/temperatureEngine';
import { cn } from '@/lib/utils';

const TemperatureGauge: React.FC = () => {
  const { currentTemperature } = useGameStore();
  const status = getTemperatureStatus(currentTemperature);

  const tempPercentage = Math.min(Math.max((currentTemperature / 12) * 100, 0), 100);

  return (
    <div className="bg-cold-chain-panel rounded-lg border-2 border-cold-chain-border p-4">
      <div className="flex items-center gap-3 mb-3">
        <Thermometer className={cn('w-6 h-6', status.colorClass)} />
        <div>
          <div className={cn('font-mono text-2xl font-bold tabular-nums', status.colorClass)}>
            {currentTemperature.toFixed(1)}°C
          </div>
          <div className="text-xs text-gray-400 font-mono">{status.message}</div>
        </div>
      </div>

      <div className="relative h-3 bg-cold-chain-dark rounded-full overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-r from-cold-chain-success via-cold-chain-warning to-cold-chain-danger opacity-30" />
        <div
          className={cn(
            'absolute left-0 top-0 h-full transition-all duration-500 rounded-full',
            status.status === 'normal'
              ? 'bg-cold-chain-success'
              : status.status === 'warning'
                ? 'bg-cold-chain-warning'
                : 'bg-cold-chain-danger'
          )}
          style={{ width: `${tempPercentage}%` }}
        />
        <div
          className="absolute top-0 w-0.5 h-full bg-white/50"
          style={{ left: `${(8 / 12) * 100}%` }}
        />
        <div
          className="absolute -top-5 text-xs text-white/70 font-mono"
          style={{ left: `${(8 / 12) * 100}%`, transform: 'translateX(-50%)' }}
        >
          8°C临界
        </div>
      </div>

      <div className="flex justify-between mt-1 text-xs text-gray-500 font-mono">
        <span>0°C</span>
        <span>4°C</span>
        <span>12°C</span>
      </div>
    </div>
  );
};

export default TemperatureGauge;
