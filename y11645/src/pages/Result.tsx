import React from 'react';
import { motion } from 'framer-motion';
import { useGameStore } from '../store/useGameStore';
import { StarRating } from '../components/StarRating';
import { generateImprovementSuggestions } from '../utils/export';
import { EXIT_LABELS, ERROR_MESSAGES } from '../types';
import { Home, RotateCcw, Play, Download, FileText, TrendingUp, Clock, Target, Zap, AlertTriangle } from 'lucide-react';

export const Result: React.FC = () => {
  const {
    currentRecordId,
    gameHistory,
    currentLevel,
    setPage,
    startGame,
    startReplay,
    exportReport,
  } = useGameStore();

  const record = gameHistory.find(r => r.id === currentRecordId);

  if (!record) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <p className="text-gray-500 mb-4">未找到游戏记录</p>
          <button
            onClick={() => setPage('home')}
            className="px-6 py-2 bg-aviation-500 text-white rounded-lg"
          >
            返回首页
          </button>
        </div>
      </div>
    );
  }

  const suggestions = generateImprovementSuggestions(record);
  const errorTypeCounts = record.errors.reduce((acc, err) => {
    acc[err.errorType] = (acc[err.errorType] || 0) + 1;
    return acc;
  }, {} as Record<string, number>);

  return (
    <div className="min-h-screen bg-gradient-to-br from-aviation-50 via-white to-blue-50 py-8">
      <div className="max-w-4xl mx-auto px-4">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="text-center mb-8"
        >
          <h1 className="text-4xl font-bold text-gray-800 mb-2">关卡完成！</h1>
          <p className="text-gray-600">{record.levelName}</p>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ delay: 0.2 }}
          className="bg-white rounded-3xl shadow-xl p-8 mb-6 text-center border border-gray-100"
        >
          <div className="mb-6">
            <StarRating rating={record.starRating} size={48} />
          </div>
          
          <div className="text-6xl font-bold text-aviation-600 font-mono mb-2">
            {record.totalScore}
          </div>
          <div className="text-gray-500 mb-6">总分</div>

          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div className="bg-aviation-50 rounded-xl p-4">
              <Target className="mx-auto text-aviation-500 mb-2" size={24} />
              <div className="text-2xl font-bold text-aviation-600">{record.accuracy}%</div>
              <div className="text-xs text-gray-500">准确率</div>
            </div>
            <div className="bg-green-50 rounded-xl p-4">
              <TrendingUp className="mx-auto text-green-500 mb-2" size={24} />
              <div className="text-2xl font-bold text-green-600">{record.correctCount}</div>
              <div className="text-xs text-gray-500">正确数</div>
            </div>
            <div className="bg-warning-50 rounded-xl p-4">
              <Zap className="mx-auto text-warning-500 mb-2" size={24} />
              <div className="text-2xl font-bold text-warning-600">{record.maxCombo}x</div>
              <div className="text-xs text-gray-500">最大连击</div>
            </div>
            <div className="bg-blue-50 rounded-xl p-4">
              <Clock className="mx-auto text-blue-500 mb-2" size={24} />
              <div className="text-2xl font-bold text-blue-600">{record.avgResponseTime}ms</div>
              <div className="text-xs text-gray-500">平均响应</div>
            </div>
          </div>
        </motion.div>

        {record.errors.length > 0 && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.3 }}
            className="bg-white rounded-2xl shadow-lg p-6 mb-6 border border-gray-100"
          >
            <h3 className="text-lg font-bold text-gray-800 mb-4 flex items-center gap-2">
              <AlertTriangle size={20} className="text-warning-500" />
              错误统计
            </h3>
            <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
              {Object.entries(errorTypeCounts).map(([type, count]) => {
                const errorInfo = ERROR_MESSAGES[type as keyof typeof ERROR_MESSAGES];
                return (
                  <div key={type} className="bg-warning-50 rounded-lg p-3">
                    <div className="text-2xl font-bold text-warning-600">{count}</div>
                    <div className="text-xs text-gray-600">{errorInfo?.title || type}</div>
                  </div>
                );
              })}
            </div>
          </motion.div>
        )}

        {suggestions.length > 0 && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.4 }}
            className="bg-white rounded-2xl shadow-lg p-6 mb-6 border border-gray-100"
          >
            <h3 className="text-lg font-bold text-gray-800 mb-4">改进建议</h3>
            <ul className="space-y-2">
              {suggestions.map((suggestion, index) => (
                <li key={index} className="flex items-start gap-2 text-sm text-gray-600">
                  <span className="text-aviation-500 font-bold">•</span>
                  {suggestion}
                </li>
              ))}
            </ul>
          </motion.div>
        )}

        {record.errors.length > 0 && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.5 }}
            className="bg-white rounded-2xl shadow-lg p-6 mb-6 border border-gray-100"
          >
            <h3 className="text-lg font-bold text-gray-800 mb-4">错误详情</h3>
            <div className="space-y-3 max-h-64 overflow-y-auto">
              {record.errors.map((error, index) => (
                <div
                  key={index}
                  className="bg-red-50 border border-red-100 rounded-lg p-4 flex justify-between items-center"
                >
                  <div>
                    <div className="font-mono font-medium text-gray-800">{error.flightNo}</div>
                    <div className="text-xs text-gray-500">
                      {new Date(error.timestamp).toLocaleTimeString('zh-CN')}
                    </div>
                  </div>
                  <div className="text-right">
                    <div className="text-xs text-gray-500">
                      {EXIT_LABELS[error.selectedExit]} → {EXIT_LABELS[error.correctExit]}
                    </div>
                    <div className="text-red-600 font-bold text-sm">{error.scoreChange}分</div>
                  </div>
                </div>
              ))}
            </div>
          </motion.div>
        )}

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.6 }}
          className="flex flex-wrap gap-3 justify-center"
        >
          <button
            onClick={() => setPage('home')}
            className="flex items-center gap-2 px-6 py-3 bg-white border border-gray-200 rounded-xl text-gray-700 hover:bg-gray-50 transition-colors"
          >
            <Home size={18} />
            返回首页
          </button>
          <button
            onClick={() => currentLevel && startGame(currentLevel.id)}
            className="flex items-center gap-2 px-6 py-3 bg-warning-500 text-white rounded-xl hover:bg-warning-600 transition-colors"
          >
            <RotateCcw size={18} />
            重新挑战
          </button>
          <button
            onClick={() => startReplay(record.id)}
            className="flex items-center gap-2 px-6 py-3 bg-aviation-500 text-white rounded-xl hover:bg-aviation-600 transition-colors"
          >
            <Play size={18} />
            查看回放
          </button>
          <button
            onClick={() => exportReport(record.id, 'xlsx')}
            className="flex items-center gap-2 px-6 py-3 bg-green-500 text-white rounded-xl hover:bg-green-600 transition-colors"
          >
            <Download size={18} />
            导出报告
          </button>
        </motion.div>
      </div>
    </div>
  );
};
