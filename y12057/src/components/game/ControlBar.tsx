import React from 'react';
import { motion } from 'framer-motion';
import { Play, Pause, RotateCcw, FastForward, SkipForward } from 'lucide-react';
import type { GameStatus } from '../../engine/types';

interface ControlBarProps {
  status: GameStatus;
  speed: number;
  onStart: () => void;
  onPause: () => void;
  onResume: () => void;
  onRestart: () => void;
  onEnd: () => void;
  onSpeedChange: (speed: number) => void;
}

export const ControlBar: React.FC<ControlBarProps> = ({
  status,
  speed,
  onStart,
  onPause,
  onResume,
  onRestart,
  onEnd,
  onSpeedChange
}) => {
  const speeds = [1, 2, 4];

  return (
    <div className="bg-slate-800/90 rounded-lg p-4 backdrop-blur-sm border border-slate-700">
      <div className="flex items-center justify-between gap-4">
        <div className="flex items-center gap-2">
          {status === 'deploying' && (
            <motion.button
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              onClick={onStart}
              className="flex items-center gap-2 px-6 py-2 bg-green-600 hover:bg-green-500 text-white rounded-lg font-bold transition-colors"
            >
              <Play className="w-5 h-5" />
              开始模拟
            </motion.button>
          )}

          {status === 'running' && (
            <motion.button
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              onClick={onPause}
              className="flex items-center gap-2 px-4 py-2 bg-yellow-600 hover:bg-yellow-500 text-white rounded-lg font-bold transition-colors"
            >
              <Pause className="w-5 h-5" />
              暂停
            </motion.button>
          )}

          {status === 'paused' && (
            <motion.button
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              onClick={onResume}
              className="flex items-center gap-2 px-4 py-2 bg-green-600 hover:bg-green-500 text-white rounded-lg font-bold transition-colors"
            >
              <Play className="w-5 h-5" />
              继续
            </motion.button>
          )}

          <motion.button
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            onClick={onRestart}
            className="flex items-center gap-2 px-4 py-2 bg-slate-600 hover:bg-slate-500 text-white rounded-lg font-bold transition-colors"
          >
            <RotateCcw className="w-5 h-5" />
            重开
          </motion.button>

          {status !== 'deploying' && status !== 'finished' && (
            <motion.button
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              onClick={onEnd}
              className="flex items-center gap-2 px-4 py-2 bg-red-600 hover:bg-red-500 text-white rounded-lg font-bold transition-colors"
            >
              <SkipForward className="w-5 h-5" />
              结束
            </motion.button>
          )}
        </div>

        <div className="flex items-center gap-2">
          <span className="text-slate-400 text-sm">速度:</span>
          <div className="flex bg-slate-900/50 rounded-lg p-1">
            {speeds.map(s => (
              <motion.button
                key={s}
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                onClick={() => onSpeedChange(s)}
                className={`flex items-center gap-1 px-3 py-1 rounded text-sm font-bold transition-colors ${
                  speed === s
                    ? 'bg-blue-600 text-white'
                    : 'text-slate-400 hover:text-white'
                }`}
              >
                <FastForward className="w-3 h-3" />
                {s}x
              </motion.button>
            ))}
          </div>
        </div>

        <div className="flex items-center gap-2">
          <span className="text-slate-400 text-sm">状态:</span>
          <span className={`px-3 py-1 rounded text-sm font-bold ${
            status === 'deploying' ? 'bg-blue-900/50 text-blue-400' :
            status === 'running' ? 'bg-green-900/50 text-green-400' :
            status === 'paused' ? 'bg-yellow-900/50 text-yellow-400' :
            'bg-gray-900/50 text-gray-400'
          }`}>
            {status === 'deploying' ? '部署阶段' :
             status === 'running' ? '运行中' :
             status === 'paused' ? '已暂停' :
             status === 'finished' ? '已结束' : '空闲'}
          </span>
        </div>
      </div>
    </div>
  );
};
