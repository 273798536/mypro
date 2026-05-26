import React from 'react';
import { Trophy, Zap, XCircle, CheckCircle } from 'lucide-react';

interface ScoreBoardProps {
  score: number;
  combo: number;
  maxCombo: number;
  correctCount: number;
  errorCount: number;
  totalCards: number;
  className?: string;
}

export const ScoreBoard: React.FC<ScoreBoardProps> = ({
  score,
  combo,
  maxCombo,
  correctCount,
  errorCount,
  totalCards,
  className = '',
}) => {
  return (
    <div className={`grid grid-cols-2 gap-4 md:grid-cols-3 ${className}`}>
      <div className="rounded-xl bg-gradient-to-br from-yellow-50 to-orange-50 p-4 shadow-md">
        <div className="flex items-center gap-2 text-sm text-gray-500">
          <Trophy size={16} className="text-yellow-500" />
          得分
        </div>
        <div className="mt-1 text-2xl font-bold text-gray-800">{score}</div>
      </div>

      <div className="rounded-xl bg-gradient-to-br from-blue-50 to-indigo-50 p-4 shadow-md">
        <div className="flex items-center gap-2 text-sm text-gray-500">
          <Zap size={16} className="text-blue-500" />
          连击
        </div>
        <div className="mt-1 text-2xl font-bold text-gray-800">
          {combo}
          {maxCombo > 0 && <span className="text-sm text-gray-400"> / 最高 {maxCombo}</span>}
        </div>
      </div>

      <div className="rounded-xl bg-gradient-to-br from-green-50 to-emerald-50 p-4 shadow-md">
        <div className="flex items-center gap-2 text-sm text-gray-500">
          <CheckCircle size={16} className="text-green-500" />
          正确
        </div>
        <div className="mt-1 text-2xl font-bold text-gray-800">
          {correctCount}
          <span className="text-sm text-gray-400"> / {totalCards}</span>
        </div>
      </div>

      <div className="rounded-xl bg-gradient-to-br from-red-50 to-rose-50 p-4 shadow-md">
        <div className="flex items-center gap-2 text-sm text-gray-500">
          <XCircle size={16} className="text-red-500" />
          错误
        </div>
        <div className="mt-1 text-2xl font-bold text-gray-800">{errorCount}</div>
      </div>

      <div className="col-span-2 rounded-xl bg-gradient-to-br from-gray-50 to-slate-50 p-4 shadow-md md:col-span-1">
        <div className="text-sm text-gray-500">进度</div>
        <div className="mt-2 h-2 overflow-hidden rounded-full bg-gray-200">
          <div
            className="h-full rounded-full bg-gradient-to-r from-blue-500 to-indigo-500 transition-all duration-300"
            style={{ width: `${((correctCount + errorCount) / totalCards) * 100}%` }}
          />
        </div>
        <div className="mt-1 text-right text-xs text-gray-400">
          {correctCount + errorCount} / {totalCards}
        </div>
      </div>
    </div>
  );
};
