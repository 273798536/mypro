import { useGameStore } from '../store/gameStore';
import { Zap, Gauge, Gem, Timer, AlertTriangle } from 'lucide-react';
import { formatTime } from '../utils/comparison';
import { motion } from 'framer-motion';

export function GameHUD() {
  const { state } = useGameStore();

  if (state.phase !== 'playing' || !state.energy || !state.minecart) {
    return null;
  }

  const energyPercent = (state.energy.current / state.energy.max) * 100;
  const isLowEnergy = energyPercent < 20;
  const isCriticalEnergy = energyPercent < 10;

  return (
    <div className="absolute inset-0 pointer-events-none">
      <div className="absolute top-4 left-4 bg-slate-900/80 backdrop-blur-sm rounded-lg p-4 border border-slate-700 min-w-[200px">
        <div className="flex items-center gap-2 mb-2">
          <Zap className={`w-5 h-5 ${isCriticalEnergy ? 'text-red-400' : isLowEnergy ? 'text-orange-400' : 'text-cyan-400'}`} />
          <span className="text-slate-300 text-sm font-medium">能量</span>
        </div>
        <div className="w-full bg-slate-700 rounded-full h-3 overflow-hidden">
          <motion.div
            className={`h-full rounded-full transition-all duration-300 ${
              isCriticalEnergy ? 'bg-red-500' : isLowEnergy ? 'bg-orange-500' : 'bg-cyan-500'}`}
            initial={{ width: '100%' }}
            animate={{ width: `${energyPercent}%` }}
          />
        </div>
        <div className="flex justify-between text-xs mt-1">
          <span className={`font-mono ${isCriticalEnergy ? 'text-red-400' : isLowEnergy ? 'text-orange-400' : 'text-cyan-400'}`}>
            {state.energy.current.toFixed(1)} kJ
          </span>
          <span className="text-slate-500">
            {state.energy.max} kJ
          </span>
        </div>
        {isCriticalEnergy && (
          <motion.div
          className="mt-2 flex items-center gap-1 text-red-400 text-xs"
          animate={{ opacity: [1, 0.5, 1] }}
          transition={{ repeat: Infinity, duration: 0.5 }}
        >
          <AlertTriangle className="w-3 h-3" />
          <span>能量严重不足！</span>
        </motion.div>
      )}
      </div>

      <div className="absolute top-4 right-4 bg-slate-900/80 backdrop-blur-sm rounded-lg p-4 border border-slate-700">
        <div className="flex items-center gap-6">
          <div className="text-center">
            <div className="flex items-center justify-center gap-1 mb-1">
              <Gauge className="w-4 h-4 text-slate-400" />
            </div>
            <span className="text-slate-500 text-xs">速度</span>
            <span className="block text-xl font-bold text-cyan-400 font-mono">
              {state.speed.toFixed(1)}
            </span>
            <span className="text-slate-500 text-xs"> m/s</span>
          </div>

          <div className="text-center">
            <div className="flex items-center justify-center gap-1 mb-1">
              <Gem className="w-4 h-4 text-yellow-400" />
            </div>
            <span className="text-slate-500 text-xs">矿石</span>
            <span className="block text-xl font-bold text-yellow-400 font-mono">
              {state.minecart.oreCount}
            </span>
          </div>

          <div className="text-center">
            <div className="flex items-center justify-center gap-1 mb-1">
              <Timer className="w-4 h-4 text-slate-400" />
            </div>
            <span className="text-slate-500 text-xs">时间</span>
            <span className="block text-xl font-bold text-slate-300 font-mono">
              {formatTime(state.time)}
            </span>
          </div>
        </div>
      </div>

      <div className="absolute bottom-4 left-1/2 transform -translate-x-1/2 bg-slate-900/80 backdrop-blur-sm rounded-lg px-6 py-3 border border-slate-700">
        <div className="flex gap-8 text-center">
          <div className="text-slate-400 text-xs">
            <span className="bg-slate-700 px-2 py-1 rounded mr-2">W</span>
            <span className="ml-2">加速</span>
          </div>
          <div className="text-slate-400 text-xs">
            <span className="bg-slate-700 px-2 py-1 rounded mr-2">S</span>
            <span className="ml-2">减速</span>
          </div>
          <div className="text-slate-400 text-xs">
            <span className="bg-slate-700 px-2 py-1 rounded mr-2">A/D</span>
            <span className="ml-2">切换轨道</span>
          </div>
          <div className="text-slate-400 text-xs">
            <span className="bg-slate-700 px-2 py-1 rounded mr-2">ESC</span>
            <span className="ml-2">暂停</span>
          </div>
        </div>
      </div>
    </div>
  );
}
