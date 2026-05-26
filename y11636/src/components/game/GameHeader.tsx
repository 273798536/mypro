import React from 'react';
import { Clock, Trophy, Users, Activity } from 'lucide-react';
import { formatTime } from '@/utils/helpers';
import type { GameStatus } from '@/types';

interface GameHeaderProps {
  status: GameStatus;
  elapsedTime: number;
  totalTime: number;
  score: number;
  maxScore: number;
  waitingCount: number;
  completedCount: number;
  speed: number;
  onSpeedChange: (speed: number) => void;
}

export const GameHeader: React.FC<GameHeaderProps> = ({
  status,
  elapsedTime,
  totalTime,
  score,
  maxScore,
  waitingCount,
  completedCount,
  speed,
  onSpeedChange,
}) => {
  const progress = Math.min(100, (elapsedTime / totalTime) * 100);
  const remainingTime = Math.max(0, totalTime - elapsedTime);

  const getStatusText = () => {
    switch (status) {
      case 'playing': return '进行中';
      case 'paused': return '已暂停';
      case 'ended': return '已结束';
      default: return '准备中';
    }
  };

  const getStatusColor = () => {
    switch (status) {
      case 'playing': return 'bg-green-500';
      case 'paused': return 'bg-yellow-500';
      case 'ended': return 'bg-red-500';
      default: return 'bg-gray-500';
    }
  };

  return (
    <div className="bg-white rounded-xl shadow-lg p-4">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-3">
          <Activity className="text-blue-600" size={24} />
          <h1 className="text-xl font-bold text-gray-800">急诊分诊队列赛</h1>
          <span className={`px-3 py-1 text-xs text-white rounded-full ${getStatusColor()}`}>
            {getStatusText()}
          </span>
        </div>

        <div className="flex items-center gap-4">
          <div className="flex items-center gap-2">
            <span className="text-sm text-gray-500">速度：</span>
            <select
              value={speed}
              onChange={(e) => onSpeedChange(Number(e.target.value))}
              className="px-2 py-1 text-sm border border-gray-200 rounded-lg focus:outline-none focus:border-blue-400"
            >
              <option value={0.5}>0.5x</option>
              <option value={1}>1x</option>
              <option value={2}>2x</option>
              <option value={3}>3x</option>
            </select>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-4 gap-4 mb-4">
        <div className="flex items-center gap-3 p-3 bg-blue-50 rounded-lg">
          <Clock className="text-blue-600" size={20} />
          <div>
            <p className="text-xs text-gray-500">剩余时间</p>
            <p className="text-lg font-bold text-gray-800">{formatTime(remainingTime)}</p>
          </div>
        </div>

        <div className="flex items-center gap-3 p-3 bg-yellow-50 rounded-lg">
          <Trophy className="text-yellow-600" size={20} />
          <div>
            <p className="text-xs text-gray-500">当前得分</p>
            <p className="text-lg font-bold text-gray-800">{score} / {maxScore}</p>
          </div>
        </div>

        <div className="flex items-center gap-3 p-3 bg-red-50 rounded-lg">
          <Users className="text-red-600" size={20} />
          <div>
            <p className="text-xs text-gray-500">等待中</p>
            <p className="text-lg font-bold text-gray-800">{waitingCount} 人</p>
          </div>
        </div>

        <div className="flex items-center gap-3 p-3 bg-green-50 rounded-lg">
          <Activity className="text-green-600" size={20} />
          <div>
            <p className="text-xs text-gray-500">已完成</p>
            <p className="text-lg font-bold text-gray-800">{completedCount} 人</p>
          </div>
        </div>
      </div>

      <div className="h-2 bg-gray-200 rounded-full overflow-hidden">
        <div
          className="h-full bg-gradient-to-r from-blue-500 to-blue-600 transition-all duration-300"
          style={{ width: `${progress}%` }}
        />
      </div>
    </div>
  );
};

export default GameHeader;
