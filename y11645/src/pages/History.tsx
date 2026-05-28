import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { useGameStore } from '../store/useGameStore';
import { StarRating } from '../components/StarRating';
import { ERROR_MESSAGES } from '../types';
import { Home, Play, Trash2, Filter, Search, FileSpreadsheet, FileText } from 'lucide-react';

export const History: React.FC = () => {
  const { gameHistory, setPage, startReplay, exportReport, clearHistory } = useGameStore();
  const [filterLevel, setFilterLevel] = useState<number | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [showConfirmClear, setShowConfirmClear] = useState(false);

  const filteredHistory = gameHistory.filter(record => {
    const matchesLevel = filterLevel === null || record.levelId === filterLevel;
    const matchesSearch = record.levelName.toLowerCase().includes(searchTerm.toLowerCase());
    return matchesLevel && matchesSearch;
  });

  const formatDate = (timestamp: number) => {
    return new Date(timestamp).toLocaleString('zh-CN', {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  const formatDuration = (start: number, end: number) => {
    const seconds = Math.floor((end - start) / 1000);
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}分${secs}秒`;
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 via-white to-blue-50 py-8">
      <div className="max-w-7xl mx-auto px-4">
        <div className="flex items-center justify-between mb-8">
          <div className="flex items-center gap-4">
            <button
              onClick={() => setPage('home')}
              className="p-2 bg-white rounded-lg border border-gray-200 hover:bg-gray-50 transition-colors"
            >
              <Home size={20} className="text-gray-600" />
            </button>
            <div>
              <h1 className="text-3xl font-bold text-gray-800">历史记录</h1>
              <p className="text-gray-500">共 {gameHistory.length} 条记录</p>
            </div>
          </div>
          {gameHistory.length > 0 && (
            <button
              onClick={() => setShowConfirmClear(true)}
              className="flex items-center gap-2 px-4 py-2 text-red-600 hover:bg-red-50 rounded-lg transition-colors"
            >
              <Trash2 size={18} />
              清空记录
            </button>
          )}
        </div>

        <div className="bg-white rounded-2xl shadow-sm p-4 mb-6 border border-gray-100">
          <div className="flex flex-wrap gap-4 items-center">
            <div className="flex items-center gap-2">
              <Filter size={18} className="text-gray-400" />
              <span className="text-sm text-gray-600">筛选关卡:</span>
              <div className="flex gap-2">
                <button
                  onClick={() => setFilterLevel(null)}
                  className={`px-3 py-1 rounded-full text-sm transition-colors ${
                    filterLevel === null
                      ? 'bg-aviation-500 text-white'
                      : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                  }`}
                >
                  全部
                </button>
                {[1, 2, 3, 4, 5].map(level => (
                  <button
                    key={level}
                    onClick={() => setFilterLevel(level)}
                    className={`px-3 py-1 rounded-full text-sm transition-colors ${
                      filterLevel === level
                        ? 'bg-aviation-500 text-white'
                        : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                    }`}
                  >
                    关卡{level}
                  </button>
                ))}
              </div>
            </div>
            <div className="flex-1 max-w-xs">
              <div className="relative">
                <Search size={18} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                <input
                  type="text"
                  placeholder="搜索关卡名称..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="w-full pl-10 pr-4 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-aviation-500"
                />
              </div>
            </div>
          </div>
        </div>

        {filteredHistory.length === 0 ? (
          <div className="text-center py-16">
            <div className="text-gray-400 mb-4">
              <FileText size={64} className="mx-auto" />
            </div>
            <h3 className="text-xl font-medium text-gray-600 mb-2">暂无记录</h3>
            <p className="text-gray-400 mb-6">完成关卡后，记录将显示在这里</p>
            <button
              onClick={() => setPage('home')}
              className="px-6 py-2 bg-aviation-500 text-white rounded-lg hover:bg-aviation-600 transition-colors"
            >
              开始挑战
            </button>
          </div>
        ) : (
          <div className="space-y-4">
            {filteredHistory.map((record, index) => (
              <motion.div
                key={record.id}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: index * 0.05 }}
                className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden hover:shadow-md transition-shadow"
              >
                <div className="p-6">
                  <div className="flex flex-wrap items-start justify-between gap-4">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-3 mb-2">
                        <h3 className="text-lg font-bold text-gray-800">{record.levelName}</h3>
                        <StarRating rating={record.starRating} size={16} />
                        <span className="px-2 py-0.5 bg-aviation-100 text-aviation-700 text-xs rounded-full">
                          {formatDate(record.startTime)}
                        </span>
                      </div>
                      
                      <div className="grid grid-cols-2 md:grid-cols-6 gap-4 text-sm">
                        <div>
                          <div className="text-gray-500">得分</div>
                          <div className="font-mono font-bold text-aviation-600">{record.totalScore}</div>
                        </div>
                        <div>
                          <div className="text-gray-500">准确率</div>
                          <div className="font-mono font-bold text-success-600">{record.accuracy}%</div>
                        </div>
                        <div>
                          <div className="text-gray-500">正确/错误</div>
                          <div className="font-mono">
                            <span className="text-success-600">{record.correctCount}</span>
                            <span className="text-gray-400"> / </span>
                            <span className="text-red-600">{record.errorCount}</span>
                          </div>
                        </div>
                        <div>
                          <div className="text-gray-500">最大连击</div>
                          <div className="font-mono font-bold text-warning-600">{record.maxCombo}x</div>
                        </div>
                        <div>
                          <div className="text-gray-500">平均响应</div>
                          <div className="font-mono font-bold text-gray-700">{record.avgResponseTime}ms</div>
                        </div>
                        <div>
                          <div className="text-gray-500">用时</div>
                          <div className="font-mono font-bold text-gray-700">
                            {formatDuration(record.startTime, record.endTime)}
                          </div>
                        </div>
                      </div>
                    </div>

                    <div className="flex gap-2">
                      <button
                        onClick={() => startReplay(record.id)}
                        className="flex items-center gap-1 px-4 py-2 bg-aviation-500 text-white rounded-lg hover:bg-aviation-600 transition-colors text-sm"
                      >
                        <Play size={16} />
                        回放
                      </button>
                      <button
                        onClick={() => exportReport(record.id, 'xlsx')}
                        className="flex items-center gap-1 px-4 py-2 bg-green-500 text-white rounded-lg hover:bg-green-600 transition-colors text-sm"
                      >
                        <FileSpreadsheet size={16} />
                        导出
                      </button>
                    </div>
                  </div>

                  {record.errors.length > 0 && (
                    <div className="mt-4 pt-4 border-t border-gray-100">
                      <div className="text-sm font-medium text-gray-700 mb-2">主要错误:</div>
                      <div className="flex flex-wrap gap-2">
                        {record.errors.slice(0, 5).map((error, i) => (
                          <span
                            key={i}
                            className="px-2 py-1 bg-red-50 text-red-600 text-xs rounded-full"
                          >
                            {error.flightNo}: {ERROR_MESSAGES[error.errorType as keyof typeof ERROR_MESSAGES]?.title || error.errorType}
                          </span>
                        ))}
                        {record.errors.length > 5 && (
                          <span className="px-2 py-1 bg-gray-100 text-gray-500 text-xs rounded-full">
                            +{record.errors.length - 5} 更多
                          </span>
                        )}
                      </div>
                    </div>
                  )}
                </div>
              </motion.div>
            ))}
          </div>
        )}
      </div>

      {showConfirmClear && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-white rounded-2xl p-6 max-w-md w-full mx-4">
            <h3 className="text-xl font-bold text-gray-800 mb-2">确认清空</h3>
            <p className="text-gray-600 mb-6">此操作将删除所有历史记录，且无法恢复。确定要继续吗？</p>
            <div className="flex gap-3">
              <button
                onClick={() => setShowConfirmClear(false)}
                className="flex-1 py-2 border border-gray-200 rounded-lg text-gray-700 hover:bg-gray-50 transition-colors"
              >
                取消
              </button>
              <button
                onClick={() => {
                  clearHistory();
                  setShowConfirmClear(false);
                }}
                className="flex-1 py-2 bg-red-500 text-white rounded-lg hover:bg-red-600 transition-colors"
              >
                确认清空
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
