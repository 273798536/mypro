import React from 'react';
import { useGameStore } from '../../store/useGameStore';
import { Wind, Zap, Clock, Trophy } from 'lucide-react';

export const ResourceBar: React.FC = () => {
  const { resources, score } = useGameStore();

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  const oxygenPercent = (resources.oxygen / resources.maxOxygen) * 100;
  const powerPercent = (resources.power / resources.maxPower) * 100;
  const timePercent = (resources.time / resources.maxTime) * 100;

  const getBarColor = (percent: number) => {
    if (percent <= 15) return 'bg-alert-red';
    if (percent <= 30) return 'bg-warning-orange';
    return 'bg-cyber-cyan';
  };

  return (
    <div className="bg-space-blue/80 backdrop-blur-sm border border-cyber-cyan/20 rounded-xl p-4">
      <div className="grid grid-cols-4 gap-6">
        <div>
          <div className="flex items-center gap-2 mb-2">
            <Wind className="w-4 h-4 text-cyber-cyan" />
            <span className="text-sm font-medium text-gray-300">氧气</span>
            <span className={`ml-auto text-sm font-bold ${
              oxygenPercent <= 15 ? 'text-alert-red animate-pulse' :
              oxygenPercent <= 30 ? 'text-warning-orange' : 'text-cyber-cyan'
            }`}>
              {resources.oxygen.toFixed(0)}%
            </span>
          </div>
          <div className="h-3 bg-gray-700/50 rounded-full overflow-hidden">
            <div
              className={`h-full rounded-full transition-all duration-300 ${getBarColor(oxygenPercent)} ${
                oxygenPercent <= 15 ? 'animate-pulse' : ''
              }`}
              style={{ width: `${oxygenPercent}%` }}
            />
          </div>
        </div>

        <div>
          <div className="flex items-center gap-2 mb-2">
            <Zap className="w-4 h-4 text-yellow-400" />
            <span className="text-sm font-medium text-gray-300">电力</span>
            <span className={`ml-auto text-sm font-bold ${
              powerPercent <= 10 ? 'text-alert-red animate-pulse' :
              powerPercent <= 25 ? 'text-warning-orange' : 'text-yellow-400'
            }`}>
              {resources.power.toFixed(0)}%
            </span>
          </div>
          <div className="h-3 bg-gray-700/50 rounded-full overflow-hidden">
            <div
              className={`h-full rounded-full transition-all duration-300 ${
                powerPercent <= 10 ? 'bg-alert-red animate-pulse' :
                powerPercent <= 25 ? 'bg-warning-orange' : 'bg-yellow-400'
              }`}
              style={{ width: `${powerPercent}%` }}
            />
          </div>
        </div>

        <div>
          <div className="flex items-center gap-2 mb-2">
            <Clock className="w-4 h-4 text-success-green" />
            <span className="text-sm font-medium text-gray-300">时间</span>
            <span className="ml-auto text-sm font-bold text-success-green">
              {formatTime(resources.maxTime - resources.time)}
            </span>
          </div>
          <div className="h-3 bg-gray-700/50 rounded-full overflow-hidden">
            <div
              className="h-full rounded-full bg-success-green transition-all duration-300"
              style={{ width: `${100 - timePercent}%` }}
            />
          </div>
        </div>

        <div>
          <div className="flex items-center gap-2 mb-2">
            <Trophy className="w-4 h-4 text-cyber-cyan" />
            <span className="text-sm font-medium text-gray-300">得分</span>
            <span className="ml-auto text-sm font-bold text-cyber-cyan">
              {score.toFixed(0)}
            </span>
          </div>
          <div className="h-3 bg-gray-700/50 rounded-full overflow-hidden">
            <div
              className="h-full rounded-full bg-cyber-cyan transition-all duration-300"
              style={{ width: `${Math.min(100, score / 10)}%` }}
            />
          </div>
        </div>
      </div>
    </div>
  );
};
