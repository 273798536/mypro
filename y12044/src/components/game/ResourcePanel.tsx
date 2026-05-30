import React from 'react';
import { Droplets, Snowflake, Leaf, Home, Trophy } from 'lucide-react';
import { useGameStore } from '../../store/useGameStore';

const ResourcePanel: React.FC = () => {
  const { resources, currentRound, maxRounds, totalScore } = useGameStore();

  const getHumidityColor = (value: number) => {
    if (value < 30) return 'bg-red-500';
    if (value < 50) return 'bg-yellow-500';
    return 'bg-green-500';
  };

  return (
    <div className="bg-space-800 rounded-xl p-4 glow-border">
      <div className="flex items-center justify-between mb-4">
        <h3 className="font-orbitron text-lg font-bold text-tech-400">
          回合 {currentRound}/{maxRounds}
        </h3>
        <div className="flex items-center gap-2 text-yellow-400">
          <Trophy size={18} />
          <span className="font-orbitron font-bold">{totalScore}</span>
        </div>
      </div>

      <div className="space-y-3">
        <div className="flex items-center gap-3 p-3 bg-space-700 rounded-lg">
          <div className="p-2 bg-blue-500/20 rounded-lg">
            <Droplets className="text-blue-400" size={20} />
          </div>
          <div className="flex-1">
            <div className="text-xs text-gray-400">储水量</div>
            <div className="font-bold text-lg">{resources.water} L</div>
          </div>
        </div>

        <div className="flex items-center gap-3 p-3 bg-space-700 rounded-lg">
          <div className="p-2 bg-cyan-500/20 rounded-lg">
            <Snowflake className="text-cyan-400" size={20} />
          </div>
          <div className="flex-1">
            <div className="text-xs text-gray-400">冰储量</div>
            <div className="font-bold text-lg">{resources.ice} kg</div>
          </div>
        </div>

        <div className="flex items-center gap-3 p-3 bg-space-700 rounded-lg">
          <div className="p-2 bg-green-500/20 rounded-lg">
            <Leaf className="text-green-400" size={20} />
          </div>
          <div className="flex-1">
            <div className="flex justify-between">
              <span className="text-xs text-gray-400">温室湿度</span>
              <span className="text-xs font-medium">{resources.greenhouseHumidity}%</span>
            </div>
            <div className="w-full h-2 bg-space-900 rounded-full mt-1 overflow-hidden">
              <div 
                className={`h-full rounded-full transition-all duration-500 ${getHumidityColor(resources.greenhouseHumidity)}`}
                style={{ width: `${resources.greenhouseHumidity}%` }}
              />
            </div>
          </div>
        </div>

        <div className="flex items-center gap-3 p-3 bg-space-700 rounded-lg">
          <div className="p-2 bg-purple-500/20 rounded-lg">
            <Home className="text-purple-400" size={20} />
          </div>
          <div className="flex-1">
            <div className="text-xs text-gray-400">基地用水量</div>
            <div className="font-bold text-lg">{resources.baseUsage} L/回合</div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ResourcePanel;
