import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { History, Trophy, Clock, AlertTriangle, Trash2, Eye, Download, ArrowLeft, CheckCircle, XCircle } from 'lucide-react';
import { useGameStore } from '../store/gameStore';
import { GameHistory } from '../types';
import { ScoringEngine } from '../engine/ScoringEngine';
import { formatTimestamp, formatTime } from '../utils/storage';

export const HistoryPage: React.FC = () => {
  const navigate = useNavigate();
  const { histories, getHistories, deleteHistory, clearHistories } = useGameStore();
  const [selectedHistory, setSelectedHistory] = useState<GameHistory | null>(null);

  useEffect(() => {
    getHistories();
  }, [getHistories]);

  const handleViewResult = (historyId: string) => {
    navigate(`/result/${historyId}`);
  };

  const handleDelete = (e: React.MouseEvent, historyId: string) => {
    e.stopPropagation();
    if (confirm('确定要删除这条记录吗？')) {
      deleteHistory(historyId);
    }
  };

  const handleClearAll = () => {
    if (confirm('确定要清空所有历史记录吗？此操作不可恢复。')) {
      clearHistories();
    }
  };

  return (
    <div className="min-h-screen bg-gray-900 text-white">
      <header className="bg-gray-800 border-b border-gray-700">
        <div className="max-w-6xl mx-auto px-6 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <button
                onClick={() => navigate('/')}
                className="p-2 hover:bg-gray-700 rounded-lg transition-colors"
              >
                <ArrowLeft size={20} />
              </button>
              <div>
                <h1 className="text-xl font-bold flex items-center gap-2">
                  <History className="text-purple-400" />
                  历史记录
                </h1>
                <p className="text-sm text-gray-400">查看所有考核记录和成绩</p>
              </div>
            </div>
            {histories.length > 0 && (
              <button
                onClick={handleClearAll}
                className="flex items-center gap-2 px-4 py-2 bg-red-600/20 hover:bg-red-600/30 text-red-400 rounded-lg transition-colors"
              >
                <Trash2 size={16} />
                清空记录
              </button>
            )}
          </div>
        </div>
      </header>

      <main className="max-w-6xl mx-auto px-6 py-8">
        {histories.length === 0 ? (
          <div className="text-center py-20">
            <History size={64} className="mx-auto mb-4 text-gray-600" />
            <h2 className="text-xl font-bold mb-2 text-gray-400">暂无历史记录</h2>
            <p className="text-gray-500 mb-6">完成一次考核后，记录将显示在这里</p>
            <button
              onClick={() => navigate('/')}
              className="px-6 py-3 bg-blue-600 hover:bg-blue-500 rounded-lg font-medium transition-colors"
            >
              开始考核
            </button>
          </div>
        ) : (
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            <div className="lg:col-span-2 space-y-4">
              {[...histories].reverse().map(history => {
                const { grade, color } = ScoringEngine.getGrade(history.finalScore, history.maxScore);
                const scorePercentage = Math.round((history.finalScore / history.maxScore) * 100);
                
                return (
                  <div
                    key={history.id}
                    className="bg-gray-800 rounded-xl p-5 border border-gray-700 hover:border-gray-500 transition-colors cursor-pointer"
                    onClick={() => handleViewResult(history.id)}
                  >
                    <div className="flex items-start justify-between">
                      <div className="flex items-center gap-4">
                        <div
                          className="w-16 h-16 rounded-xl flex items-center justify-center text-3xl font-black"
                          style={{ backgroundColor: color + '20', color }}
                        >
                          {grade}
                        </div>
                        <div>
                          <h3 className="font-bold text-lg">{history.levelName}</h3>
                          <div className="text-sm text-gray-400">
                            {formatTimestamp(history.startTime)}
                          </div>
                          <div className="flex items-center gap-4 mt-2 text-sm">
                            <span className="flex items-center gap-1 text-gray-400">
                              <Clock size={14} />
                              {formatTime(history.duration)}
                            </span>
                            <span className="flex items-center gap-1 text-gray-400">
                              <History size={14} />
                              {history.operations.length} 步
                            </span>
                            {history.riskCount === 0 ? (
                              <span className="flex items-center gap-1 text-green-400">
                                <CheckCircle size={14} />
                                零风险
                              </span>
                            ) : (
                              <span className="flex items-center gap-1 text-red-400">
                                <XCircle size={14} />
                                {history.riskCount} 项风险
                              </span>
                            )}
                          </div>
                        </div>
                      </div>
                      <div className="text-right">
                        <div className="text-2xl font-bold">{history.finalScore}</div>
                        <div className="text-sm text-gray-500">/ {history.maxScore}</div>
                        <div className="text-xs text-gray-500">{scorePercentage}%</div>
                      </div>
                    </div>
                    
                    <div className="flex items-center justify-end gap-2 mt-4 pt-4 border-t border-gray-700">
                      <button
                        onClick={(e) => handleDelete(e, history.id)}
                        className="flex items-center gap-1 px-3 py-1.5 text-sm text-red-400 hover:bg-red-900/30 rounded transition-colors"
                      >
                        <Trash2 size={14} />
                        删除
                      </button>
                      <button
                        className="flex items-center gap-1 px-3 py-1.5 text-sm text-blue-400 hover:bg-blue-900/30 rounded transition-colors"
                      >
                        <Eye size={14} />
                        查看详情
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>

            <div className="space-y-4">
              <div className="bg-gray-800 rounded-xl p-5 border border-gray-700">
                <h3 className="font-bold mb-4 flex items-center gap-2">
                  <Trophy className="text-yellow-400" />
                  统计概览
                </h3>
                <div className="space-y-4">
                  <div>
                    <div className="text-sm text-gray-400 mb-1">总考核次数</div>
                    <div className="text-3xl font-bold">{histories.length}</div>
                  </div>
                  <div>
                    <div className="text-sm text-gray-400 mb-1">最高得分</div>
                    <div className="text-3xl font-bold text-yellow-400">
                      {Math.max(...histories.map(h => h.finalScore))}
                    </div>
                  </div>
                  <div>
                    <div className="text-sm text-gray-400 mb-1">平均得分率</div>
                    <div className="text-3xl font-bold text-green-400">
                      {Math.round(
                        histories.reduce((sum, h) => sum + (h.finalScore / h.maxScore) * 100, 0) / histories.length
                      )}%
                    </div>
                  </div>
                  <div>
                    <div className="text-sm text-gray-400 mb-1">零风险完成</div>
                    <div className="text-3xl font-bold text-green-400">
                      {histories.filter(h => h.riskCount === 0).length}
                      <span className="text-sm text-gray-500 font-normal ml-1">次</span>
                    </div>
                  </div>
                </div>
              </div>

              <div className="bg-gray-800 rounded-xl p-5 border border-gray-700">
                <h3 className="font-bold mb-4 flex items-center gap-2">
                  <AlertTriangle className="text-orange-400" />
                  风险统计
                </h3>
                <div className="space-y-3">
                  <div className="flex justify-between">
                    <span className="text-gray-400">总风险数</span>
                    <span className="font-bold text-red-400">
                      {histories.reduce((sum, h) => sum + h.riskCount, 0)}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-400">严重风险</span>
                    <span className="font-bold text-red-600">
                      {histories.reduce((sum, h) => sum + h.criticalRiskCount, 0)}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-400">平均每次风险</span>
                    <span className="font-bold text-orange-400">
                      {(histories.reduce((sum, h) => sum + h.riskCount, 0) / histories.length).toFixed(1)}
                    </span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}
      </main>
    </div>
  );
};
