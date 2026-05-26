import React, { useState, useEffect } from 'react';
import { Play, Pause, RotateCcw, CheckCircle, Clock, Trophy, Trash2, Eye, Send } from 'lucide-react';
import { formatTime } from '../../utils/storage';

interface ControlPanelProps {
  currentScore: number;
  maxScore: number;
  timeRemaining: number;
  isPaused: boolean;
  canComplete: boolean;
  onPause: () => void;
  onResume: () => void;
  onReset: () => void;
  onComplete: () => void;
  onViewHistory: () => void;
}

export const ControlPanel: React.FC<ControlPanelProps> = ({
  currentScore,
  maxScore,
  timeRemaining,
  isPaused,
  canComplete,
  onPause,
  onResume,
  onReset,
  onComplete,
  onViewHistory
}) => {
  const scorePercentage = Math.min(100, (currentScore / maxScore) * 100);
  
  const getScoreColor = () => {
    if (scorePercentage >= 80) return 'text-green-400';
    if (scorePercentage >= 60) return 'text-yellow-400';
    if (scorePercentage >= 40) return 'text-orange-400';
    return 'text-red-400';
  };

  return (
    <div className="bg-gray-900 rounded-xl p-4 border border-gray-700 space-y-4">
      <div className="grid grid-cols-2 gap-4">
        <div className="bg-gray-800 rounded-lg p-3">
          <div className="flex items-center gap-2 text-sm text-gray-400 mb-1">
            <Trophy size={14} />
            <span>当前得分</span>
          </div>
          <div className={`text-2xl font-bold ${getScoreColor()}`}>
            {currentScore}
          </div>
          <div className="text-xs text-gray-500">
            满分 {maxScore}
          </div>
          <div className="mt-2 h-2 bg-gray-700 rounded-full overflow-hidden">
            <div 
              className={`h-full transition-all duration-300 ${
                scorePercentage >= 80 ? 'bg-green-500' :
                scorePercentage >= 60 ? 'bg-yellow-500' :
                scorePercentage >= 40 ? 'bg-orange-500' : 'bg-red-500'
              }`}
              style={{ width: `${scorePercentage}%` }}
            />
          </div>
        </div>

        <div className="bg-gray-800 rounded-lg p-3">
          <div className="flex items-center gap-2 text-sm text-gray-400 mb-1">
            <Clock size={14} />
            <span>剩余时间</span>
          </div>
          <div className={`text-2xl font-bold ${
            timeRemaining < 60 ? 'text-red-400 animate-pulse' : 
            timeRemaining < 120 ? 'text-orange-400' : 'text-white'
          }`}>
            {formatTime(timeRemaining)}
          </div>
          <div className="text-xs text-gray-500">
            {timeRemaining < 60 ? '时间紧迫！' : timeRemaining < 120 ? '注意时间' : '时间充裕'}
          </div>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-3">
        <button
          onClick={isPaused ? onResume : onPause}
          className={`flex items-center justify-center gap-2 py-2 px-4 rounded-lg font-medium transition-colors ${
            isPaused 
              ? 'bg-green-600 hover:bg-green-500 text-white' 
              : 'bg-yellow-600 hover:bg-yellow-500 text-white'
          }`}
        >
          {isPaused ? <Play size={16} /> : <Pause size={16} />}
          {isPaused ? '继续' : '暂停'}
        </button>

        <button
          onClick={onReset}
          className="flex items-center justify-center gap-2 py-2 px-4 rounded-lg font-medium bg-gray-700 hover:bg-gray-600 text-white transition-colors"
        >
          <RotateCcw size={16} />
          重置
        </button>
      </div>

      <div className="grid grid-cols-2 gap-3">
        <button
          onClick={onComplete}
          disabled={!canComplete}
          className={`flex items-center justify-center gap-2 py-2 px-4 rounded-lg font-medium transition-colors ${
            canComplete
              ? 'bg-blue-600 hover:bg-blue-500 text-white'
              : 'bg-gray-700 text-gray-500 cursor-not-allowed'
          }`}
        >
          <CheckCircle size={16} />
          提交完成
        </button>

        <button
          onClick={onViewHistory}
          className="flex items-center justify-center gap-2 py-2 px-4 rounded-lg font-medium bg-gray-700 hover:bg-gray-600 text-white transition-colors"
        >
          <Eye size={16} />
          历史记录
        </button>
      </div>

      <div className="text-xs text-gray-500 text-center">
        {canComplete 
          ? '✓ 已摆放足够的化学品，可以提交' 
          : '请继续摆放化学品以完成考核'}
      </div>
    </div>
  );
};
