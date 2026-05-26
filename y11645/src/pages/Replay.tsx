import React, { useState, useEffect, useRef } from 'react';
import { motion } from 'framer-motion';
import { useGameStore } from '../store/useGameStore';
import { EXIT_LABELS, ERROR_MESSAGES } from '../types';
import { Home, Play, Pause, SkipBack, SkipForward, AlertTriangle, CheckCircle } from 'lucide-react';

export const Replay: React.FC = () => {
  const { replayData, replayActions, setPage, updateReplayTime } = useGameStore();
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const animationRef = useRef<number | null>(null);
  const lastTimeRef = useRef<number>(0);

  useEffect(() => {
    if (!replayData) return;

    const duration = replayData.endTime - replayData.startTime;

    const animate = (timestamp: number) => {
      if (!lastTimeRef.current) lastTimeRef.current = timestamp;
      const delta = timestamp - lastTimeRef.current;
      lastTimeRef.current = timestamp;

      if (isPlaying) {
        setCurrentTime(prev => {
          const next = Math.min(prev + delta, duration);
          updateReplayTime(next);
          if (next >= duration) {
            setIsPlaying(false);
          }
          return next;
        });
      }

      animationRef.current = requestAnimationFrame(animate);
    };

    animationRef.current = requestAnimationFrame(animate);

    return () => {
      if (animationRef.current) {
        cancelAnimationFrame(animationRef.current);
      }
    };
  }, [isPlaying, replayData, updateReplayTime]);

  if (!replayData) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <p className="text-gray-500 mb-4">未找到回放数据</p>
          <button
            onClick={() => setPage('history')}
            className="px-6 py-2 bg-aviation-500 text-white rounded-lg"
          >
            返回历史记录
          </button>
        </div>
      </div>
    );
  }

  const duration = replayData.endTime - replayData.startTime;
  const progress = (currentTime / duration) * 100;
  const errorsAtCurrentTime = replayData.errors.filter(
    e => e.timestamp - replayData.startTime <= currentTime
  );

  const formatTime = (ms: number) => {
    const seconds = Math.floor(ms / 1000);
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  const jumpToTime = (time: number) => {
    setCurrentTime(time);
    updateReplayTime(time);
  };

  const jumpToError = (index: number) => {
    const error = replayData.errors[index];
    if (error) {
      const errorTime = error.timestamp - replayData.startTime - 2000;
      jumpToTime(Math.max(0, errorTime));
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-900 via-gray-800 to-gray-900 text-white">
      <div className="max-w-6xl mx-auto px-4 py-6">
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-4">
            <button
              onClick={() => setPage('history')}
              className="p-2 bg-white/10 rounded-lg hover:bg-white/20 transition-colors"
            >
              <Home size={20} />
            </button>
            <div>
              <h1 className="text-2xl font-bold">回放: {replayData.levelName}</h1>
              <p className="text-gray-400 text-sm">
                {new Date(replayData.startTime).toLocaleString('zh-CN')}
              </p>
            </div>
          </div>
          <div className="text-right">
            <div className="text-3xl font-mono font-bold text-aviation-400">{replayData.totalScore}</div>
            <div className="text-sm text-gray-400">总分</div>
          </div>
        </div>

        <div className="bg-gray-800 rounded-2xl p-6 mb-6">
          <div className="grid grid-cols-4 gap-4 mb-6 text-center">
            <div>
              <div className="text-2xl font-bold text-success-400">{replayData.accuracy}%</div>
              <div className="text-xs text-gray-400">准确率</div>
            </div>
            <div>
              <div className="text-2xl font-bold text-green-400">{replayData.correctCount}</div>
              <div className="text-xs text-gray-400">正确</div>
            </div>
            <div>
              <div className="text-2xl font-bold text-red-400">{replayData.errorCount}</div>
              <div className="text-xs text-gray-400">错误</div>
            </div>
            <div>
              <div className="text-2xl font-bold text-warning-400">{replayData.maxCombo}x</div>
              <div className="text-xs text-gray-400">最大连击</div>
            </div>
          </div>

          <div className="bg-gray-900 rounded-xl p-4 mb-4 h-64 overflow-y-auto">
            <div className="space-y-2">
              {replayActions.map((action, index) => (
                <motion.div
                  key={index}
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  className={`flex items-center gap-3 p-2 rounded-lg ${
                    action.errorType === 'none' 
                      ? 'bg-green-900/30 border border-green-700/50' 
                      : 'bg-red-900/30 border border-red-700/50'
                  }`}
                >
                  {action.errorType === 'none' ? (
                    <CheckCircle size={16} className="text-green-400 flex-shrink-0" />
                  ) : (
                    <AlertTriangle size={16} className="text-red-400 flex-shrink-0" />
                  )}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="font-mono text-sm">{action.flightNo}</span>
                      <span className="text-xs text-gray-400">
                        → {EXIT_LABELS[action.selectedExit]}
                      </span>
                      {action.errorType !== 'none' && (
                        <span className="text-xs text-red-400">
                          (正确: {EXIT_LABELS[action.correctExit]})
                        </span>
                      )}
                    </div>
                    {action.errorType !== 'none' && (
                      <div className="text-xs text-red-400 mt-0.5">
                        {ERROR_MESSAGES[action.errorType as keyof typeof ERROR_MESSAGES]?.title}
                      </div>
                    )}
                  </div>
                  <div className={`font-mono text-sm ${
                    action.scoreChange > 0 ? 'text-green-400' : 'text-red-400'
                  }`}>
                    {action.scoreChange > 0 ? '+' : ''}{action.scoreChange}
                  </div>
                </motion.div>
              ))}
              {replayActions.length === 0 && (
                <div className="text-center text-gray-500 py-8">
                  点击播放开始回放
                </div>
              )}
            </div>
          </div>

          <div className="mb-4">
            <input
              type="range"
              min={0}
              max={duration}
              value={currentTime}
              onChange={(e) => jumpToTime(Number(e.target.value))}
              className="w-full h-2 bg-gray-700 rounded-lg appearance-none cursor-pointer"
            />
            <div className="flex justify-between text-xs text-gray-400 mt-1">
              <span>{formatTime(currentTime)}</span>
              <span>{formatTime(duration)}</span>
            </div>
          </div>

          <div className="flex justify-center gap-4">
            <button
              onClick={() => jumpToTime(0)}
              className="p-3 bg-gray-700 rounded-full hover:bg-gray-600 transition-colors"
            >
              <SkipBack size={20} />
            </button>
            <button
              onClick={() => setIsPlaying(!isPlaying)}
              className="p-4 bg-aviation-500 rounded-full hover:bg-aviation-600 transition-colors"
            >
              {isPlaying ? <Pause size={24} /> : <Play size={24} />}
            </button>
            <button
              onClick={() => jumpToTime(duration)}
              className="p-3 bg-gray-700 rounded-full hover:bg-gray-600 transition-colors"
            >
              <SkipForward size={20} />
            </button>
          </div>
        </div>

        {replayData.errors.length > 0 && (
          <div className="bg-gray-800 rounded-2xl p-6">
            <h3 className="text-lg font-bold mb-4 flex items-center gap-2">
              <AlertTriangle size={20} className="text-warning-400" />
              错误时间点 ({replayData.errors.length})
            </h3>
            <div className="flex flex-wrap gap-2">
              {replayData.errors.map((error, index) => (
                <button
                  key={index}
                  onClick={() => jumpToError(index)}
                  className="px-3 py-2 bg-red-900/50 border border-red-700 rounded-lg text-sm hover:bg-red-900/70 transition-colors"
                >
                  <div className="font-mono">{error.flightNo}</div>
                  <div className="text-xs text-gray-400">
                    {formatTime(error.timestamp - replayData.startTime)}
                  </div>
                </button>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
