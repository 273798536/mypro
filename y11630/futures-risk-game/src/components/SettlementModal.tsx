import React, { useState } from 'react';
import { Trophy, Download, RotateCcw, X, Target, CheckCircle, XCircle, Clock, TrendingUp } from 'lucide-react';
import { useGameEngine } from '../hooks/useGameEngine';
import { motion, AnimatePresence } from 'framer-motion';
import { exportToJSON, exportToCSV, generateScoreBreakdown } from '../utils/exporter';
import { getFailureAnalysis } from '../utils/replay';
import { ReplayPanel } from './ReplayPanel';

interface SettlementModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const SettlementModal: React.FC<SettlementModalProps> = ({ isOpen, onClose }) => {
  const { state, restartGame } = useGameEngine();
  const [activeTab, setActiveTab] = useState<'score' | 'replay'>('score');

  const scoreBreakdown = generateScoreBreakdown(
    state.operationLogs,
    state.liquidationRecords,
    state.totalRounds,
    state.currentRound,
    state.totalScore
  );

  const failureAnalysis = getFailureAnalysis(state);

  const getRatingColor = (rating: string) => {
    switch (rating) {
      case 'S': return 'text-yellow-500';
      case 'A': return 'text-green-500';
      case 'B': return 'text-blue-500';
      case 'C': return 'text-orange-500';
      default: return 'text-red-500';
    }
  };

  const getRatingBg = (rating: string) => {
    switch (rating) {
      case 'S': return 'from-yellow-400 to-yellow-600';
      case 'A': return 'from-green-400 to-green-600';
      case 'B': return 'from-blue-400 to-blue-600';
      case 'C': return 'from-orange-400 to-orange-600';
      default: return 'from-red-400 to-red-600';
    }
  };

  const handleExportJSON = () => {
    exportToJSON(state, scoreBreakdown);
  };

  const handleExportCSV = () => {
    exportToCSV(state, scoreBreakdown);
  };

  const handleRestart = () => {
    restartGame();
    onClose();
  };

  if (!isOpen) return null;

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4"
        onClick={onClose}
      >
        <motion.div
          initial={{ scale: 0.9, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          exit={{ scale: 0.9, opacity: 0 }}
          onClick={(e) => e.stopPropagation()}
          className="bg-white rounded-2xl shadow-2xl w-full max-w-4xl max-h-[90vh] overflow-hidden"
        >
          <div className={`bg-gradient-to-r ${getRatingBg(scoreBreakdown.rating)} p-6 text-white`}>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-4">
                <div className="w-16 h-16 bg-white/20 rounded-2xl flex items-center justify-center">
                  <Trophy className="w-8 h-8" />
                </div>
                <div>
                  <h2 className="text-2xl font-bold">游戏结算</h2>
                  <p className="text-white/80">
                    已完成 {state.currentRound} / {state.totalRounds} 回合
                  </p>
                </div>
              </div>
              <button
                onClick={onClose}
                className="w-10 h-10 bg-white/20 hover:bg-white/30 rounded-full flex items-center justify-center transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
          </div>

          <div className="flex border-b border-gray-200">
            <button
              onClick={() => setActiveTab('score')}
              className={`flex-1 px-6 py-3 font-medium transition-colors ${
                activeTab === 'score'
                  ? 'text-primary-600 border-b-2 border-primary-600'
                  : 'text-gray-500 hover:text-gray-700'
              }`}
            >
              <div className="flex items-center justify-center gap-2">
                <Target className="w-4 h-4" />
                成绩详情
              </div>
            </button>
            <button
              onClick={() => setActiveTab('replay')}
              className={`flex-1 px-6 py-3 font-medium transition-colors ${
                activeTab === 'replay'
                  ? 'text-primary-600 border-b-2 border-primary-600'
                  : 'text-gray-500 hover:text-gray-700'
              }`}
            >
              <div className="flex items-center justify-center gap-2">
                <Clock className="w-4 h-4" />
                复盘记录
              </div>
            </button>
          </div>

          <div className="p-6 overflow-y-auto max-h-[60vh]">
            {activeTab === 'score' ? (
              <div className="space-y-6">
                <div className="text-center py-6">
                  <div className={`text-8xl font-bold ${getRatingColor(scoreBreakdown.rating)}`}>
                    {scoreBreakdown.rating}
                  </div>
                  <div className="text-3xl font-bold text-gray-800 mt-2">
                    {scoreBreakdown.totalScore} 分
                  </div>
                  <div className="text-gray-500 mt-1">
                    正确率: {scoreBreakdown.accuracy.toFixed(1)}%
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="bg-green-50 border border-green-200 rounded-xl p-4">
                    <div className="flex items-center gap-2 text-green-700 mb-2">
                      <CheckCircle className="w-5 h-5" />
                      <span className="font-medium">正确操作</span>
                    </div>
                    <div className="text-3xl font-bold text-green-700">
                      {scoreBreakdown.correctOperations}
                    </div>
                  </div>
                  <div className="bg-red-50 border border-red-200 rounded-xl p-4">
                    <div className="flex items-center gap-2 text-red-700 mb-2">
                      <XCircle className="w-5 h-5" />
                      <span className="font-medium">错误操作</span>
                    </div>
                    <div className="text-3xl font-bold text-red-700">
                      {scoreBreakdown.wrongOperations}
                    </div>
                  </div>
                  <div className="bg-yellow-50 border border-yellow-200 rounded-xl p-4">
                    <div className="flex items-center gap-2 text-yellow-700 mb-2">
                      <Clock className="w-5 h-5" />
                      <span className="font-medium">超时次数</span>
                    </div>
                    <div className="text-3xl font-bold text-yellow-700">
                      {scoreBreakdown.timeouts}
                    </div>
                  </div>
                  <div className="bg-blue-50 border border-blue-200 rounded-xl p-4">
                    <div className="flex items-center gap-2 text-blue-700 mb-2">
                      <TrendingUp className="w-5 h-5" />
                      <span className="font-medium">存活回合</span>
                    </div>
                    <div className="text-3xl font-bold text-blue-700">
                      {scoreBreakdown.roundsSurvived}
                    </div>
                  </div>
                </div>

                {failureAnalysis.length > 0 && (
                  <div className="bg-orange-50 border border-orange-200 rounded-xl p-4">
                    <h4 className="font-semibold text-orange-800 mb-3">改进建议</h4>
                    <ul className="space-y-2">
                      {failureAnalysis.map((item, index) => (
                        <li key={index} className="flex items-start gap-2 text-sm text-orange-700">
                          <span className="text-orange-500 mt-0.5">•</span>
                          <span>{item}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                )}
              </div>
            ) : (
              <ReplayPanel />
            )}
          </div>

          <div className="border-t border-gray-200 p-4 bg-gray-50 flex justify-between items-center">
            <div className="flex gap-2">
              <button
                onClick={handleExportJSON}
                className="flex items-center gap-2 px-4 py-2 bg-gray-200 hover:bg-gray-300 text-gray-700 rounded-lg font-medium transition-colors"
              >
                <Download className="w-4 h-4" />
                导出 JSON
              </button>
              <button
                onClick={handleExportCSV}
                className="flex items-center gap-2 px-4 py-2 bg-gray-200 hover:bg-gray-300 text-gray-700 rounded-lg font-medium transition-colors"
              >
                <Download className="w-4 h-4" />
                导出 CSV
              </button>
            </div>
            <button
              onClick={handleRestart}
              className="flex items-center gap-2 px-6 py-2 bg-primary-600 hover:bg-primary-700 text-white rounded-lg font-medium transition-colors"
            >
              <RotateCcw className="w-4 h-4" />
              再玩一局
            </button>
          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
};
