import React from 'react';
import { motion } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import { useGameStore } from '../store/useGameStore';
import { Timeline } from '../components/report/Timeline';
import { ScoreAnalysis } from '../components/report/ScoreAnalysis';
import { ArrowLeft, Trophy, FileText, RotateCcw } from 'lucide-react';

export const BattleReportPage: React.FC = () => {
  const navigate = useNavigate();
  const gameState = useGameStore();
  const resetGame = useGameStore((state) => state.resetGame);

  const handleRestart = () => {
    resetGame();
    navigate('/');
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900">
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-1/3 right-1/4 w-96 h-96 bg-yellow-500/10 rounded-full blur-3xl" />
        <div className="absolute bottom-1/3 left-1/4 w-96 h-96 bg-cyan-500/10 rounded-full blur-3xl" />
      </div>

      <header className="relative z-10 px-6 py-4 border-b border-slate-700/50">
        <div className="max-w-6xl mx-auto flex items-center justify-between">
          <button
            onClick={() => navigate('/')}
            className="flex items-center gap-2 text-slate-400 hover:text-white transition-colors"
          >
            <ArrowLeft size={20} />
            返回游戏
          </button>

          <div className="flex items-center gap-3">
            <Trophy className="text-yellow-400" size={24} />
            <div>
              <h1 className="text-xl font-bold text-white">战报分析</h1>
              <p className="text-xs text-slate-400">游戏数据复盘与策略分析</p>
            </div>
          </div>

          <button
            onClick={handleRestart}
            className="flex items-center gap-2 px-4 py-2 bg-slate-700 hover:bg-slate-600 text-white rounded-lg transition-colors"
          >
            <RotateCcw size={18} />
            重新开始
          </button>
        </div>
      </header>

      <main className="relative z-10 max-w-6xl mx-auto px-6 py-8">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <motion.div
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: 0.1 }}
            className="lg:col-span-1"
          >
            <div className="flex items-center gap-2 mb-4">
              <FileText size={20} className="text-cyan-400" />
              <h2 className="text-lg font-bold text-white">成绩评估</h2>
            </div>
            <ScoreAnalysis gameState={gameState} />
          </motion.div>

          <motion.div
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: 0.2 }}
            className="lg:col-span-2"
          >
            <div className="flex items-center gap-2 mb-4">
              <FileText size={20} className="text-purple-400" />
              <h2 className="text-lg font-bold text-white">操作追溯</h2>
            </div>
            <Timeline
              logs={gameState.operationLog}
              penalties={gameState.penaltyEvents}
              rewards={gameState.rewardEvents}
            />
          </motion.div>
        </div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.4 }}
          className="mt-8 bg-slate-800/50 rounded-2xl p-6 border border-slate-700"
        >
          <h3 className="text-lg font-bold text-white mb-4 flex items-center gap-2">
            <span className="w-2 h-6 bg-yellow-500 rounded-full" />
            教学复盘要点
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="bg-red-500/10 rounded-xl p-4 border border-red-500/30">
              <h4 className="font-bold text-red-400 mb-2">⚠️ 离线惩罚</h4>
              <p className="text-sm text-slate-300 mb-3">
                本次游戏中共发生 {gameState.penaltyEvents.filter((p) => p.type === 'offline').length} 次离线惩罚
              </p>
              <ul className="text-xs text-slate-400 space-y-1">
                <li>• 在线率越低的节点，离线概率越高</li>
                <li>• 惩罚金额 = 质押额 × 基础率 × 系数</li>
                <li>• 建议分散投资降低单点风险</li>
              </ul>
            </div>

            <div className="bg-orange-500/10 rounded-xl p-4 border border-orange-500/30">
              <h4 className="font-bold text-orange-400 mb-2">🔄 重复质押</h4>
              <p className="text-sm text-slate-300 mb-3">
                本次游戏中共发生 {gameState.penaltyEvents.filter((p) => p.type === 'duplicate').length} 次重复质押
              </p>
              <ul className="text-xs text-slate-400 space-y-1">
                <li>• 同一节点多次质押增加风险系数</li>
                <li>• 每增加一次质押，系数 ×1.3</li>
                <li>• 建议单节点不超过总资金30%</li>
              </ul>
            </div>

            <div className="bg-yellow-500/10 rounded-xl p-4 border border-yellow-500/30">
              <h4 className="font-bold text-yellow-400 mb-2">⏰ 解锁误点</h4>
              <p className="text-sm text-slate-300 mb-3">
                本次游戏中共发生 {gameState.penaltyEvents.filter((p) => p.type === 'unlock_misclick').length} 次解锁误点
              </p>
              <ul className="text-xs text-slate-400 space-y-1">
                <li>• 结算前2回合解锁损失50%奖励</li>
                <li>• 提前规划解锁时机很重要</li>
                <li>• 建议设置结算日历提醒</li>
              </ul>
            </div>
          </div>
        </motion.div>
      </main>
    </div>
  );
};
