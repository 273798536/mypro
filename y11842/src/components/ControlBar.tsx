import { motion } from 'framer-motion';
import { Play, Pause, RotateCcw, Flag, AlertTriangle } from 'lucide-react';
import { useGameStore } from '@/store/gameStore';

export const ControlBar = () => {
  const {
    currentRound,
    maxRounds,
    isPlaying,
    isPaused,
    isGameOver,
    resourcePoints,
    totalPenalties,
    startGame,
    pauseGame,
    resumeGame,
    restartGame,
    endGame,
    pendingItems,
  } = useGameStore();

  const unresolvedCount = pendingItems.filter((p) => !p.isResolved).length;

  return (
    <motion.div
      initial={{ y: -100, opacity: 0 }}
      animate={{ y: 0, opacity: 1 }}
      className="bg-slate-900/90 backdrop-blur-sm border-b border-cyan-500/30 px-6 py-4"
    >
      <div className="max-w-7xl mx-auto flex items-center justify-between">
        <div className="flex items-center gap-6">
          <h1 className="text-2xl font-bold bg-gradient-to-r from-cyan-400 to-emerald-400 bg-clip-text text-transparent font-['Orbitron']">
            WEB3 节点守城
          </h1>
          
          <div className="flex items-center gap-4 text-sm">
            <div className="px-4 py-2 bg-slate-800 rounded-lg border border-slate-700">
              <span className="text-slate-400">回合</span>
              <span className="ml-2 text-cyan-400 font-mono text-lg">
                {currentRound}/{maxRounds}
              </span>
            </div>
            
            <div className="px-4 py-2 bg-slate-800 rounded-lg border border-slate-700">
              <span className="text-slate-400">资源点</span>
              <span className="ml-2 text-emerald-400 font-mono text-lg">
                {resourcePoints}
              </span>
            </div>
            
            <div className="px-4 py-2 bg-slate-800 rounded-lg border border-slate-700">
              <span className="text-slate-400">惩罚总额</span>
              <span className="ml-2 text-red-400 font-mono text-lg">
                {totalPenalties}
              </span>
            </div>

            {unresolvedCount > 0 && (
              <motion.div
                animate={{ scale: [1, 1.05, 1] }}
                transition={{ repeat: Infinity, duration: 2 }}
                className="px-4 py-2 bg-amber-500/20 rounded-lg border border-amber-500/50 flex items-center gap-2"
              >
                <AlertTriangle className="w-4 h-4 text-amber-400" />
                <span className="text-amber-400 font-medium">
                  {unresolvedCount} 项待确认
                </span>
              </motion.div>
            )}
          </div>
        </div>

        <div className="flex items-center gap-3">
          {!isPlaying && !isGameOver && (
            <motion.button
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              onClick={startGame}
              className="px-6 py-2.5 bg-gradient-to-r from-cyan-500 to-emerald-500 text-white rounded-lg font-medium flex items-center gap-2 shadow-lg shadow-cyan-500/25 hover:shadow-cyan-500/40 transition-shadow"
            >
              <Play className="w-4 h-4" />
              开始游戏
            </motion.button>
          )}

          {isPlaying && !isPaused && (
            <motion.button
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              onClick={pauseGame}
              className="px-5 py-2.5 bg-slate-700 text-white rounded-lg font-medium flex items-center gap-2 hover:bg-slate-600 transition-colors"
            >
              <Pause className="w-4 h-4" />
              暂停
            </motion.button>
          )}

          {isPlaying && isPaused && (
            <motion.button
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              onClick={resumeGame}
              className="px-5 py-2.5 bg-emerald-600 text-white rounded-lg font-medium flex items-center gap-2 hover:bg-emerald-500 transition-colors"
            >
              <Play className="w-4 h-4" />
              继续
            </motion.button>
          )}

          {isPlaying && (
            <motion.button
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              onClick={endGame}
              className="px-5 py-2.5 bg-red-600/80 text-white rounded-lg font-medium flex items-center gap-2 hover:bg-red-500 transition-colors"
            >
              <Flag className="w-4 h-4" />
              结算
            </motion.button>
          )}

          <motion.button
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            onClick={restartGame}
            className="px-5 py-2.5 bg-slate-700 text-white rounded-lg font-medium flex items-center gap-2 hover:bg-slate-600 transition-colors"
          >
            <RotateCcw className="w-4 h-4" />
            重开
          </motion.button>
        </div>
      </div>
    </motion.div>
  );
};
