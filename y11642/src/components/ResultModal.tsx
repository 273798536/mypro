import React, { useState } from 'react';
import { X, Trophy, BarChart3, FileText, RefreshCw } from 'lucide-react';
import { useGameStore } from '../store/useGameStore';
import { calculateFinalScore } from '../engine/scoring';
import { ReplayPanel } from './ReplayPanel';
import { ReportModal } from './ReportModal';

interface ResultModalProps {
  onClose: () => void;
}

export const ResultModal: React.FC<ResultModalProps> = ({ onClose }) => {
  const { state, restartGame } = useGameStore();
  const { score, plots, currentRound, anomalies, totalWaterUsed, totalEvaporation } = state;
  const [showReplay, setShowReplay] = useState(false);
  const [showReport, setShowReport] = useState(false);

  const { grade, summary } = calculateFinalScore(score, plots, currentRound);

  const getGradeColor = (grade: string) => {
    switch (grade) {
      case 'A': return 'text-green-600';
      case 'B': return 'text-blue-600';
      case 'C': return 'text-yellow-600';
      case 'D': return 'text-orange-600';
      default: return 'text-red-600';
    }
  };

  const getGradeBg = (grade: string) => {
    switch (grade) {
      case 'A': return 'from-green-400 to-green-600';
      case 'B': return 'from-blue-400 to-blue-600';
      case 'C': return 'from-yellow-400 to-yellow-600';
      case 'D': return 'from-orange-400 to-orange-600';
      default: return 'from-red-400 to-red-600';
    }
  };

  const successfulPlots = plots.filter(
    p => p.waterCurrent >= p.waterRequired * 0.8 && p.waterCurrent <= p.waterRequired * 1.2
  ).length;

  const failedPlots = plots.filter(
    p => p.waterCurrent < p.waterRequired * 0.5 || p.waterCurrent > p.waterRequired * 1.5
  ).length;

  const droughtCount = anomalies.filter(a => a.type === 'drought').length;
  const overwaterCount = anomalies.filter(a => a.type === 'overwater').length;

  if (showReplay) {
    return <ReplayPanel onBack={() => setShowReplay(false)} />;
  }

  if (showReport) {
    return <ReportModal onBack={() => setShowReport(false)} />;
  }

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl shadow-2xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
        <div className="relative">
          <div className={`bg-gradient-to-r ${getGradeBg(grade)} p-8 rounded-t-2xl text-white`}>
            <button
              onClick={onClose}
              className="absolute top-4 right-4 text-white/80 hover:text-white transition-colors"
            >
              <X size={24} />
            </button>
            
            <div className="text-center">
              <Trophy size={64} className="mx-auto mb-4 opacity-90" />
              <h2 className="text-3xl font-bold mb-2">游戏结束</h2>
              <div className={`text-7xl font-black mb-2 ${getGradeColor(grade)} drop-shadow-lg`}>
                {grade}
              </div>
              <p className="text-xl opacity-90">最终得分: {score}</p>
            </div>
          </div>
        </div>

        <div className="p-6">
          <p className="text-center text-gray-600 mb-6 text-lg">{summary}</p>

          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
            <div className="bg-blue-50 rounded-xl p-4 text-center">
              <p className="text-2xl font-bold text-blue-600">{currentRound}</p>
              <p className="text-sm text-gray-500">总回合数</p>
            </div>
            <div className="bg-green-50 rounded-xl p-4 text-center">
              <p className="text-2xl font-bold text-green-600">{successfulPlots}/{plots.length}</p>
              <p className="text-sm text-gray-500">成功地块</p>
            </div>
            <div className="bg-red-50 rounded-xl p-4 text-center">
              <p className="text-2xl font-bold text-red-600">{failedPlots}</p>
              <p className="text-sm text-gray-500">失败地块</p>
            </div>
            <div className="bg-purple-50 rounded-xl p-4 text-center">
              <p className="text-2xl font-bold text-purple-600">
                {totalWaterUsed > 0 ? Math.round(((totalWaterUsed - totalEvaporation) / totalWaterUsed) * 100) : 0}%
              </p>
              <p className="text-sm text-gray-500">用水效率</p>
            </div>
          </div>

          <div className="bg-gray-50 rounded-xl p-4 mb-6">
            <h3 className="font-bold text-gray-800 mb-3">📊 异常统计</h3>
            <div className="grid grid-cols-3 gap-4">
              <div className="text-center">
                <p className="text-xl font-bold text-red-600">{droughtCount}</p>
                <p className="text-xs text-gray-500">干旱事件</p>
              </div>
              <div className="text-center">
                <p className="text-xl font-bold text-blue-600">{overwaterCount}</p>
                <p className="text-xs text-gray-500">过度灌溉</p>
              </div>
              <div className="text-center">
                <p className="text-xl font-bold text-orange-600">{totalEvaporation}</p>
                <p className="text-xs text-gray-500">总蒸发量</p>
              </div>
            </div>
          </div>

          <div className="flex gap-3">
            <button
              onClick={() => setShowReplay(true)}
              className="flex-1 flex items-center justify-center gap-2 bg-blue-500 hover:bg-blue-600 text-white py-3 px-4 rounded-xl font-medium transition-all"
            >
              <BarChart3 size={20} />
              查看回放
            </button>
            <button
              onClick={() => setShowReport(true)}
              className="flex-1 flex items-center justify-center gap-2 bg-green-500 hover:bg-green-600 text-white py-3 px-4 rounded-xl font-medium transition-all"
            >
              <FileText size={20} />
              导出报告
            </button>
            <button
              onClick={restartGame}
              className="flex-1 flex items-center justify-center gap-2 bg-gray-600 hover:bg-gray-700 text-white py-3 px-4 rounded-xl font-medium transition-all"
            >
              <RefreshCw size={20} />
              再来一局
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
