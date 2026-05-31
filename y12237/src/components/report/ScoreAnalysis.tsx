import React from 'react';
import { motion } from 'framer-motion';
import { calculateFinalScore } from '../../game/engine';
import { GameState } from '../../game/types';
import { Trophy, TrendingUp, AlertTriangle, Target, Star } from 'lucide-react';

interface ScoreAnalysisProps {
  gameState: GameState;
}

const getGradeColor = (grade: string) => {
  switch (grade) {
    case 'S':
      return 'text-yellow-400';
    case 'A':
      return 'text-green-400';
    case 'B':
      return 'text-cyan-400';
    case 'C':
      return 'text-orange-400';
    case 'D':
      return 'text-red-400';
    default:
      return 'text-slate-400';
  }
};

const getGradeBg = (grade: string) => {
  switch (grade) {
    case 'S':
      return 'from-yellow-500/20 to-orange-500/20 border-yellow-500/50';
    case 'A':
      return 'from-green-500/20 to-emerald-500/20 border-green-500/50';
    case 'B':
      return 'from-cyan-500/20 to-blue-500/20 border-cyan-500/50';
    case 'C':
      return 'from-orange-500/20 to-red-500/20 border-orange-500/50';
    case 'D':
      return 'from-red-500/20 to-pink-500/20 border-red-500/50';
    default:
      return 'from-slate-500/20 to-slate-600/20 border-slate-500/50';
  }
};

export const ScoreAnalysis: React.FC<ScoreAnalysisProps> = ({ gameState }) => {
  const { score, grade, analysis } = calculateFinalScore(gameState);
  const totalStaked = gameState.stakeRecords
    .filter((s) => !s.isUnlocked)
    .reduce((sum, s) => sum + s.amount, 0);
  const returnRate = ((gameState.totalBalance + totalStaked - gameState.initialBalance) / gameState.initialBalance) * 100 || 0;

  const stats = [
    {
      label: '总收益率',
      value: `${returnRate >= 0 ? '+' : ''}${returnRate.toFixed(2)}%`,
      icon: TrendingUp,
      color: returnRate >= 0 ? 'text-green-400' : 'text-red-400',
    },
    {
      label: '离线惩罚次数',
      value: gameState.penaltyEvents.filter((p) => p.type === 'offline').length,
      icon: AlertTriangle,
      color: 'text-orange-400',
    },
    {
      label: '累计奖励',
      value: `+${gameState.totalReward}`,
      icon: Trophy,
      color: 'text-green-400',
    },
    {
      label: '累计惩罚',
      value: `-${gameState.totalPenalty}`,
      icon: AlertTriangle,
      color: 'text-red-400',
    },
  ];

  return (
    <div className="space-y-6">
      <motion.div
        initial={{ opacity: 0, scale: 0.9 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ duration: 0.5 }}
        className={`relative bg-gradient-to-br ${getGradeBg(grade)} rounded-2xl p-8 border-2 text-center overflow-hidden`}
      >
        <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-transparent via-white/30 to-transparent" />
        
        <div className="flex justify-center mb-4">
          <motion.div
            animate={{ 
              scale: [1, 1.1, 1],
              rotate: [0, 5, -5, 0]
            }}
            transition={{ repeat: Infinity, duration: 2 }}
            className="relative"
          >
            <Trophy size={64} className={getGradeColor(grade)} />
            {grade === 'S' && (
              <motion.div
                animate={{ scale: [1, 1.2, 1], opacity: [0.5, 1, 0.5] }}
                transition={{ repeat: Infinity, duration: 1.5 }}
                className="absolute -top-2 -right-2"
              >
                <Star size={24} className="text-yellow-400 fill-yellow-400" />
              </motion.div>
            )}
          </motion.div>
        </div>

        <h2 className="text-lg text-white/80 mb-2">综合评级</h2>
        <motion.div
          initial={{ y: 20, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          transition={{ delay: 0.2 }}
          className={`text-7xl font-bold ${getGradeColor(grade)} mb-2`}
        >
          {grade}
        </motion.div>
        <div className="text-white/60">
          得分: <span className="text-white font-bold">{score}</span> / 100
        </div>
      </motion.div>

      <div className="grid grid-cols-2 gap-3">
        {stats.map((stat, index) => {
          const Icon = stat.icon;
          return (
            <motion.div
              key={stat.label}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.3 + index * 0.1 }}
              className="bg-slate-800/50 rounded-xl p-4 border border-slate-700"
            >
              <div className="flex items-center gap-2 text-slate-400 text-xs mb-2">
                <Icon size={14} />
                {stat.label}
              </div>
              <div className={`text-2xl font-bold font-mono ${stat.color}`}>
                {stat.value}
              </div>
            </motion.div>
          );
        })}
      </div>

      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.5 }}
        className="bg-slate-800/50 rounded-xl p-5 border border-slate-700"
      >
        <h3 className="font-bold text-white mb-4 flex items-center gap-2">
          <Target size={20} className="text-cyan-400" />
          策略分析
        </h3>
        <div className="space-y-3">
          {analysis.map((item, index) => (
            <motion.div
              key={index}
              initial={{ x: -20, opacity: 0 }}
              animate={{ x: 0, opacity: 1 }}
              transition={{ delay: 0.6 + index * 0.1 }}
              className="flex items-start gap-3 text-sm"
            >
              <span className="flex-shrink-0 w-2 h-2 mt-1.5 rounded-full bg-cyan-400" />
              <span className="text-slate-300">{item}</span>
            </motion.div>
          ))}
        </div>
      </motion.div>

      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.8 }}
        className="bg-gradient-to-r from-cyan-500/10 to-blue-500/10 rounded-xl p-5 border border-cyan-500/30"
      >
        <h3 className="font-bold text-cyan-400 mb-2">💡 教学要点</h3>
        <p className="text-sm text-slate-300 leading-relaxed">
          通过本次质押模拟，学员可以直观理解验证节点在线率对收益的影响、
          集中质押的风险敞口、以及解锁时机的重要性。建议在课堂上引导学员对比不同策略的收益差异，
          重点讨论离线惩罚的计算逻辑和分散投资的必要性。
        </p>
      </motion.div>
    </div>
  );
};
