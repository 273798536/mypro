import React from 'react';
import { Play, Pause, RotateCcw, SkipForward, Flag } from 'lucide-react';
import { useGameStore } from '../store/useGameStore';

export const ControlBar: React.FC = () => {
  const { state, startGame, pauseGame, resumeGame, restartGame, advanceRound, endGame } = useGameStore();
  const { phase, currentRound, maxRounds, score, totalWaterUsed, totalEvaporation } = state;

  return (
    <div className="bg-white rounded-2xl shadow-lg p-4 mb-4">
      <div className="flex items-center justify-between flex-wrap gap-4">
        <div className="flex items-center gap-4">
          <h1 className="text-2xl font-bold text-green-800">🌾 农田灌溉阀门棋</h1>
          <div className="flex items-center gap-2 bg-green-100 px-4 py-2 rounded-lg">
            <span className="text-sm text-green-700">回合</span>
            <span className="text-xl font-bold text-green-800">
              {phase === 'idle' ? '准备' : `${currentRound}/${maxRounds}`}
            </span>
          </div>
          <div className="flex items-center gap-2 bg-blue-100 px-4 py-2 rounded-lg">
            <span className="text-sm text-blue-700">得分</span>
            <span className="text-xl font-bold text-blue-800">{score}</span>
          </div>
        </div>

        <div className="flex items-center gap-2">
          {phase === 'idle' && (
            <button
              onClick={startGame}
              className="flex items-center gap-2 bg-green-600 hover:bg-green-700 text-white px-6 py-2.5 rounded-lg font-medium transition-all transform hover:scale-105 shadow-lg"
            >
              <Play size={20} />
              开始游戏
            </button>
          )}

          {phase === 'playing' && (
            <>
              <button
                onClick={pauseGame}
                className="flex items-center gap-2 bg-yellow-500 hover:bg-yellow-600 text-white px-4 py-2.5 rounded-lg font-medium transition-all shadow-md"
              >
                <Pause size={18} />
                暂停
              </button>
              <button
                onClick={advanceRound}
                className="flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white px-4 py-2.5 rounded-lg font-medium transition-all transform hover:scale-105 shadow-lg"
              >
                <SkipForward size={18} />
                下一回合
              </button>
              <button
                onClick={endGame}
                className="flex items-center gap-2 bg-red-500 hover:bg-red-600 text-white px-4 py-2.5 rounded-lg font-medium transition-all shadow-md"
              >
                <Flag size={18} />
                结束
              </button>
            </>
          )}

          {phase === 'paused' && (
            <>
              <button
                onClick={resumeGame}
                className="flex items-center gap-2 bg-green-600 hover:bg-green-700 text-white px-4 py-2.5 rounded-lg font-medium transition-all transform hover:scale-105 shadow-lg"
              >
                <Play size={18} />
                继续
              </button>
              <button
                onClick={restartGame}
                className="flex items-center gap-2 bg-gray-500 hover:bg-gray-600 text-white px-4 py-2.5 rounded-lg font-medium transition-all shadow-md"
              >
                <RotateCcw size={18} />
                重新开始
              </button>
            </>
          )}

          {phase === 'ended' && (
            <button
              onClick={restartGame}
              className="flex items-center gap-2 bg-green-600 hover:bg-green-700 text-white px-6 py-2.5 rounded-lg font-medium transition-all transform hover:scale-105 shadow-lg"
            >
              <RotateCcw size={20} />
              再来一局
            </button>
          )}
        </div>
      </div>

      {phase !== 'idle' && (
        <div className="mt-4 pt-4 border-t border-gray-200 flex gap-6 text-sm">
          <div className="flex items-center gap-2">
            <span className="text-blue-600">💧</span>
            <span className="text-gray-600">总用水量:</span>
            <span className="font-bold text-blue-800">{totalWaterUsed} 单位</span>
          </div>
          <div className="flex items-center gap-2">
            <span className="text-orange-500">☀️</span>
            <span className="text-gray-600">总蒸发量:</span>
            <span className="font-bold text-orange-700">{totalEvaporation} 单位</span>
          </div>
          <div className="flex items-center gap-2">
            <span className="text-green-600">📊</span>
            <span className="text-gray-600">用水效率:</span>
            <span className="font-bold text-green-800">
              {totalWaterUsed > 0 ? Math.round(((totalWaterUsed - totalEvaporation) / totalWaterUsed) * 100) : 0}%
            </span>
          </div>
        </div>
      )}
    </div>
  );
};
