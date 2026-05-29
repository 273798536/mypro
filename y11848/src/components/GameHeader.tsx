import React from 'react';
import { motion } from 'framer-motion';
import { useGameStore } from '../store/gameStore';
import { formatTime } from '../utils/gameUtils';
import { useNavigate } from 'react-router-dom';

export const GameHeader: React.FC = () => {
  const navigate = useNavigate();
  const { 
    score, 
    cacheHits, 
    totalRequests, 
    elapsedTime, 
    config,
    status,
    pauseGame,
    resumeGame,
    resetGame,
    speed,
    setSpeed,
    breakdownsPrevented,
    breakdownsOccurred,
  } = useGameStore();

  const hitRate = totalRequests > 0 ? (cacheHits / totalRequests * 100).toFixed(1) : '0.0';
  const remainingTime = Math.max(0, config.gameDuration - elapsedTime);
  const progress = (elapsedTime / config.gameDuration) * 100;

  const handleReset = () => {
    resetGame();
    navigate('/');
  };

  return (
    <div className="bg-tech-blue/50 rounded-xl p-4 border border-tech-cyan/20">
      <div className="flex flex-wrap items-center justify-between gap-4 mb-4">
        <div className="flex items-center gap-6">
          <motion.div 
            className="text-center"
            animate={{ scale: status === 'playing' ? [1, 1.02, 1] : 1 }}
            transition={{ duration: 0.5, repeat: Infinity }}
          >
            <div className="text-gray-400 text-xs mb-1">得分</div>
            <div className={`text-3xl font-bold font-mono ${
              score >= 0 ? 'text-tech-green' : 'text-tech-red'
            }`}>
              {score}
            </div>
          </motion.div>

          <div className="text-center">
            <div className="text-gray-400 text-xs mb-1">命中率</div>
            <div className="text-2xl font-bold font-mono text-tech-cyan">
              {hitRate}%
            </div>
          </div>

          <div className="text-center">
            <div className="text-gray-400 text-xs mb-1">击穿拦截</div>
            <div className="text-2xl font-bold font-mono">
              <span className="text-tech-green">{breakdownsPrevented}</span>
              <span className="text-gray-500 mx-1">/</span>
              <span className="text-tech-red">{breakdownsOccurred}</span>
            </div>
          </div>

          <div className="text-center">
            <div className="text-gray-400 text-xs mb-1">剩余时间</div>
            <div className={`text-2xl font-bold font-mono ${
              remainingTime < 10000 ? 'text-tech-red animate-pulse' : 'text-white'
            }`}>
              {formatTime(remainingTime)}
            </div>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2">
            <span className="text-gray-400 text-xs">速度:</span>
            {[0.5, 1, 2].map((s) => (
              <button
                key={s}
                onClick={() => setSpeed(s)}
                className={`
                  px-2 py-1 rounded text-xs font-medium transition-all
                  ${speed === s 
                    ? 'bg-tech-cyan text-tech-dark' 
                    : 'bg-gray-700 text-gray-300 hover:bg-gray-600'
                  }
                `}
              >
                {s}x
              </button>
            ))}
          </div>

          {status === 'playing' ? (
            <button
              onClick={pauseGame}
              className="px-4 py-2 bg-tech-orange text-white rounded-lg hover:bg-tech-orange/80 transition-colors font-medium flex items-center gap-2"
            >
              <span>⏸️</span> 暂停
            </button>
          ) : status === 'paused' ? (
            <button
              onClick={resumeGame}
              className="px-4 py-2 bg-tech-green text-white rounded-lg hover:bg-tech-green/80 transition-colors font-medium flex items-center gap-2"
            >
              <span>▶️</span> 继续
            </button>
          ) : null}

          <button
            onClick={handleReset}
            className="px-4 py-2 bg-gray-700 text-white rounded-lg hover:bg-gray-600 transition-colors font-medium flex items-center gap-2"
          >
            <span>🔄</span> 重开
          </button>
        </div>
      </div>

      <div className="w-full bg-gray-700 rounded-full h-2">
        <motion.div 
          className="h-2 rounded-full bg-gradient-to-r from-tech-cyan to-tech-green"
          initial={{ width: 0 }}
          animate={{ width: `${progress}%` }}
          transition={{ duration: 0.3 }}
        />
      </div>
    </div>
  );
};
