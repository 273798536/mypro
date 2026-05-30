import React from 'react';
import { useGameStore } from '@/store/gameStore';
import { Play, Pause, RotateCcw, BarChart3, Zap } from 'lucide-react';

export const StatusPanel: React.FC = () => {
  const {
    currentRate,
    displayDuration,
    totalDuration,
    totalCashflow,
    score,
    level,
    isPlaying,
    isPaused,
    durationBarDelay,
    rateEvents,
    startGame,
    pauseGame,
    resumeGame,
    initGame,
    launchBall,
    toggleReview,
  } = useGameStore();

  const maxDuration = 15;
  const durationPercent = Math.min((displayDuration / maxDuration) * 100, 100);

  const handleStartLaunch = () => {
    if (!isPlaying) {
      startGame();
    }
    launchBall();
  };

  return (
    <div className="w-72 bg-gray-900 rounded-xl p-5 text-white shadow-2xl" style={{ border: '2px solid #D4AF37' }}>
      <h2 className="text-xl font-bold mb-4 text-center" style={{ color: '#D4AF37', fontFamily: 'Playfair Display, serif' }}>
        债券久期弹球
      </h2>

      <div className="mb-4 text-center">
        <span className="text-sm text-gray-400">关卡 {level}</span>
        <div className="text-3xl font-bold mt-1" style={{ color: '#D4AF37' }}>
          {score} 分
        </div>
      </div>

      <div className="space-y-4">
        <div className="bg-gray-800 rounded-lg p-3">
          <div className="flex justify-between items-center mb-2">
            <span className="text-sm text-gray-400">当前利率</span>
            <span className={`font-bold text-lg ${currentRate > 5 ? 'text-red-400' : 'text-green-400'}`}>
              {currentRate.toFixed(2)}%
            </span>
          </div>
          {rateEvents.length > 0 && (
            <div className="text-xs text-gray-500">
              最近变动: {rateEvents[rateEvents.length - 1].rateChange > 0 ? '+' : ''}
              {rateEvents[rateEvents.length - 1].rateChange.toFixed(2)}%
              {rateEvents[rateEvents.length - 1].isConsecutiveJump && (
                <span className="ml-1 text-yellow-400">⚡连跳</span>
              )}
            </div>
          )}
        </div>

        <div className="bg-gray-800 rounded-lg p-3">
          <div className="flex justify-between items-center mb-2">
            <span className="text-sm text-gray-400">债券久期</span>
            <div className="flex items-center">
              <span className="font-bold text-lg text-blue-400">
                {durationBarDelay && displayDuration !== totalDuration ? (
                  <span className="animate-pulse">计算中...</span>
                ) : (
                  `${displayDuration.toFixed(2)}年`
                )}
              </span>
              {durationBarDelay && (
                <Zap className="w-4 h-4 ml-1 text-yellow-400 animate-pulse" />
              )}
            </div>
          </div>
          <div className="w-full h-4 bg-gray-700 rounded-full overflow-hidden">
            <div
              className="h-full transition-all duration-500 rounded-full"
              style={{
                width: `${durationPercent}%`,
                background: 'linear-gradient(90deg, #3498db, #9b59b6)',
              }}
            />
          </div>
          <div className="flex justify-between text-xs text-gray-500 mt-1">
            <span>0</span>
            <span>15年</span>
          </div>
        </div>

        <div className="bg-gray-800 rounded-lg p-3">
          <div className="flex justify-between items-center">
            <span className="text-sm text-gray-400">现金流总额</span>
            <span className="font-bold text-lg text-green-400">¥{totalCashflow}</span>
          </div>
        </div>
      </div>

      <div className="mt-6 space-y-3">
        <button
          onClick={handleStartLaunch}
          className="w-full py-3 rounded-lg font-bold transition-all hover:scale-105 active:scale-95"
          style={{
            background: 'linear-gradient(135deg, #D4AF37, #B8860B)',
            color: '#0A2463',
          }}
        >
          {isPlaying ? '发射债券球' : '开始游戏'}
        </button>

        <div className="flex gap-2">
          <button
            onClick={isPaused ? resumeGame : pauseGame}
            disabled={!isPlaying}
            className="flex-1 py-2 rounded-lg font-medium transition-all hover:bg-gray-700 disabled:opacity-50 disabled:cursor-not-allowed"
            style={{ border: '1px solid #D4AF37' }}
          >
            {isPaused ? <Play className="w-4 h-4 mx-auto" /> : <Pause className="w-4 h-4 mx-auto" />}
          </button>
          <button
            onClick={() => initGame(level)}
            className="flex-1 py-2 rounded-lg font-medium transition-all hover:bg-gray-700"
            style={{ border: '1px solid #D4AF37' }}
          >
            <RotateCcw className="w-4 h-4 mx-auto" />
          </button>
          <button
            onClick={toggleReview}
            className="flex-1 py-2 rounded-lg font-medium transition-all hover:bg-gray-700"
            style={{ border: '1px solid #D4AF37' }}
          >
            <BarChart3 className="w-4 h-4 mx-auto" />
          </button>
        </div>
      </div>

      <div className="mt-4 p-3 bg-gray-800 rounded-lg">
        <h3 className="text-sm font-medium mb-2" style={{ color: '#D4AF37' }}>操作说明</h3>
        <ul className="text-xs text-gray-400 space-y-1">
          <li>• 点击"发射债券球"开始游戏</li>
          <li>• 债券球碰撞挡板触发利率变动</li>
          <li>• 红色挡板=利率上升，绿色挡板=利率下降</li>
          <li>• 点击闪现金钱道具收集现金流</li>
          <li>• 连续碰撞同方向挡板触发利率连跳</li>
        </ul>
      </div>
    </div>
  );
};
