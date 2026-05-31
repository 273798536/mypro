import React from 'react';
import { motion } from 'framer-motion';
import { Zap, Target, AlertTriangle, Trophy, Flame } from 'lucide-react';
import { useGameStore } from '../store/gameStore';

const StatusBar: React.FC = () => {
  const { currentEnergy, maxEnergy, score, placedDefects, violations, consecutiveSuccess, minecartId } = useGameStore();

  const energyPercentage = (currentEnergy / maxEnergy) * 100;
  const getEnergyColor = () => {
    if (energyPercentage > 60) return 'bg-green-500';
    if (energyPercentage > 30) return 'bg-yellow-500';
    return 'bg-red-500';
  };

  return (
    <div className="p-6 bg-slate-900/80 rounded-xl border border-slate-700 backdrop-blur-sm">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-lg font-semibold text-white">游戏状态</h3>
        <span className="text-xs px-2 py-1 rounded bg-slate-700 text-slate-300">
          矿车: {minecartId}
        </span>
      </div>

      <div className="space-y-4">
        <div>
          <div className="flex items-center justify-between text-sm mb-2">
            <div className="flex items-center gap-2 text-yellow-400">
              <Zap size={16} />
              <span>能量</span>
            </div>
            <span className="text-white font-mono">
              {currentEnergy} / {maxEnergy}
            </span>
          </div>
          <div className="h-3 bg-slate-700 rounded-full overflow-hidden">
            <motion.div
              className={`h-full ${getEnergyColor()} rounded-full`}
              initial={{ width: '100%' }}
              animate={{ width: `${energyPercentage}%` }}
              transition={{ duration: 0.3 }}
            />
          </div>
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div className="p-3 bg-slate-800/50 rounded-lg">
            <div className="flex items-center gap-2 text-blue-400 text-sm mb-1">
              <Target size={14} />
              <span>已放置缺陷</span>
            </div>
            <p className="text-2xl font-bold text-white">{placedDefects.length}</p>
          </div>

          <div className="p-3 bg-slate-800/50 rounded-lg">
            <div className="flex items-center gap-2 text-red-400 text-sm mb-1">
              <AlertTriangle size={14} />
              <span>违规次数</span>
            </div>
            <p className="text-2xl font-bold text-white">{violations.length}</p>
          </div>
        </div>

        {consecutiveSuccess > 0 && (
          <motion.div
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            className="p-3 bg-orange-900/30 border border-orange-500/30 rounded-lg"
          >
            <div className="flex items-center gap-2 text-orange-400">
              <Flame size={16} />
              <span className="text-sm font-medium">连击 x{consecutiveSuccess}</span>
            </div>
          </motion.div>
        )}

        <div className="pt-4 border-t border-slate-700">
          <div className="flex items-center justify-between mb-2">
            <div className="flex items-center gap-2 text-purple-400">
              <Trophy size={16} />
              <span className="text-sm">当前得分</span>
            </div>
          </div>
          <div className="space-y-2 text-sm">
            <div className="flex justify-between text-slate-400">
              <span>基础分</span>
              <span className="text-green-400">+{score.base}</span>
            </div>
            <div className="flex justify-between text-slate-400">
              <span>奖励分</span>
              <span className="text-blue-400">+{score.bonus}</span>
            </div>
            <div className="flex justify-between text-slate-400">
              <span>扣分项</span>
              <span className="text-red-400">-{score.penalty}</span>
            </div>
            <div className="flex justify-between pt-2 border-t border-slate-700">
              <span className="text-white font-medium">总分</span>
              <span className="text-xl font-bold text-white">{score.total}</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default StatusBar;
