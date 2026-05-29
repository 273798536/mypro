import React, { useState, useMemo, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { useGameStore } from '../store/gameStore';

export const ReplayPage: React.FC = () => {
  const navigate = useNavigate();
  const { eventLog } = useGameStore();
  const [currentIndex, setCurrentIndex] = useState(0);
  const [isPlaying, setIsPlaying] = useState(false);
  const [playSpeed, setPlaySpeed] = useState(1);

  const sortedEvents = useMemo(() => 
    [...eventLog].sort((a, b) => a.timestamp - b.timestamp),
    [eventLog]
  );

  const currentEvent = sortedEvents[currentIndex];

  useEffect(() => {
    if (!isPlaying || currentIndex >= sortedEvents.length - 1) return;

    const timer = setInterval(() => {
      setCurrentIndex(prev => Math.min(prev + 1, sortedEvents.length - 1));
    }, 1000 / playSpeed);

    return () => clearInterval(timer);
  }, [isPlaying, currentIndex, sortedEvents.length, playSpeed]);

  useEffect(() => {
    if (currentIndex >= sortedEvents.length - 1) {
      setIsPlaying(false);
    }
  }, [currentIndex, sortedEvents.length]);

  const displayedEvents = sortedEvents.slice(0, currentIndex + 1);

  const getEventColor = (type: string): string => {
    if (type.includes('breakdown') || type === 'dirty_read' || type === 'timeout') {
      return 'border-tech-red bg-tech-red/10';
    }
    if (type === 'hit' || type === 'breakdown_prevented') {
      return 'border-tech-green bg-tech-green/10';
    }
    if (type === 'miss' || type === 'expired_read') {
      return 'border-tech-orange bg-tech-orange/10';
    }
    return 'border-gray-600 bg-gray-800/50';
  };

  const getEventIcon = (type: string): string => {
    if (type === 'breakdown') return '💥';
    if (type === 'breakdown_prevented') return '🛡️';
    if (type === 'dirty_read') return '💩';
    if (type === 'hit') return '✅';
    if (type === 'miss') return '❌';
    if (type === 'expired_read') return '⏰';
    if (type === 'timeout') return '⌛';
    if (type === 'write') return '✏️';
    if (type === 'delete') return '🗑️';
    return '📌';
  };

  return (
    <div className="min-h-screen bg-tech-dark p-8">
      <div className="max-w-5xl mx-auto">
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          className="text-center mb-8"
        >
          <h1 className="text-3xl font-bold text-white mb-2">🎬 复盘模式</h1>
          <p className="text-gray-400">回顾游戏过程，分析关键事件</p>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="bg-tech-blue/30 rounded-xl p-6 border border-gray-700 mb-6"
        >
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-4">
              <button
                onClick={() => setCurrentIndex(0)}
                className="p-2 bg-gray-700 rounded-lg hover:bg-gray-600 transition-colors"
                disabled={currentIndex === 0}
              >
                ⏮️
              </button>
              <button
                onClick={() => setCurrentIndex(Math.max(0, currentIndex - 1))}
                className="p-2 bg-gray-700 rounded-lg hover:bg-gray-600 transition-colors"
                disabled={currentIndex === 0}
              >
                ◀️
              </button>
              <button
                onClick={() => setIsPlaying(!isPlaying)}
                className="p-3 bg-tech-cyan text-tech-dark rounded-xl hover:bg-tech-cyan/80 transition-colors font-bold"
              >
                {isPlaying ? '⏸️' : '▶️'}
              </button>
              <button
                onClick={() => setCurrentIndex(Math.min(sortedEvents.length - 1, currentIndex + 1))}
                className="p-2 bg-gray-700 rounded-lg hover:bg-gray-600 transition-colors"
                disabled={currentIndex === sortedEvents.length - 1}
              >
                ▶️
              </button>
              <button
                onClick={() => setCurrentIndex(sortedEvents.length - 1)}
                className="p-2 bg-gray-700 rounded-lg hover:bg-gray-600 transition-colors"
                disabled={currentIndex === sortedEvents.length - 1}
              >
                ⏭️
              </button>
            </div>

            <div className="flex items-center gap-2">
              <span className="text-gray-400 text-sm">速度:</span>
              {[0.5, 1, 2, 4].map((speed) => (
                <button
                  key={speed}
                  onClick={() => setPlaySpeed(speed)}
                  className={`px-2 py-1 rounded text-sm ${
                    playSpeed === speed
                      ? 'bg-tech-cyan text-tech-dark'
                      : 'bg-gray-700 text-gray-300 hover:bg-gray-600'
                  }`}
                >
                  {speed}x
                </button>
              ))}
            </div>

            <div className="text-sm text-gray-400">
              {currentIndex + 1} / {sortedEvents.length}
            </div>
          </div>

          <div className="relative">
            <input
              type="range"
              min="0"
              max={sortedEvents.length - 1}
              value={currentIndex}
              onChange={(e) => setCurrentIndex(Number(e.target.value))}
              className="w-full h-2 bg-gray-700 rounded-full appearance-none cursor-pointer"
              style={{
                background: `linear-gradient(to right, #06B6D4 0%, #06B6D4 ${(currentIndex / (sortedEvents.length - 1)) * 100}%, #374151 ${(currentIndex / (sortedEvents.length - 1)) * 100}%, #374151 100%)`
              }}
            />
            <div className="flex justify-between mt-2 text-xs text-gray-500">
              <span>开始</span>
              <span>结束</span>
            </div>
          </div>
        </motion.div>

        {currentEvent && (
          <motion.div
            key={currentEvent.id}
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            className={`p-6 rounded-xl border-2 mb-6 ${getEventColor(currentEvent.type)}`}
          >
            <div className="flex items-start gap-4">
              <span className="text-4xl">{getEventIcon(currentEvent.type)}</span>
              <div className="flex-1">
                <div className="flex items-center gap-3 mb-2">
                  <span className="text-gray-500 text-sm">
                    {new Date(currentEvent.timestamp).toLocaleTimeString('zh-CN', { hour12: false })}
                  </span>
                  <span className={`font-bold text-lg ${
                    currentEvent.scoreChange > 0 ? 'text-tech-green' : 
                    currentEvent.scoreChange < 0 ? 'text-tech-red' : 'text-gray-400'
                  }`}>
                    {currentEvent.scoreChange > 0 ? '+' : ''}{currentEvent.scoreChange}
                  </span>
                </div>
                <div className="text-xl font-bold text-white mb-2">
                  {currentEvent.message}
                </div>
                {currentEvent.key && (
                  <div className="font-mono text-sm text-gray-400">
                    Key: {currentEvent.key}
                  </div>
                )}
                {currentEvent.details && Object.keys(currentEvent.details).length > 0 && (
                  <div className="mt-3 p-3 bg-black/20 rounded-lg">
                    <div className="text-xs text-gray-500 mb-1">详细信息:</div>
                    <pre className="text-xs text-gray-400 font-mono">
                      {JSON.stringify(currentEvent.details, null, 2)}
                    </pre>
                  </div>
                )}
              </div>
            </div>
          </motion.div>
        )}

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
          className="bg-tech-blue/30 rounded-xl p-6 border border-gray-700 mb-6"
        >
          <h3 className="text-lg font-bold text-white mb-4 flex items-center gap-2">
            <span>📜</span> 事件时间线
          </h3>
          <div className="max-h-96 overflow-y-auto space-y-2 pr-2">
            {displayedEvents.map((event, index) => (
              <motion.div
                key={event.id}
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                className={`p-3 rounded-lg border-l-4 cursor-pointer transition-all ${
                  index === currentIndex
                    ? 'border-tech-cyan bg-tech-cyan/10'
                    : getEventColor(event.type)
                } ${index === currentIndex ? 'ring-1 ring-tech-cyan' : ''}`}
                onClick={() => setCurrentIndex(index)}
              >
                <div className="flex items-center gap-3">
                  <span>{getEventIcon(event.type)}</span>
                  <span className="text-xs text-gray-500 min-w-[60px]">
                    {new Date(event.timestamp).toLocaleTimeString('zh-CN', { hour12: false })}
                  </span>
                  <span className="flex-1 text-sm text-white">{event.message}</span>
                  <span className={`text-xs font-mono min-w-[40px] text-right ${
                    event.scoreChange > 0 ? 'text-tech-green' : 
                    event.scoreChange < 0 ? 'text-tech-red' : 'text-gray-500'
                  }`}>
                    {event.scoreChange !== 0 && (event.scoreChange > 0 ? '+' : '') + event.scoreChange}
                  </span>
                </div>
              </motion.div>
            ))}
          </div>
        </motion.div>

        <div className="flex justify-center">
          <button
            onClick={() => navigate('/result')}
            className="px-8 py-3 bg-gray-700 text-white rounded-xl font-bold hover:bg-gray-600 transition-all flex items-center gap-2"
          >
            ← 返回结算页
          </button>
        </div>
      </div>
    </div>
  );
};
