import React from 'react';
import { Play, Pause, RotateCcw, Trophy, Clock, Zap } from 'lucide-react';
import { useGameEngine } from '../hooks/useGameEngine';
import { useTimer } from '../hooks/useTimer';
import { motion } from 'framer-motion';

export const GameHeader: React.FC = () => {
  const { state, startGame, pauseGame, resumeGame, restartGame } = useGameEngine();
  const { timeRemaining, isRunning } = useTimer();

  const formatTime = (seconds: number): string => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  const isIdle = state.status === 'idle';
  const isPaused = state.status === 'paused';

  const getTimeColor = () => {
    if (timeRemaining <= 5) return 'text-red-600 animate-pulse';
    if (timeRemaining <= 10) return 'text-yellow-600';
    return 'text-gray-700';
  };

  return (
    <header className="bg-gradient-to-r from-primary-800 to-primary-900 text-white shadow-lg">
      <div className="max-w-7xl mx-auto px-4 py-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <div className="flex items-center gap-2">
              <Zap className="w-8 h-8 text-yellow-400" />
              <h1 className="text-2xl font-bold">期货交易风控桌游</h1>
            </div>
            {!isIdle && (
              <div className="flex items-center gap-6 ml-8">
                <div className="flex items-center gap-2 bg-white/10 px-4 py-2 rounded-full">
                  <span className="text-sm text-gray-300">回合</span>
                  <span className="font-mono font-bold text-lg">
                    {state.currentRound} / {state.totalRounds}
                  </span>
                </div>
                <div className="flex items-center gap-2 bg-white/10 px-4 py-2 rounded-full">
                  <Clock className="w-4 h-4" />
                  <span className={`font-mono font-bold text-lg ${getTimeColor()}`}>
                    {formatTime(timeRemaining)}
                  </span>
                </div>
                <div className="flex items-center gap-2 bg-white/10 px-4 py-2 rounded-full">
                  <Trophy className="w-4 h-4 text-yellow-400" />
                  <span className="font-mono font-bold text-lg text-yellow-400">
                    {state.totalScore}
                  </span>
                </div>
                {state.extremeConsecutiveCount >= 2 && (
                  <motion.div
                    initial={{ scale: 0.8, opacity: 0 }}
                    animate={{ scale: 1, opacity: 1 }}
                    className="flex items-center gap-2 bg-red-600 px-4 py-2 rounded-full animate-pulse"
                  >
                    <span className="font-bold">⚠️ 极端行情</span>
                  </motion.div>
                )}
              </div>
            )}
          </div>
          
          <div className="flex items-center gap-3">
            {isIdle && (
              <motion.button
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                onClick={startGame}
                className="flex items-center gap-2 bg-green-500 hover:bg-green-600 text-white px-6 py-2.5 rounded-full font-semibold transition-colors shadow-lg"
              >
                <Play className="w-5 h-5" />
                开始游戏
              </motion.button>
            )}
            {isRunning && (
              <motion.button
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                onClick={pauseGame}
                className="flex items-center gap-2 bg-yellow-500 hover:bg-yellow-600 text-white px-4 py-2 rounded-full font-semibold transition-colors"
              >
                <Pause className="w-5 h-5" />
                暂停
              </motion.button>
            )}
            {isPaused && (
              <motion.button
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                onClick={resumeGame}
                className="flex items-center gap-2 bg-green-500 hover:bg-green-600 text-white px-4 py-2 rounded-full font-semibold transition-colors"
              >
                <Play className="w-5 h-5" />
                继续
              </motion.button>
            )}
            {!isIdle && (
              <motion.button
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                onClick={restartGame}
                className="flex items-center gap-2 bg-gray-600 hover:bg-gray-700 text-white px-4 py-2 rounded-full font-semibold transition-colors"
              >
                <RotateCcw className="w-5 h-5" />
                重开
              </motion.button>
            )}
          </div>
        </div>
      </div>
    </header>
  );
};
