import { useGameStore } from '../../store/gameStore';
import { Fuel, Star, Clock, Volume2 } from 'lucide-react';

export const HUDPanel = () => {
  const { gameState, samples, rhythmTrack } = useGameStore();

  const fuelPercentage = (gameState.fuel / gameState.maxFuel) * 100;
  const fuelColor = fuelPercentage > 50 ? 'bg-space-green' : fuelPercentage > 20 ? 'bg-space-orange' : 'bg-space-red';
  const isLowFuel = fuelPercentage <= 20;

  return (
    <div className="flex justify-between items-start mb-4">
      <div className="glass rounded-lg p-4 neon-border-cyan">
        <div className="flex items-center gap-2 mb-2">
          <Fuel className={`w-5 h-5 ${isLowFuel ? 'text-space-red animate-pulse' : 'text-space-cyan'}`} />
          <span className="text-sm text-gray-300">燃料</span>
        </div>
        <div className="w-40 h-3 bg-space-deeper rounded-full overflow-hidden">
          <div
            className={`h-full ${fuelColor} transition-all duration-300 ${isLowFuel ? 'animate-pulse' : ''}`}
            style={{ width: `${fuelPercentage}%` }}
          />
        </div>
        <div className="text-xs text-gray-400 mt-1">
          {Math.round(gameState.fuel)} / {gameState.maxFuel}
        </div>
      </div>

      <div className="glass rounded-lg p-4 neon-border-pink">
        <div className="flex items-center gap-2 mb-1">
          <Star className="w-5 h-5 text-space-pink" />
          <span className="text-sm text-gray-300">分数</span>
        </div>
        <div className="text-3xl font-bold text-neon-pink font-orbitron">
          {gameState.score}
        </div>
      </div>

      <div className="glass rounded-lg p-4 neon-border-green">
        <div className="flex items-center gap-2 mb-1">
          <Volume2 className="w-5 h-5 text-space-green" />
          <span className="text-sm text-gray-300">采样</span>
        </div>
        <div className="text-2xl font-bold text-neon-green font-orbitron">
          {samples.length}
        </div>
        <div className="text-xs text-gray-400 mt-1">
          已放置: {rhythmTrack.beats.filter(b => b !== null).length} / 8
        </div>
      </div>

      <div className="glass rounded-lg p-4 neon-border-cyan">
        <div className="flex items-center gap-2 mb-1">
          <Clock className="w-5 h-5 text-space-cyan" />
          <span className="text-sm text-gray-300">时间</span>
        </div>
        <div className="text-2xl font-bold text-neon-cyan font-orbitron">
          {Math.floor(gameState.time)}s
        </div>
      </div>
    </div>
  );
};
